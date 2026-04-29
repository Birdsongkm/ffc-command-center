/**
 * POST /api/hubspot-note
 * Creates a HubSpot engagement note, optionally associated with a contact or meeting.
 * Body: note (required), contactId (optional), meetingId (optional).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, HUBSPOT_TOKEN
 */
const { getToken } = require('../../lib/auth');

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
