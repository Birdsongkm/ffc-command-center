/**
 * POST /api/hubspot-note
 * Creates a HubSpot engagement note, optionally associated with a contact or meeting.
 * Body: note (required), contactId (optional), meetingId (optional).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, HUBSPOT_TOKEN
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

  const hsToken = process.env.HUBSPOT_TOKEN;
  if (!hsToken) {
    console.error('hubspot-note:config', { reason: 'HUBSPOT_TOKEN not set' });
    return res.status(500).json({ error: 'HubSpot not configured' });
  }

  const { contactId, meetingId, note, subject } = req.body;
  if (!note) return res.status(400).json({ error: 'Missing note content' });

  try {
    const nowMs = Date.now();
    const engagementBody = {
      engagement: { active: true, type: 'NOTE', timestamp: nowMs },
      associations: {},
      metadata: { body: note },
    };

    if (contactId) engagementBody.associations.contactIds = [parseInt(contactId)];
    if (meetingId) engagementBody.associations.meetingIds = [parseInt(meetingId)];

    const r = await fetch('https://api.hubapi.com/engagements/v1/engagements', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hsToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(engagementBody),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('hubspot-note:create', { status: r.status, message: err.message });
      return res.status(502).json({ error: err.message || 'HubSpot API error' });
    }

    const data = await r.json();
    return res.status(200).json({ id: data.engagement?.id, status: 'ok' });
  } catch (error) {
    console.error('hubspot-note:error', { message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
