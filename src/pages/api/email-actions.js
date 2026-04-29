/**
 * POST /api/email-actions
 * Applies Gmail label mutations to one or many messages.
 * Actions: archive | markRead | markUnread | trash | star | unstar | snooze.
 * Supports batch mode via messageIds array using Gmail batchModify.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

// Process a single action on one message
async function doAction(token, messageId, action) {
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const gmailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;

  if (action === 'archive') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ removeLabelIds: ['INBOX'] }) });
    return r.json();
  }
  if (action === 'markRead') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ removeLabelIds: ['UNREAD'] }) });
    return r.json();
  }
  if (action === 'markUnread') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ addLabelIds: ['UNREAD'] }) });
    return r.json();
  }
  if (action === 'trash') {
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, { method: 'POST', headers: h });
    return r.json();
  }
  if (action === 'star') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ addLabelIds: ['STARRED'] }) });
    return r.json();
  }
  if (action === 'unstar') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ removeLabelIds: ['STARRED'] }) });
    return r.json();
  }
  if (action === 'snooze') {
    // For now, just archive the message (remove from INBOX)
    // Client-side will handle snooze reminder storage
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ removeLabelIds: ['INBOX'] }) });
    return r.json();
  }
  if (action === 'untrash') {
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/untrash`, { method: 'POST', headers: h });
    return r.json();
  }
  if (action === 'unarchive') {
    const r = await fetch(gmailUrl, { method: 'POST', headers: h, body: JSON.stringify({ addLabelIds: ['INBOX'] }) });
    return r.json();
  }
  if (action === 'forward') {
    // This action requires messageId, forwardTo, and will be handled by calling forward endpoint
    // Note: The actual forwarding is handled via send-email.js with forward mode
    return { error: 'Use forward via send-email endpoint' };
  }
  return { error: 'Unknown action' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { action, messageId, messageIds } = req.body;

  if (!action) return res.status(400).json({ error: 'Missing action' });

  try {
    // Batch mode: process multiple messages
    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      // Use Gmail batch modify for supported actions (much faster)
      const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      if (action === 'archive') {
        const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify', {
          method: 'POST', headers: h,
          body: JSON.stringify({ ids: messageIds, removeLabelIds: ['INBOX'] }),
        });
        if (r.status === 204 || r.status === 200) return res.json({ success: true, count: messageIds.length });
        const data = await r.json();
        return res.json({ success: false, error: data.error?.message || 'Batch archive failed' });
      }

      if (action === 'markRead') {
        const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify', {
          method: 'POST', headers: h,
          body: JSON.stringify({ ids: messageIds, removeLabelIds: ['UNREAD'] }),
        });
        if (r.status === 204 || r.status === 200) return res.json({ success: true, count: messageIds.length });
        const data = await r.json();
        return res.json({ success: false, error: data.error?.message || 'Batch mark read failed' });
      }

      if (action === 'trash') {
        // No batch trash endpoint, do them in parallel
        const results = await Promise.all(messageIds.map(id => doAction(token, id, 'trash')));
        return res.json({ success: true, count: messageIds.length });
      }

      // Fallback: process individually in parallel
      const results = await Promise.all(messageIds.map(id => doAction(token, id, action)));
      return res.json({ success: true, count: messageIds.length });
    }

    // Single message mode
    if (!messageId) return res.status(400).json({ error: 'Missing messageId or messageIds' });

    const data = await doAction(token, messageId, action);
    res.json({ success: !data.error, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
