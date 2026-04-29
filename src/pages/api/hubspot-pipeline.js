/**
 * GET /api/hubspot-pipeline
 * Fetches up to 100 open HubSpot deals and maps internal stage IDs to display names.
 * Returns empty array gracefully if HUBSPOT_TOKEN is not set.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, HUBSPOT_TOKEN
 */
const { getToken } = require('../../lib/auth');

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
