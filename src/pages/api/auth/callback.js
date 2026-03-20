const ALLOWED_EMAIL = 'kayla@freshfoodconnect.org';

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.APP_URL}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const t = await r.json();
    if (t.error) {
      console.error('auth:callback', { error: t.error, description: t.error_description });
      return res.status(400).send(t.error_description || t.error);
    }

    // Verify the authenticated Google account is the allowed email
    const userinfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${t.access_token}` },
    }).then(r => r.json());

    if (!userinfo.email || userinfo.email.toLowerCase() !== ALLOWED_EMAIL) {
      console.error('auth:callback', { reason: 'unauthorized email', email: userinfo.email });
      return res.status(403).send(`Access denied. This app is restricted to ${ALLOWED_EMAIL}.`);
    }

    const o = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000';
    const cookies = [
      `ffc_at=${t.access_token}; ${o}`,
      `ffc_exp=${Date.now() + t.expires_in * 1000}; ${o}`,
    ];
    if (t.refresh_token) cookies.push(`ffc_rt=${t.refresh_token}; ${o}`);
    res.setHeader('Set-Cookie', cookies);
    res.redirect('/');
  } catch (e) {
    console.error('auth:callback', { message: e.message });
    res.status(500).send('Authentication failed: ' + e.message);
  }
}
