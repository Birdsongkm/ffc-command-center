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
    if (t.error) return res.status(400).send(t.error_description || t.error);

    const o = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000';
    const cookies = [
      `ffc_at=${t.access_token}; ${o}`,
      `ffc_exp=${Date.now() + t.expires_in * 1000}; ${o}`,
    ];
    if (t.refresh_token) cookies.push(`ffc_rt=${t.refresh_token}; ${o}`);
    res.setHeader('Set-Cookie', cookies);
    res.redirect('/');
  } catch (e) {
    res.status(500).send('Authentication failed: ' + e.message);
  }
}
