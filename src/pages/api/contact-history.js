/**
 * GET /api/contact-history
 * Returns Gmail message count and most recent contact date for a given email address.
 * Query param: email (required).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

function getHeaderValue(headers, name) {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

async function getMessageDate(token, messageId) {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Date`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      return null;
    }

    const message = await response.json();
    const headers = message.payload.headers || [];
    return getHeaderValue(headers, 'Date');
  } catch (error) {
    console.error('Error fetching message date:', error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = await getToken(req, res);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Missing email parameter' });
  }

  try {
    const query = encodeURIComponent(`from:${email} OR to:${email}`);
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to search messages' });
    }

    const data = await response.json();
    const totalMessages = data.resultSizeEstimate || 0;
    let lastContact = null;

    if (data.messages && data.messages.length > 0) {
      lastContact = await getMessageDate(token, data.messages[0].id);
    }

    return res.status(200).json({
      email,
      totalMessages,
      lastContact,
    });
  } catch (error) {
    console.error('Error fetching contact history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
