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

const PIPELINE_STAGE_ORDER = ["Prospect", "Cultivating", "Ask Made", "Pledge", "Received"];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const hsToken = process.env.HUBSPOT_TOKEN;
  if (!hsToken) return res.status(200).json({ deals: [] }); // graceful empty if not configured

  try {
    // Search HubSpot deals — fetch all open deals with stage info
    const r = await fetch('https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate', {
      headers: { Authorization: `Bearer ${hsToken}` },
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('hubspot-pipeline:fetch', { status: r.status, message: err.message });
      return res.status(200).json({ deals: [] }); // return empty rather than break Today tab
    }

    const data = await r.json();
    const deals = (data.results || []).map(d => ({
      id: d.id,
      name: d.properties?.dealname || 'Unnamed Deal',
      stage: mapHubSpotStage(d.properties?.dealstage || ''),
      amount: d.properties?.amount ? parseFloat(d.properties.amount) : null,
      closeDate: d.properties?.closedate || null,
    }));

    return res.status(200).json({ deals });
  } catch (error) {
    console.error('hubspot-pipeline:error', { message: error.message });
    return res.status(200).json({ deals: [] }); // return empty rather than break Today tab
  }
}

// Map HubSpot internal stage IDs/names to our display names
function mapHubSpotStage(stage) {
  const s = (stage || '').toLowerCase();
  if (s.includes('prospect') || s === 'appointmentscheduled') return 'Prospect';
  if (s.includes('cultivat') || s === 'qualifiedtobuy') return 'Cultivating';
  if (s.includes('ask') || s === 'presentationscheduled' || s === 'decisionmakerboughtin') return 'Ask Made';
  if (s.includes('pledge') || s === 'contractsent') return 'Pledge';
  if (s.includes('receiv') || s.includes('won') || s === 'closedwon') return 'Received';
  return stage; // return as-is if unrecognized
}
