/**
 * Chat provider registry + normalized schema.
 * Every chat provider (Slack, Google Chat, Teams, etc.) maps to the same
 * Conversation/Message shape so the UI doesn't know or care which provider
 * a message came from.
 */

const PROVIDER_ICONS = {
  'google-chat': '💬',
  'slack': '🟣',
  'teams': '🟦',
  'discord': '🎮',
  'whatsapp': '🟢',
  'telegram': '✈️',
  'zoom': '🔵',
  'messenger': '💙',
};

function getProviderIcon(provider) {
  return PROVIDER_ICONS[provider] || '💬';
}

function normalizeConversation(raw, provider) {
  return {
    id: raw.id || '',
    provider,
    name: raw.name || raw.displayName || 'Unknown',
    type: raw.type || (raw.isDm ? 'dm' : raw.isGroup ? 'group' : 'channel'),
    participants: raw.participants || [],
    lastMessage: raw.lastMessage || '',
    lastMessageAt: raw.lastMessageAt || null,
    unreadCount: raw.unreadCount || 0,
    icon: getProviderIcon(provider),
  };
}

function normalizeMessage(raw, provider, conversationId) {
  return {
    id: raw.id || raw.ts || '',
    conversationId,
    provider,
    sender: raw.sender || raw.senderName || raw.user || 'Unknown',
    senderEmail: raw.senderEmail || null,
    text: raw.text || '',
    timestamp: raw.timestamp || raw.ts || raw.createTime || null,
    attachments: (raw.attachments || []).map(a => ({
      name: a.name || a.title || 'file',
      url: a.url || a.permalink || '',
      type: a.type || a.mimetype || 'unknown',
    })),
    isOwn: raw.isOwn || false,
  };
}

function sortConversations(conversations) {
  return [...conversations].sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

function sortMessages(messages) {
  return [...messages].sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return aTime - bTime;
  });
}

function getTotalUnread(conversations) {
  return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
}

module.exports = {
  getProviderIcon, normalizeConversation, normalizeMessage,
  sortConversations, sortMessages, getTotalUnread, PROVIDER_ICONS,
};
