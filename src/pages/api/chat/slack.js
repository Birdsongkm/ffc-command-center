/**
 * /api/chat/slack — Slack provider plugin
 * GET ?action=conversations → list channels/DMs
 * GET ?action=messages&conversationId=X → list messages in channel
 * POST ?action=send body { conversationId, text } → send message
 * Env: SLACK_BOT_TOKEN
 */
const { getToken } = require('../../../lib/auth');
const { normalizeConversation, normalizeMessage } = require('../../../lib/chatRegistry');

const SLACK_API = 'https://slack.com/api';

async function slackApi(method, token, params = {}) {
  const url = `${SLACK_API}/${method}`;
  const isPost = ['chat.postMessage'].includes(method);
  const opts = isPost
    ? { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(params) }
    : { headers: { Authorization: `Bearer ${token}` } };
  const queryStr = !isPost && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
  const r = await fetch(url + queryStr, opts);
  const data = await r.json();
  if (!data.ok) {
    console.error(`chat/slack:${method}`, { error: data.error });
    throw new Error(data.error || `Slack API ${method} failed`);
  }
  return data;
}

export default async function handler(req, res) {
  // Auth check — must be logged into the CC
  const ccToken = await getToken(req, res);
  if (!ccToken) return res.status(401).json({ error: 'Unauthorized' });

  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) return res.status(200).json({ error: 'Slack not configured', conversations: [], messages: [] });

  const { action, conversationId } = req.method === 'GET' ? req.query : req.body;

  try {
    if (action === 'conversations') {
      const data = await slackApi('conversations.list', slackToken, {
        types: 'public_channel,private_channel,mpim,im',
        exclude_archived: 'true',
        limit: '50',
      });
      const conversations = (data.channels || []).map(ch => normalizeConversation({
        id: ch.id,
        name: ch.name || ch.name_normalized || (ch.is_im ? 'DM' : 'Channel'),
        type: ch.is_im ? 'dm' : ch.is_mpim ? 'group' : 'channel',
        participants: [],
        lastMessageAt: ch.updated ? new Date(ch.updated * 1000).toISOString() : null,
        unreadCount: ch.unread_count_display || ch.unread_count || 0,
      }, 'slack'));
      return res.status(200).json({ conversations });
    }

    if (action === 'messages') {
      if (!conversationId) return res.status(400).json({ error: 'Missing conversationId' });
      const data = await slackApi('conversations.history', slackToken, { channel: conversationId, limit: '25' });
      // Fetch user profiles for display names
      const userIds = [...new Set((data.messages || []).map(m => m.user).filter(Boolean))];
      const profiles = {};
      for (const uid of userIds.slice(0, 20)) {
        try {
          const u = await slackApi('users.info', slackToken, { user: uid });
          if (u.user) profiles[uid] = { name: u.user.real_name || u.user.name, email: u.user.profile?.email };
        } catch {}
      }
      const messages = (data.messages || []).map(m => normalizeMessage({
        id: m.ts,
        sender: profiles[m.user]?.name || m.user || 'Unknown',
        senderEmail: profiles[m.user]?.email || null,
        text: m.text || '',
        timestamp: m.ts ? new Date(parseFloat(m.ts) * 1000).toISOString() : null,
        attachments: (m.files || []).map(f => ({ name: f.name, url: f.permalink, type: f.mimetype })),
        isOwn: m.bot_id ? false : false, // Will need auth_test to determine own user
      }, 'slack', conversationId));
      return res.status(200).json({ messages });
    }

    if (action === 'send') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'POST only for send' });
      const { text } = req.body;
      if (!conversationId || !text) return res.status(400).json({ error: 'Missing conversationId or text' });
      const data = await slackApi('chat.postMessage', slackToken, { channel: conversationId, text });
      const message = normalizeMessage({
        id: data.ts,
        sender: 'You',
        text,
        timestamp: data.ts ? new Date(parseFloat(data.ts) * 1000).toISOString() : new Date().toISOString(),
        isOwn: true,
      }, 'slack', conversationId);
      return res.status(200).json({ message });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    console.error('chat/slack:handler', { action, message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
