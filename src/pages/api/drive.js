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
  const fields = 'files(id,name,mimeType,modifiedTime,webViewLink,iconLink,owners,starred)';

  try {
    let driveUrl;

    if (action === 'search' && q) {
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
