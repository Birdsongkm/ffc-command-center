/**
 * GET /api/data
 * Primary data endpoint: fetches unread inbox emails (50/page) and today's + upcoming
 * calendar events (including deadline events within 90 days) in parallel.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
function parseCookies(req) {
  const c = {};
  (req.headers.cookie || '').split(';').forEach(s => {
    const [k, ...v] = s.trim().split('=');
    if (k) c[k] = v.join('=');
  });
  return c;
}

async function refreshToken(rt) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: rt,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  return r.json();
}

async function getToken(req, res) {
  const cookies = parseCookies(req);
  let token = cookies.ffc_at;
  const exp = parseInt(cookies.ffc_exp || '0');
  const rt = cookies.ffc_rt;
  if (!token) return null;
  if (Date.now() > exp && rt) {
    try {
      const n = await refreshToken(rt);
      if (n.access_token) {
        token = n.access_token;
        const o = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000';
        res.setHeader('Set-Cookie', [
          `ffc_at=${token}; ${o}`,
          `ffc_exp=${Date.now() + n.expires_in * 1000}; ${o}`,
        ]);
      } else { return null; }
    } catch (e) { return null; }
  }
  return token;
}

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) return res.json({ authenticated: false });

  const h = { Authorization: `Bearer ${token}` };
  const page = req.query.page || '';

  try {
    const now = new Date();
    const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const eod = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const in90days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90).toISOString();

    // Fetch emails - 50 at a time with pagination (only unread)
    let emailUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=is:inbox%20is:unread';
    if (page) emailUrl += `&pageToken=${page}`;

    const [eRes, cRes, dRes] = await Promise.all([
      fetch(emailUrl, { headers: h }),
      fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${sod}&timeMax=${eod}&singleEvents=true&orderBy=startTime`, { headers: h }),
      fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${sod}&timeMax=${in90days}&singleEvents=true&orderBy=startTime`, { headers: h }),
    ]);

    const eData = await eRes.json();
    const cData = await cRes.json();
    const dData = await dRes.json();

    let emails = [];
    if (eData.messages) {
      const details = await Promise.all(
        eData.messages.map(m =>
          fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Reply-To&metadataHeaders=Message-ID&metadataHeaders=List-Unsubscribe&metadataHeaders=Bcc&metadataHeaders=Delivered-To&metadataHeaders=X-Mailer&metadataHeaders=Precedence&metadataHeaders=List-Id`, { headers: h }).then(r => r.json())
        )
      );
      emails = details.map(d => {
        const g = name => (d.payload?.headers || []).find(h => h.name === name)?.value || '';
        const toStr = g('To');
        const ccStr = g('Cc');
        const toAddrs = toStr.split(',').map(e => e.trim()).filter(Boolean);
        const ccAddrs = ccStr.split(',').map(e => e.trim()).filter(Boolean);
        const recipientCount = new Set([...toAddrs, ...ccAddrs]).size;
        return {
          id: d.id,
          threadId: d.threadId,
          from: g('From'),
          to: toStr,
          cc: ccStr,
          bcc: g('Bcc'),
          deliveredTo: g('Delivered-To'),
          replyTo: g('Reply-To'),
          messageId: g('Message-ID'),
          listUnsubscribe: g('List-Unsubscribe'),
          xMailer: g('X-Mailer'),
          precedence: g('Precedence'),
          listId: g('List-Id'),
          subject: g('Subject'),
          date: g('Date'),
          snippet: d.snippet,
          unread: (d.labelIds || []).includes('UNREAD'),
          labels: d.labelIds || [],
          recipientCount,
        };
      });
    }

    const events = (cData.items || []).map(e => ({
      id: e.id,
      title: e.summary || '(No title)',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location || '',
      description: e.description || '',
      attendees: (e.attendees || []).map(a => ({ email: a.email, name: a.displayName || '', status: a.responseStatus || '' })),
      hangoutLink: e.hangoutLink || '',
      htmlLink: e.htmlLink || '',
    }));

    const DEADLINE_KEYWORDS = ['deadline', 'due', 'due date'];
    const deadlineEvents = (dData.items || [])
      .filter(e => {
        const isAllDay = e.start?.date && !e.start?.dateTime;
        const title = (e.summary || '').toLowerCase();
        return isAllDay && DEADLINE_KEYWORDS.some(k => title.includes(k));
      })
      .map(e => ({
        id: `cal-${e.id}`,
        name: e.summary,
        deadline: e.start.date,
        source: 'calendar',
      }));

    res.json({
      authenticated: true,
      emails,
      events,
      deadlineEvents,
      nextPage: eData.nextPageToken || null,
      totalEmails: eData.resultSizeEstimate || emails.length,
    });
  } catch (e) {
    res.json({ authenticated: false, error: e.message });
  }
}
