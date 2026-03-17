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
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const { action, messageId } = req.body;

  if (!messageId || !action) return res.status(400).json({ error: 'Missing messageId or action' });

  const gmailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;

  try {
    if (action === 'archive') {
      // Archive = remove INBOX label
      const r = await fetch(gmailUrl, {
        method: 'POST', headers: h,
        body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
      });
      const data = await r.json();
      return res.json({ success: !data.error, data });
    }

    if (action === 'markRead') {
      const r = await fetch(gmailUrl, {
        method: 'POST', headers: h,
        body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
      });
      const data = await r.json();
      return res.json({ success: !data.error, data });
    }

    if (action === 'markUnread') {
      const r = await fetch(gmailUrl, {
        method: 'POST', headers: h,
        body: JSON.stringify({ addLabelIds: ['UNREAD'] }),
      });
      const data = await r.json();
      return res.json({ success: !data.error, data });
    }

    if (action === 'trash') {
      const r = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
        { method: 'POST', headers: h }
      );
      const data = await r.json();
      return res.json({ success: !data.error, data });
    }

    if (action === 'star') {
      const r = await fetch(gmailUrl, {
        method: 'POST', headers: h,
        body: JSON.stringify({ addLabelIds: ['STARRED'] }),
      });
      const data = await r.json();
      return res.json({ success: !data.error, data });
    }

    if (action === 'unstar') {
      const r = await fetch(gmailUrl, {
        method: 'POST', headers: h,
        body: JSON.stringify({ removeLabelIds: ['STARRED'] }),
      });
      const data = await r.json();
      return res.json({ success: !data.error, data });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
