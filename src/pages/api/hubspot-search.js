export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const hsToken = process.env.HUBSPOT_TOKEN;
  if (!hsToken) return res.status(500).json({ error: 'HubSpot not configured' });

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
          {
            filters: [
              { propertyName: 'firstname', operator: 'CONTAINS_TOKEN', value: q },
            ],
          },
          {
            filters: [
              { propertyName: 'lastname', operator: 'CONTAINS_TOKEN', value: q },
            ],
          },
          {
            filters: [
              { propertyName: 'email', operator: 'CONTAINS_TOKEN', value: q },
            ],
          },
        ],
        properties: ['firstname', 'lastname', 'email', 'company'],
        limit: 10,
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('hubspot-search:error', { status: r.status, message: err.message });
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
    console.error('hubspot-search:error', { message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
