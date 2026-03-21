/**
 * POST /api/create-doc
 * Creates a new Google Doc in Drive via multipart upload.
 * Body: title (required), content (required), folderId (optional).
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { title, content, folderId } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Missing title or content' });

  try {
    const metadata = {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
    };
    if (folderId) metadata.parents = [folderId];

    const boundary = 'ffc_boundary_' + Date.now();
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      content,
      `--${boundary}--`,
    ].join('\r\n');

    const r = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('create-doc:upload', { status: r.status, message: err.error?.message });
      return res.status(502).json({ error: err.error?.message || 'Drive upload failed' });
    }

    const file = await r.json();
    return res.status(200).json({ id: file.id, name: file.name, url: file.webViewLink });
  } catch (error) {
    console.error('create-doc:error', { message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
