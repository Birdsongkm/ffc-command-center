/**
 * /api/chat/google — Google Chat provider plugin
 * GET ?action=conversations → list spaces
 * GET ?action=messages&conversationId=X → list messages in space
 * POST ?action=send body { conversationId, text } → send message
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../../lib/auth');
const { normalizeConversation, normalizeMessage } = require('../../../lib/chatRegistry');

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const h = { Authorization: `Bearer ${token}` };
  const { action, conversationId } = req.method === 'GET' ? req.query : req.body;

  try {
    if (action === 'conversations') {
      const spacesRes = await fetch(
        'https://chat.googleapis.com/v1/spaces?pageSize=20&filter=spaceType%3DROOM%20OR%20spaceType%3DDIRECT_MESSAGE',
        { headers: h }
      );
      if (!spacesRes.ok) {
        const e = await spacesRes.json().catch(() => ({}));
        console.error('chat/google:conversations', { status: spacesRes.status, message: e.error?.message });
        return res.status(spacesRes.status).json({ error: e.error?.message || 'Failed to list spaces' });
      }
      const data = await spacesRes.json();
      const conversations = (data.spaces || []).map(s => normalizeConversation({
        id: s.name,
        displayName: s.displayName || s.name,
        type: s.spaceType === 'DIRECT_MESSAGE' ? 'dm' : s.spaceType === 'GROUP_CHAT' ? 'group' : 'channel',
      }, 'google-chat'));
      return res.status(200).json({ conversations });
    }

    if (action === 'messages') {
      if (!conversationId) return res.status(400).json({ error: 'Missing conversationId' });
      const msgRes = await fetch(
        `https://chat.googleapis.com/v1/${conversationId}/messages?orderBy=createTime+desc&pageSize=25`,
        { headers: h }
      );
      if (!msgRes.ok) {
        const e = await msgRes.json().catch(() => ({}));
        console.error('chat/google:messages', { conversationId, status: msgRes.status, message: e.error?.message });
        return res.status(msgRes.status).json({ error: e.error?.message || 'Failed to fetch messages' });
      }
      const data = await msgRes.json();
      const messages = (data.messages || []).map(m => normalizeMessage({
        id: m.name,
        sender: m.sender?.displayName || m.sender?.name || 'Unknown',
        text: m.text || '',
        timestamp: m.createTime,
        attachments: (m.attachment || []).map(a => ({ name: a.name || 'file', url: a.downloadUri || '', type: a.contentType || 'unknown' })),
      }, 'google-chat', conversationId));
      return res.status(200).json({ messages });
    }

    if (action === 'send') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'POST only for send' });
      const { text } = req.body;
      if (!conversationId || !text) return res.status(400).json({ error: 'Missing conversationId or text' });
      const sendRes = await fetch(
        `https://chat.googleapis.com/v1/${conversationId}/messages`,
        { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }
      );
      if (!sendRes.ok) {
        const e = await sendRes.json().catch(() => ({}));
        console.error('chat/google:send', { conversationId, status: sendRes.status, message: e.error?.message });
        return res.status(sendRes.status).json({ error: e.error?.message || 'Failed to send' });
      }
      const sent = await sendRes.json();
      const message = normalizeMessage({ id: sent.name, sender: 'You', text, timestamp: sent.createTime, isOwn: true }, 'google-chat', conversationId);
      return res.status(200).json({ message });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    console.error('chat/google:handler', { action, message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
