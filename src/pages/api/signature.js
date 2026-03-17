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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = await getToken(req, res);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch signature' });
    }

    const data = await response.json();
    const primary = data.sendAs?.find(s => s.isPrimary);

    if (!primary) {
      return res.status(200).json({ signature: '' });
    }

    return res.status(200).json({ signature: primary.signature || '' });
  } catch (error) {
    console.error('Error fetching signature:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
