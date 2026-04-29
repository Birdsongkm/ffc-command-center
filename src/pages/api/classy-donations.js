/**
 * GET /api/classy-donations
 * Fetches the last 25 Classy transactions from the past 7 days for the configured org.
 * Returns empty array gracefully if CLASSY_API_TOKEN or CLASSY_ORG_ID are not set.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CLASSY_API_TOKEN, CLASSY_ORG_ID
 */
const { getToken } = require('../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const classyToken = process.env.CLASSY_API_TOKEN;
  if (!classyToken) {
    // Graceful empty state — Classy not yet configured
    return res.status(200).json({ donations: [], configured: false });
  }

  try {
    // Get organization ID first
    const orgId = process.env.CLASSY_ORG_ID;
    if (!orgId) return res.status(200).json({ donations: [], configured: false });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const r = await fetch(
      `https://api.classy.org/2.0/organizations/${orgId}/transactions?per_page=25&created_gte=${sevenDaysAgo}&sort=created_at&order=DESC`,
      {
        headers: {
          Authorization: `Bearer ${classyToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('classy-donations:fetch', { status: r.status, message: err.error?.message });
      return res.status(200).json({ donations: [], configured: true });
    }

    const data = await r.json();
    const donations = (data.data || []).map(t => ({
      id: t.id,
      name: [t.member_name, t.billing_first_name, t.billing_last_name].filter(Boolean).join(' ') || 'Anonymous',
      amount: parseFloat(t.total_gross_amount || t.raw_donation_gross_amount || 0),
      date: t.created_at,
      recurring: t.is_recurring || false,
    }));

    return res.status(200).json({ donations, configured: true });
  } catch (error) {
    console.error('classy-donations:error', { message: error.message });
    return res.status(200).json({ donations: [], configured: true });
  }
}
