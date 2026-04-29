/**
 * GET /api/signature
 * Fetches the primary Gmail send-as signature HTML for the authenticated user.
 * Returns an empty string if no primary send-as is configured.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = await getToken(req, res);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch signature' });
    }

    const data = await response.json();
    const primary = data.sendAs?.find(s => s.isPrimary);

    if (!primary) {
      return res.status(200).json({ signature: '' });
    }

    return res.status(200).json({ signature: primary.signature || '' });
  } catch (error) {
    console.error('Error fetching signature:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
