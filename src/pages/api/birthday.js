/**
 * GET  /api/birthday
 *   Finds upcoming birthdays (next 14 days) across all calendars,
 *   and fetches recipients from the most recent "happy birthday" sent email.
 *
 * POST /api/birthday
 *   Body: { to, cc, subject, body }
 *   Sends the birthday email directly.
 *
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

// "John Smith's birthday" → "John Smith"
// "Birthday - John Smith" → "John Smith"
function extractBirthdayName(summary) {
  return (summary || '')
    .replace(/[\u0027\u2018\u2019`]s?\s*birthday\s*$/i, '')
    .replace(/^birthday\s*[-–:]\s*/i, '')
    .trim();
}

async function handleGet(token) {
  const h = { Authorization: `Bearer ${token}` };
  const now = new Date();
  // Use start of today so all-day events (like birthdays) aren't excluded mid-day
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in14 = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);
  const timeMin = todayStart.toISOString();
  const timeMax = in14.toISOString();

  // 1. Get all calendars — query every one, since the Birthdays calendar ID varies
  const calListRes = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50',
    { headers: h }
  );
  const calList = calListRes.ok ? await calListRes.json() : { items: [] };
  const allCals = (calList.items || []);

  // 2. Query every calendar for events in the window; filter by title unless it's a birthday calendar
  const birthdays = [];
  const seenIds = new Set();

  for (const cal of allCals) {
    try {
      const evRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=50`,
        { headers: h }
      );
      if (!evRes.ok) continue;
      const evData = await evRes.json();
      const isBirthdayCal = (cal.summary || '').toLowerCase().includes('birthday') ||
        (cal.id || '').toLowerCase().includes('birthday') ||
        (cal.id || '').includes('contacts@group.v.calendar.google.com');
      for (const ev of (evData.items || [])) {
        if (seenIds.has(ev.id)) continue;
        const title = ev.summary || '';
        if (!isBirthdayCal && !title.toLowerCase().includes('birthday')) continue;
        seenIds.add(ev.id);
        birthdays.push({
          id: ev.id,
          summary: title,
          date: ev.start?.date || ev.start?.dateTime?.slice(0, 10),
          name: extractBirthdayName(title),
        });
      }
    } catch (e) {
      console.error('birthday:fetchCal', { calId: cal.id, message: e.message });
    }
  }

  // 2. Find most recent happy birthday sent email for the recipient list
  const searchRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent('in:sent subject:"happy birthday"')}&maxResults=1`,
    { headers: h }
  );

  let recipients = { to: '', cc: '' };
  let pastSubject = '';

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    const msgId = searchData.messages?.[0]?.id;
    if (msgId) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject`,
        { headers: h }
      );
      if (msgRes.ok) {
        const msg = await msgRes.json();
        const getH = name => (msg.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
        recipients = { to: getH('To'), cc: getH('Cc') };
        pastSubject = getH('Subject');
      }
    }
  }

  return { birthdays, recipients, pastSubject };
}

async function handlePost(token, { to, cc, subject, body }) {
  const { buildRawEmail } = require('../../lib/email');
  const raw = buildRawEmail({ to, cc, subject, body });

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('birthday:send', { status: res.status, message: err.error?.message });
    throw new Error(err.error?.message || 'Failed to send birthday email');
  }
  const data = await res.json();
  return { success: true, messageId: data.id };
}

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await handleGet(token));
    }
    if (req.method === 'POST') {
      const { to, cc, subject, body } = req.body;
      if (!to || !subject || !body) return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
      return res.status(200).json(await handlePost(token, { to, cc, subject, body }));
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('birthday:handler', { method: req.method, message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

