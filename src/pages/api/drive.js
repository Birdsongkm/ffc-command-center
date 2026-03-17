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

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  let token = cookies.ffc_at;
  const exp = parseInt(cookies.ffc_exp || '0');
  const rt = cookies.ffc_rt;

  if (!token) return res.json({ authenticated: false });

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
        return res.json({ authenticated: false });
      }
    } catch (e) {
      return res.json({ authenticated: false });
    }
  }

  const h = { Authorization: `Bearer ${token}` };
  const { q, action } = req.query;

  try {
    if (action === 'search' && q) {
      // Search Drive files
      const query = encodeURIComponent(`name contains '${q.replace(/'/g, "\\'")}'`);
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink,owners,starred)&orderBy=modifiedTime desc&pageSize=20`,
        { headers: h }
      );
      const data = await r.json();
      return res.json({ authenticated: true, files: data.files || [] });
    }

    if (action === 'recent') {
      // Recent files
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files?orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink,owners,starred)&pageSize=20&q=trashed=false`,
        { headers: h }
      );
      const data = await r.json();
      return res.json({ authenticated: true, files: data.files || [] });
    }

    if (action === 'starred') {
      // Starred/important files
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=starred=true and trashed=false&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink,owners,starred)&orderBy=modifiedTime desc&pageSize=20`,
        { headers: h }
      );
      const data = await r.json();
      return res.json({ authenticated: true, files: data.files || [] });
    }

    // Default: recent files
    const r = await fetch(
      `https://www.googleapis.com/drive/v3/files?orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink,owners,starred)&pageSize=20&q=trashed=false`,
      { headers: h }
    );
    const data = await r.json();
    res.json({ authenticated: true, files: data.files || [] });
  } catch (e) {
    res.json({ authenticated: false, error: e.message });
  }
}
