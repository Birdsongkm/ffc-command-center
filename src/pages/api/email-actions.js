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

// Process a single action on one message
async function doAction(token, messageId, action) {
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const gmailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;

  if (action === 'archive') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ removeLabelIds: ['INBOX'] }) });
    return r.json();
  }
  if (action === 'markRead') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ removeLabelIds: ['UNREAD'] }) });
    return r.json();
  }
  if (action === 'markUnread') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ addLabelIds: ['UNREAD'] }) });
    return r.json();
  }
  if (action === 'trash') {
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, { method: 'POST', headers: h });
    return r.json();
  }
  if (action === 'star') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ addLabelIds: ['STARRED'] }) });
    return r.json();
  }
  if (action === 'unstar') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ removeLabelIds: ['STARRED'] }) });
    return r.json();
  }
  return { error: 'Unknown action' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { action, messageId, messageIds } = req.body;

  if (!action) return res.status(400).json({ error: 'Missing action' });

  try {
    // Batch mode: process multiple messages
    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      // Use Gmail batch modify for supported actions (much faster)
      const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      if (action === 'archive') {
        const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify', {
          method: 'POST', headers: h,
          body: JSON.stringify({ ids: messageIds, removeLabelIds: ['INBOX'] }),
        });
        if (r.status === 204 || r.status === 200) return res.json({ success: true, count: messageIds.length });
        const data = await r.json();
        return res.json({ success: false, error: data.error?.message || 'Batch archive failed' });
      }

      if (action === 'markRead') {
        const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify', {
          method: 'POST', headers: h,
          body: JSON.stringify({ ids: messageIds, removeLabelIds: ['UNREAD'] }),
        });
        if (r.status === 204 || r.status === 200) return res.json({ success: true, count: messageIds.length });
        const data = await r.json();
        return res.json({ success: false, error: data.error?.message || 'Batch mark read failed' });
      }

      if (action === 'trash') {
        // No batch trash endpoint, do them in parallel
        const results = await Promise.all(messageIds.map(id => doAction(token, id, 'trash')));
        return res.json({ success: true, count: messageIds.length });
      }

      // Fallback: process individually in parallel
      const results = await Promise.all(messageIds.map(id => doAction(token, id, action)));
      return res.json({ success: true, count: messageIds.length });
    }

    // Single message mode
    if (!messageId) return res.status(400).json({ error: 'Missing messageId or messageIds' });

    const data = await doAction(token, messageId, action);
    res.json({ success: !data.error, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
