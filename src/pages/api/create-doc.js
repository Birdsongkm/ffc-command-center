/**
 * POST /api/create-doc
 * Creates a new Google Doc in Drive via multipart upload.
 * Body: title (required), content (required), folderId (optional).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

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
