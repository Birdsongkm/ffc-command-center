/**
 * Shared auth utilities for all API routes.
 * Copy of the auth pattern — do not inline these in individual routes.
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
      } else {
        console.error('auth:refresh', { reason: 'no access_token in response' });
        return null;
      }
    } catch (e) {
      console.error('auth:refresh', { message: e.message });
      return null;
    }
  }
  return token;
}

module.exports = { parseCookies, refreshToken, getToken };
