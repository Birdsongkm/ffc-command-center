/**
 * POST /api/drive-note
 * Finds a staff member's 1:1 Google Doc in Drive and prepends a dated note.
 * Body: personName (required), note (required).
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
    const refreshed = await refreshToken(rt);
    if (!refreshed.access_token) return null;
    token = refreshed.access_token;
    const newExp = Date.now() + (refreshed.expires_in || 3600) * 1000;
    res.setHeader('Set-Cookie', [
      `ffc_at=${token}; HttpOnly; Secure; SameSite=Lax; Path=/`,
      `ffc_exp=${newExp}; HttpOnly; Secure; SameSite=Lax; Path=/`,
    ]);
  }
  return token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { personName, note } = req.body;
  if (!personName || !note) return res.status(400).json({ error: 'Missing personName or note' });

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const firstName = personName.split(' ')[0];

  try {
    // Search Drive for 1:1 doc
    const query = encodeURIComponent(`name contains "1:1 ${firstName}" and mimeType='application/vnd.google-apps.document' and trashed=false`);
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=5`,
      { headers: h }
    );
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      const msg = err.error?.message || err.message || 'Drive search failed';
      console.error('drive-note:search', { firstName, status: searchRes.status, message: msg });
      return res.status(502).json({ error: msg });
    }
    const searchData = await searchRes.json();
    const file = searchData.files?.[0];
    if (!file) return res.status(404).json({ error: `No 1:1 doc found for "${firstName}" — make sure a Google Doc named "1:1 ${firstName}" exists in your Drive` });

    // Prepend note at top of document (after title, index 1)
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const insertText = `Next meeting (${dateStr}):\n• ${note}\n\n`;

    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${file.id}:batchUpdate`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        requests: [{
          insertText: {
            location: { index: 1 },
            text: insertText,
          },
        }],
      }),
    });
    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      const msg = err.error?.message || err.message || 'Failed to update document';
      console.error('drive-note:append', { fileId: file.id, docName: file.name, status: updateRes.status, message: msg });
      return res.status(502).json({ error: msg });
    }

    return res.status(200).json({ ok: true, docName: file.name, docId: file.id });
  } catch (error) {
    console.error('drive-note:error', { personName, message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
