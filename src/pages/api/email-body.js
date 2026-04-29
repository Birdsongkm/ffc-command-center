/**
 * GET /api/email-body
 * Fetches the full body (plain text and HTML) of a Gmail message by ID.
 * Query param: id (required, Gmail message ID).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

function decodeBase64Url(str) {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const binary = Buffer.from(padded, 'base64').toString('utf-8');
  return binary;
}

function extractBodyFromMessage(message) {
  let body = '';
  let bodyHtml = '';

  if (message.payload.parts) {
    const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
    const htmlPart = message.payload.parts.find(p => p.mimeType === 'text/html');

    if (textPart && textPart.body?.data) {
      body = decodeBase64Url(textPart.body.data);
    }
    if (htmlPart && htmlPart.body?.data) {
      bodyHtml = decodeBase64Url(htmlPart.body.data);
    }
  } else if (message.payload.body?.data) {
    body = decodeBase64Url(message.payload.body.data);
  }

  return { body, bodyHtml };
}

function getHeaderValue(headers, name) {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function extractAttachments(payload) {
  if (!payload || !payload.parts) return [];
  const result = [];
  function walk(parts) {
    for (const part of parts) {
      if (part.parts) { walk(part.parts); continue; }
      if (part.filename && part.body && part.body.attachmentId) {
        result.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          attachmentId: part.body.attachmentId,
          size: part.body.size || 0,
        });
      }
    }
  }
  walk(payload.parts);
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = await getToken(req, res);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing message ID' });
  }

  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch message' });
    }

    const message = await response.json();
    const { body, bodyHtml } = extractBodyFromMessage(message);
    const headers = message.payload.headers || [];

    return res.status(200).json({
      body,
      bodyHtml,
      from: getHeaderValue(headers, 'From'),
      to: getHeaderValue(headers, 'To'),
      cc: getHeaderValue(headers, 'Cc'),
      subject: getHeaderValue(headers, 'Subject'),
      date: getHeaderValue(headers, 'Date'),
      messageId: message.id,
      threadId: message.threadId,
      labels: message.labelIds || [],
      snippet: message.snippet,
      attachments: extractAttachments(message.payload),
    });
  } catch (error) {
    console.error('Error fetching email body:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
