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

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  let token = cookies.ffc_at;
  const exp = parseInt(cookies.ffc_exp || '0');
  const rt = cookies.ffc_rt;

  if (!token) return res.json({ authenticated: false });

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
      } else {
        return res.json({ authenticated: false });
      }
    } catch (e) {
      return res.json({ authenticated: false });
    }
  }

  const h = { Authorization: `Bearer ${token}` };

  try {
    const now = new Date();
    const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const eod = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const [eRes, cRes] = await Promise.all([
      fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=is:inbox', { headers: h }),
      fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${sod}&timeMax=${eod}&singleEvents=true&orderBy=startTime`, { headers: h }),
    ]);

    const eData = await eRes.json();
    const cData = await cRes.json();

    let emails = [];
    if (eData.messages) {
      const details = await Promise.all(
        eData.messages.slice(0, 15).map(m =>
          fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers: h }).then(r => r.json())
        )
      );
      emails = details.map(d => {
        const g = name => (d.payload?.headers || []).find(h => h.name === name)?.value || '';
        return {
          id: d.id,
          from: g('From'),
          subject: g('Subject'),
          date: g('Date'),
          snippet: d.snippet,
          unread: (d.labelIds || []).includes('UNREAD'),
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
    }));

    res.json({ authenticated: true, emails, events });
  } catch (e) {
    res.json({ authenticated: false, error: e.message });
  }
}
