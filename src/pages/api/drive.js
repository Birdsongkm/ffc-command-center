/**
 * GET /api/drive
 * Lists Google Drive files. Actions (query param): search (by name), starred, or recent (default).
 * Returns up to 20 files ordered by modified time descending.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) return res.json({ authenticated: false });

  const h = { Authorization: `Bearer ${token}` };
  const { q, action } = req.query;
  const fields = 'files(id,name,mimeType,modifiedTime,webViewLink,iconLink,owners,starred)';

  try {
    let driveUrl;

    if (action === 'browse') {
      const parentId = q || 'root';
      const browseQ = encodeURIComponent(`'${parentId}' in parents and trashed=false`);
      driveUrl = `https://www.googleapis.com/drive/v3/files?q=${browseQ}&fields=${fields}&orderBy=folder,modifiedTime desc&pageSize=50`;
    } else if (action === 'folders') {
      const folderQ = q
        ? encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name contains '${q.replace(/'/g, "\\'")}' and trashed=false`)
        : encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and trashed=false`);
      driveUrl = `https://www.googleapis.com/drive/v3/files?q=${folderQ}&fields=files(id,name)&orderBy=modifiedTime desc&pageSize=20`;
    } else if (action === 'search' && q) {
      const searchQ = encodeURIComponent(`name contains '${q.replace(/'/g, "\\'")}'`);
      driveUrl = `https://www.googleapis.com/drive/v3/files?q=${searchQ}&fields=${fields}&orderBy=modifiedTime desc&pageSize=20`;
    } else if (action === 'starred') {
      const starQ = encodeURIComponent('starred = true and trashed = false');
      driveUrl = `https://www.googleapis.com/drive/v3/files?q=${starQ}&fields=${fields}&orderBy=modifiedTime desc&pageSize=20`;
    } else {
      // Recent files (default)
      const recentQ = encodeURIComponent('trashed = false');
      driveUrl = `https://www.googleapis.com/drive/v3/files?q=${recentQ}&fields=${fields}&orderBy=modifiedTime desc&pageSize=20`;
    }

    const r = await fetch(driveUrl, { headers: h });
    const data = await r.json();

    if (data.error) {
      return res.json({ authenticated: true, files: [], error: data.error.message || data.error });
    }

    res.json({ authenticated: true, files: data.files || [] });
  } catch (e) {
    res.json({ authenticated: false, error: e.message });
  }
}
