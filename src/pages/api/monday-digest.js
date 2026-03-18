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

function getWeekMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(today.setDate(diff));
}

async function fetchWeekCalendarEvents(token) {
  try {
    const monday = getWeekMonday();
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    friday.setHours(23, 59, 59);

    const timeMin = monday.toISOString();
    const timeMax = friday.toISOString();

    const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) return [];
    const data = await resp.json();

    return (data.items || []).map(item => ({
      title: item.summary || '(no title)',
      date: item.start.dateTime || item.start.date || 'Unknown',
      location: item.location || '',
      attendees: (item.attendees || []).map(a => a.email),
    }));
  } catch (e) {
    return [];
  }
}

async function fetchUnreadCount(token) {
  try {
    const resp = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) return 0;
    const data = await resp.json();
    return data.resultSizeEstimate || 0;
  } catch (e) {
    return 0;
  }
}

async function fetchNeedsResponseEmails(token) {
  try {
    const query = encodeURIComponent('label:needs-response OR label:action-needed OR label:awaiting-response');
    const resp = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=5`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.messages) return [];

    const emails = [];
    for (const msg of data.messages.slice(0, 5)) {
      const msgResp = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!msgResp.ok) continue;
      const msgData = await msgResp.json();
      const headers = msgData.payload.headers;
      emails.push({
        from: headers.find(h => h.name === 'From')?.value || 'Unknown',
        subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
        date: headers.find(h => h.name === 'Date')?.value || 'Unknown',
      });
    }
    return emails;
  } catch (e) {
    return [];
  }
}

async function fetchFinanceAlerts(token) {
  try {
    const query = encodeURIComponent('from:(debbie OR nash OR accounting@)');
    const resp = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=5`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.messages) return [];

    const emails = [];
    for (const msg of data.messages.slice(0, 5)) {
      const msgResp = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!msgResp.ok) continue;
      const msgData = await msgResp.json();
      const headers = msgData.payload.headers;
      emails.push({
        from: headers.find(h => h.name === 'From')?.value || 'Unknown',
        subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
        date: headers.find(h => h.name === 'Date')?.value || 'Unknown',
      });
    }
    return emails;
  } catch (e) {
    return [];
  }
}

function buildDigestText(unreadCount, needsResponseEmails, weekEvents, financeAlerts) {
  let text = '';

  if (unreadCount > 0) {
    text += `You have ${unreadCount} unread email${unreadCount !== 1 ? 's' : ''}. `;
  }

  if (needsResponseEmails.length > 0) {
    text += `${needsResponseEmails.length} need${needsResponseEmails.length !== 1 ? '' : 's'} your reply. `;
  }

  if (weekEvents.length > 0) {
    text += `${weekEvents.length} meeting${weekEvents.length !== 1 ? 's' : ''} this week. `;
  }

  if (financeAlerts.length > 0) {
    const latestAlert = financeAlerts[0];
    text += `${latestAlert.from.split('<')[0].trim()} sent: "${latestAlert.subject}".`;
  }

  return text.trim();
}

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [weekEvents, unreadCount, needsResponse, financeAlerts] = await Promise.all([
      fetchWeekCalendarEvents(token),
      fetchUnreadCount(token),
      fetchNeedsResponseEmails(token),
      fetchFinanceAlerts(token),
    ]);

    const digest = buildDigestText(unreadCount, needsResponse, weekEvents, financeAlerts);

    return res.status(200).json({
      weekEvents,
      unreadCount,
      needsResponse,
      financeAlerts,
      digest,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
