/**
 * GET | DELETE | PUT | PATCH /api/drafts
 * Manages Gmail drafts: GET lists all drafts, DELETE removes one, PUT sends one,
 * PATCH updates recipient/subject/body. Draft details fetched via /drafts/{id}?format=full.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

function decodeBase64Url(str) {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function getHeaderValue(headers, name) {
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

function extractBodyFromMessage(message) {
  const walk = (part) => {
    if (!part) return null;
    if (part.mimeType === 'text/plain' && part.body?.data) return { type: 'text', data: decodeBase64Url(part.body.data) };
    if (part.mimeType === 'text/html' && part.body?.data) return { type: 'html', data: decodeBase64Url(part.body.data) };
    if (part.parts) {
      for (const p of part.parts) { const r = walk(p); if (r) return r; }
    }
    return null;
  };
  const result = walk(message.payload);
  return result?.data || message.snippet || '';
}

// FIX: Use /drafts/{id}?format=full — not the messages endpoint
async function fetchDraftDetails(token, draftId) {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const message = data.message;
    if (!message) return null;
    const headers = message.payload?.headers || [];
    const body = extractBodyFromMessage(message);
    return {
      id: draftId,          // draft ID — used for send/delete
      messageId: message.id, // message ID — used for Gmail link
      to: getHeaderValue(headers, 'To'),
      subject: getHeaderValue(headers, 'Subject'),
      snippet: message.snippet || '',
      date: getHeaderValue(headers, 'Date'),
      body,
    };
  } catch (e) {
    return null;
  }
}

async function handleGet(token, maxResults = 50) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Failed to fetch drafts list');
  const data = await response.json();
  const draftIds = (data.drafts || []).map(d => d.id);

  // Fetch in batches of 10 to avoid rate limits
  const drafts = [];
  for (let i = 0; i < draftIds.length; i += 10) {
    const batch = draftIds.slice(i, i + 10);
    const results = await Promise.all(batch.map(id => fetchDraftDetails(token, id)));
    results.forEach(r => { if (r) drafts.push(r); });
  }
  return { drafts, total: data.resultSizeEstimate || drafts.length };
}

async function handleDelete(token, draftId) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Failed to delete draft');
  return { success: true };
}

async function handleUpdate(token, draftId, { to, subject, body }) {
  const { buildRawEmail } = require('../../lib/email');
  const raw = buildRawEmail({ to, subject, body: body || '' });
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { raw } }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('drafts:update', { draftId, status: response.status, message: err.error?.message });
    throw new Error(err.error?.message || 'Failed to update draft');
  }
  return { success: true };
}

async function handleSend(token, draftId) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}/send`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to send draft');
  }
  const data = await response.json();
  return { success: true, messageId: data.id };
}

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const result = await handleGet(token);
      return res.status(200).json(result);
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing draft ID' });
      return res.status(200).json(await handleDelete(token, id));
    }
    if (req.method === 'PUT') {
      const { draftId } = req.body;
      if (!draftId) return res.status(400).json({ error: 'Missing draft ID' });
      return res.status(200).json(await handleSend(token, draftId));
    }
    if (req.method === 'PATCH') {
      const { draftId, to, subject, body } = req.body;
      if (!draftId) return res.status(400).json({ error: 'Missing draftId' });
      if (!to) return res.status(400).json({ error: 'Missing to' });
      if (!subject) return res.status(400).json({ error: 'Missing subject' });
      return res.status(200).json(await handleUpdate(token, draftId, { to, subject, body }));
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Drafts API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
