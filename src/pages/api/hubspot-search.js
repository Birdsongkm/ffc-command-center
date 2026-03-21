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
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const hsToken = process.env.HUBSPOT_TOKEN;
  if (!hsToken) {
    console.error('hubspot-search:config', { reason: 'HUBSPOT_TOKEN not set' });
    return res.status(500).json({ error: 'HubSpot not configured — set HUBSPOT_TOKEN' });
  }

  const q = req.query.q || '';
  if (!q.trim()) return res.status(200).json({ contacts: [] });

  try {
    const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hsToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [
          { filters: [{ propertyName: 'firstname', operator: 'CONTAINS_TOKEN', value: q }] },
          { filters: [{ propertyName: 'lastname', operator: 'CONTAINS_TOKEN', value: q }] },
          { filters: [{ propertyName: 'email', operator: 'CONTAINS_TOKEN', value: q }] },
        ],
        properties: ['firstname', 'lastname', 'email', 'company'],
        limit: 10,
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('hubspot-search:api', { status: r.status, message: err.message });
      return res.status(502).json({ error: err.message || 'HubSpot search failed' });
    }

    const data = await r.json();
    const contacts = (data.results || []).map(c => ({
      id: c.id,
      label: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ')
        + (c.properties.email ? ` <${c.properties.email}>` : '')
        + (c.properties.company ? ` · ${c.properties.company}` : ''),
    }));

    return res.status(200).json({ contacts });
  } catch (error) {
    console.error('hubspot-search:error', { q, message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
