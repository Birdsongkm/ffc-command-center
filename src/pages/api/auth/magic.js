const ALLOWED_EMAIL = 'kayla@freshfoodconnect.org';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { email } = req.body;
  if (!email || email.toLowerCase().trim() !== ALLOWED_EMAIL) {
    console.error('auth:magic', { reason: 'unauthorized email', email });
    return res.status(403).json({ error: 'Access restricted to authorized users only.' });
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.APP_URL}/api/auth/callback`,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    login_hint: email.trim(),
  });

  // Return JSON so the client can navigate — res.redirect() causes a cross-origin
  // fetch CORS failure when the browser tries to follow the redirect to Google.
  return res.status(200).json({ redirectUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
}
