/**
 * GET /api/chat-messages
 * Returns recent Google Chat messages from all spaces the user is in.
 * Architecture: extensible — any provider (Slack, Teams) can add a parallel route
 * following the same response shape: { messages: Message[] }
 * where Message = { name, createTime, text, sender: { displayName, name }, spaceName }
 *
 * Requires scope: https://www.googleapis.com/auth/chat.messages.readonly
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
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const h = { Authorization: `Bearer ${token}` };

    // List all spaces the user is a member of
    const spacesRes = await fetch(
      'https://chat.googleapis.com/v1/spaces?pageSize=20&filter=spaceType%3DROOM%20OR%20spaceType%3DDIRECT_MESSAGE',
      { headers: h }
    );
    if (!spacesRes.ok) {
      const e = await spacesRes.json();
      console.error('chat-messages:listSpaces', { status: spacesRes.status, message: e.error?.message });
      return res.status(spacesRes.status).json({ error: e.error?.message || 'Failed to list Chat spaces' });
    }

    const spacesData = await spacesRes.json();
    const spaces = spacesData.spaces || [];

    if (spaces.length === 0) return res.status(200).json({ messages: [] });

    // Fetch the 5 most recent messages from each space in parallel
    const messageArrays = await Promise.all(
      spaces.map(async space => {
        try {
          const msgRes = await fetch(
            `https://chat.googleapis.com/v1/${space.name}/messages?orderBy=createTime+desc&pageSize=5`,
            { headers: h }
          );
          if (!msgRes.ok) return [];
          const msgData = await msgRes.json();
          return (msgData.messages || []).map(m => ({
            ...m,
            spaceName: space.displayName || space.name,
          }));
        } catch (e) {
          console.error('chat-messages:fetchMessages', { space: space.name, message: e.message });
          return [];
        }
      })
    );

    return res.status(200).json({ messages: messageArrays.flat() });
  } catch (error) {
    console.error('chat-messages:handler', { message: error.message });
    return res.status(500).json({ error: error.message || 'Failed to fetch chat messages' });
  }
}
