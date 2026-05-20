/**
 * Chat registry + normalized schema tests
 * Tests the provider plugin architecture BEFORE implementation.
 * Every function here maps to a function in /api/chat/registry.js
 */

// ── Normalized schema ────────────────────────────────────────────────────────

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

function getProviderIcon(provider) {
  const icons = {
    'google-chat': '💬',
    'slack': '🟣',
    'teams': '🟦',
    'discord': '🎮',
    'whatsapp': '🟢',
    'telegram': '✈️',
    'zoom': '🔵',
    'messenger': '💙',
  };
  return icons[provider] || '💬';
}

// ── Provider registry ────────────────────────────────────────────────────────

function createProviderRegistry() {
  const providers = {};
  return {
    register(id, config) {
      providers[id] = { id, name: config.name, icon: getProviderIcon(id), apiPath: config.apiPath, enabled: config.enabled !== false };
    },
    get(id) { return providers[id] || null; },
    list() { return Object.values(providers).filter(p => p.enabled); },
    listAll() { return Object.values(providers); },
    isEnabled(id) { return providers[id]?.enabled || false; },
  };
}

// ── Conversation sorting ─────────────────────────────────────────────────────

function sortConversations(conversations) {
  return [...conversations].sort((a, b) => {
    // Unread first
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    // Then by most recent message
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

function filterConversationsByProvider(conversations, provider) {
  if (!provider) return conversations;
  return conversations.filter(c => c.provider === provider);
}

function getTotalUnread(conversations) {
  return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
}

function groupConversationsByProvider(conversations) {
  const groups = {};
  for (const c of conversations) {
    if (!groups[c.provider]) groups[c.provider] = [];
    groups[c.provider].push(c);
  }
  return groups;
}

// ── Message helpers ──────────────────────────────────────────────────────────

function sortMessages(messages) {
  return [...messages].sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return aTime - bTime; // oldest first (chat order)
  });
}

function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60000) return 'now';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m`;
  if (diffMs < 86400000) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffMs < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncatePreview(text, maxLen = 60) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

// ── Slack-specific normalization ─────────────────────────────────────────────

function normalizeSlackChannel(channel) {
  return normalizeConversation({
    id: channel.id,
    name: channel.name || channel.name_normalized,
    type: channel.is_im ? 'dm' : channel.is_mpim ? 'group' : 'channel',
    participants: (channel.members || []).map(m => m.name || m),
    lastMessage: channel.topic?.value || '',
    lastMessageAt: channel.updated ? new Date(channel.updated * 1000).toISOString() : null,
    unreadCount: channel.unread_count_display || channel.unread_count || 0,
  }, 'slack');
}

function normalizeSlackMessage(msg, conversationId) {
  return normalizeMessage({
    id: msg.ts,
    sender: msg.user_profile?.real_name || msg.user || 'Unknown',
    senderEmail: msg.user_profile?.email || null,
    text: msg.text || '',
    timestamp: msg.ts ? new Date(parseFloat(msg.ts) * 1000).toISOString() : null,
    attachments: (msg.files || []).map(f => ({ name: f.name, url: f.permalink, type: f.mimetype })),
    isOwn: msg.isOwn || false,
  }, 'slack', conversationId);
}

// ── Google Chat normalization ────────────────────────────────────────────────

function normalizeGoogleChatSpace(space) {
  return normalizeConversation({
    id: space.name,
    name: space.displayName || space.name,
    type: space.spaceType === 'DIRECT_MESSAGE' ? 'dm' : space.spaceType === 'GROUP_CHAT' ? 'group' : 'channel',
    participants: [],
    lastMessage: '',
    lastMessageAt: null,
    unreadCount: 0,
  }, 'google-chat');
}

function normalizeGoogleChatMessage(msg, conversationId) {
  return normalizeMessage({
    id: msg.name,
    sender: msg.sender?.displayName || msg.sender?.name || 'Unknown',
    senderEmail: null,
    text: msg.text || '',
    timestamp: msg.createTime,
    attachments: (msg.attachment || []).map(a => ({ name: a.name || 'file', url: a.downloadUri || '', type: a.contentType || 'unknown' })),
    isOwn: false,
  }, 'google-chat', conversationId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("normalizeConversation", () => {
  test("normalizes basic fields", () => {
    const c = normalizeConversation({ id: "c1", name: "general", unreadCount: 3 }, "slack");
    expect(c.id).toBe("c1");
    expect(c.provider).toBe("slack");
    expect(c.name).toBe("general");
    expect(c.unreadCount).toBe(3);
    expect(c.icon).toBe("🟣");
  });

  test("defaults missing fields", () => {
    const c = normalizeConversation({}, "google-chat");
    expect(c.name).toBe("Unknown");
    expect(c.unreadCount).toBe(0);
    expect(c.participants).toEqual([]);
    expect(c.lastMessageAt).toBeNull();
  });

  test("uses displayName fallback", () => {
    const c = normalizeConversation({ displayName: "Team Chat" }, "google-chat");
    expect(c.name).toBe("Team Chat");
  });

  test("infers type from isDm flag", () => {
    expect(normalizeConversation({ isDm: true }, "slack").type).toBe("dm");
  });

  test("infers type from isGroup flag", () => {
    expect(normalizeConversation({ isGroup: true }, "slack").type).toBe("group");
  });

  test("defaults type to channel", () => {
    expect(normalizeConversation({}, "slack").type).toBe("channel");
  });
});

describe("normalizeMessage", () => {
  test("normalizes basic fields", () => {
    const m = normalizeMessage({ id: "m1", sender: "Pat", text: "Hello", timestamp: "2026-05-20T10:00:00Z" }, "slack", "c1");
    expect(m.id).toBe("m1");
    expect(m.provider).toBe("slack");
    expect(m.conversationId).toBe("c1");
    expect(m.sender).toBe("Pat");
    expect(m.text).toBe("Hello");
  });

  test("defaults missing fields", () => {
    const m = normalizeMessage({}, "slack", "c1");
    expect(m.sender).toBe("Unknown");
    expect(m.text).toBe("");
    expect(m.attachments).toEqual([]);
    expect(m.isOwn).toBe(false);
  });

  test("normalizes attachments", () => {
    const m = normalizeMessage({ attachments: [{ name: "file.pdf", url: "http://x.com/file.pdf" }] }, "slack", "c1");
    expect(m.attachments).toHaveLength(1);
    expect(m.attachments[0].name).toBe("file.pdf");
  });

  test("uses senderName fallback", () => {
    expect(normalizeMessage({ senderName: "Pat" }, "slack", "c1").sender).toBe("Pat");
  });

  test("uses user fallback", () => {
    expect(normalizeMessage({ user: "U123" }, "slack", "c1").sender).toBe("U123");
  });
});

describe("getProviderIcon", () => {
  test("slack", () => { expect(getProviderIcon("slack")).toBe("🟣"); });
  test("google-chat", () => { expect(getProviderIcon("google-chat")).toBe("💬"); });
  test("teams", () => { expect(getProviderIcon("teams")).toBe("🟦"); });
  test("discord", () => { expect(getProviderIcon("discord")).toBe("🎮"); });
  test("whatsapp", () => { expect(getProviderIcon("whatsapp")).toBe("🟢"); });
  test("unknown", () => { expect(getProviderIcon("unknown")).toBe("💬"); });
});

describe("createProviderRegistry", () => {
  test("register and list providers", () => {
    const reg = createProviderRegistry();
    reg.register("slack", { name: "Slack", apiPath: "/api/chat/slack" });
    reg.register("google-chat", { name: "Google Chat", apiPath: "/api/chat/google" });
    expect(reg.list()).toHaveLength(2);
  });

  test("get by id", () => {
    const reg = createProviderRegistry();
    reg.register("slack", { name: "Slack", apiPath: "/api/chat/slack" });
    expect(reg.get("slack").name).toBe("Slack");
  });

  test("get unknown returns null", () => {
    const reg = createProviderRegistry();
    expect(reg.get("nonexistent")).toBeNull();
  });

  test("disabled providers excluded from list()", () => {
    const reg = createProviderRegistry();
    reg.register("slack", { name: "Slack", apiPath: "/api/chat/slack", enabled: true });
    reg.register("teams", { name: "Teams", apiPath: "/api/chat/teams", enabled: false });
    expect(reg.list()).toHaveLength(1);
    expect(reg.listAll()).toHaveLength(2);
  });

  test("isEnabled", () => {
    const reg = createProviderRegistry();
    reg.register("slack", { name: "Slack", apiPath: "/api/chat/slack" });
    expect(reg.isEnabled("slack")).toBe(true);
    expect(reg.isEnabled("teams")).toBe(false);
  });
});

describe("sortConversations", () => {
  test("unread conversations come first", () => {
    const convos = [
      { id: "a", unreadCount: 0, lastMessageAt: "2026-05-20T10:00:00Z" },
      { id: "b", unreadCount: 3, lastMessageAt: "2026-05-20T09:00:00Z" },
    ];
    expect(sortConversations(convos)[0].id).toBe("b");
  });

  test("among unread, most recent first", () => {
    const convos = [
      { id: "a", unreadCount: 1, lastMessageAt: "2026-05-20T08:00:00Z" },
      { id: "b", unreadCount: 2, lastMessageAt: "2026-05-20T10:00:00Z" },
    ];
    expect(sortConversations(convos)[0].id).toBe("b");
  });

  test("among read, most recent first", () => {
    const convos = [
      { id: "a", unreadCount: 0, lastMessageAt: "2026-05-20T08:00:00Z" },
      { id: "b", unreadCount: 0, lastMessageAt: "2026-05-20T10:00:00Z" },
    ];
    expect(sortConversations(convos)[0].id).toBe("b");
  });

  test("handles null timestamps", () => {
    const convos = [
      { id: "a", unreadCount: 0, lastMessageAt: null },
      { id: "b", unreadCount: 0, lastMessageAt: "2026-05-20T10:00:00Z" },
    ];
    expect(sortConversations(convos)[0].id).toBe("b");
  });

  test("does not mutate original", () => {
    const convos = [{ id: "a", unreadCount: 0 }, { id: "b", unreadCount: 1 }];
    sortConversations(convos);
    expect(convos[0].id).toBe("a");
  });
});

describe("filterConversationsByProvider", () => {
  test("filters by provider", () => {
    const convos = [
      { id: "1", provider: "slack" },
      { id: "2", provider: "google-chat" },
      { id: "3", provider: "slack" },
    ];
    expect(filterConversationsByProvider(convos, "slack")).toHaveLength(2);
  });

  test("null provider returns all", () => {
    const convos = [{ provider: "slack" }, { provider: "google-chat" }];
    expect(filterConversationsByProvider(convos, null)).toHaveLength(2);
  });
});

describe("getTotalUnread", () => {
  test("sums unread counts", () => {
    expect(getTotalUnread([{ unreadCount: 3 }, { unreadCount: 5 }, { unreadCount: 0 }])).toBe(8);
  });

  test("empty array", () => { expect(getTotalUnread([])).toBe(0); });

  test("handles missing unreadCount", () => {
    expect(getTotalUnread([{}, { unreadCount: 2 }])).toBe(2);
  });
});

describe("groupConversationsByProvider", () => {
  test("groups correctly", () => {
    const convos = [
      { provider: "slack" }, { provider: "google-chat" }, { provider: "slack" },
    ];
    const groups = groupConversationsByProvider(convos);
    expect(groups.slack).toHaveLength(2);
    expect(groups["google-chat"]).toHaveLength(1);
  });

  test("empty array", () => {
    expect(groupConversationsByProvider([])).toEqual({});
  });
});

describe("sortMessages", () => {
  test("sorts oldest first (chat order)", () => {
    const msgs = [
      { id: "a", timestamp: "2026-05-20T10:00:00Z" },
      { id: "b", timestamp: "2026-05-20T08:00:00Z" },
    ];
    expect(sortMessages(msgs)[0].id).toBe("b");
  });

  test("handles null timestamps", () => {
    const msgs = [{ id: "a", timestamp: null }, { id: "b", timestamp: "2026-05-20T10:00:00Z" }];
    expect(sortMessages(msgs)[0].id).toBe("a");
  });
});

describe("formatMessageTime", () => {
  test("recent = 'now'", () => {
    expect(formatMessageTime(new Date().toISOString())).toBe("now");
  });

  test("minutes ago", () => {
    const t = new Date(Date.now() - 300000).toISOString();
    expect(formatMessageTime(t)).toMatch(/\dm/);
  });

  test("hours ago shows time", () => {
    const t = new Date(Date.now() - 7200000).toISOString();
    expect(formatMessageTime(t)).toMatch(/\d{1,2}:\d{2}/);
  });

  test("null returns empty", () => {
    expect(formatMessageTime(null)).toBe("");
  });
});

describe("truncatePreview", () => {
  test("short text unchanged", () => { expect(truncatePreview("Hi")).toBe("Hi"); });
  test("long text truncated", () => { expect(truncatePreview("x".repeat(100), 20)).toHaveLength(21); });
  test("null returns empty", () => { expect(truncatePreview(null)).toBe(""); });
});

describe("normalizeSlackChannel", () => {
  test("normalizes a Slack channel", () => {
    const c = normalizeSlackChannel({ id: "C123", name: "general", is_im: false, unread_count_display: 2, updated: 1716200000 });
    expect(c.provider).toBe("slack");
    expect(c.name).toBe("general");
    expect(c.type).toBe("channel");
    expect(c.unreadCount).toBe(2);
    expect(c.icon).toBe("🟣");
  });

  test("normalizes a Slack DM", () => {
    const c = normalizeSlackChannel({ id: "D123", name: "pat", is_im: true });
    expect(c.type).toBe("dm");
  });

  test("normalizes a Slack group", () => {
    const c = normalizeSlackChannel({ id: "G123", name: "team", is_mpim: true });
    expect(c.type).toBe("group");
  });
});

describe("normalizeSlackMessage", () => {
  test("normalizes a Slack message", () => {
    const m = normalizeSlackMessage({ ts: "1716200000.000100", text: "Hello", user_profile: { real_name: "Pat" } }, "C123");
    expect(m.provider).toBe("slack");
    expect(m.sender).toBe("Pat");
    expect(m.text).toBe("Hello");
    expect(m.timestamp).toBeTruthy();
  });

  test("handles files", () => {
    const m = normalizeSlackMessage({ ts: "123", files: [{ name: "doc.pdf", permalink: "http://x.com", mimetype: "application/pdf" }] }, "C123");
    expect(m.attachments).toHaveLength(1);
    expect(m.attachments[0].name).toBe("doc.pdf");
  });
});

describe("normalizeGoogleChatSpace", () => {
  test("normalizes a Google Chat room", () => {
    const c = normalizeGoogleChatSpace({ name: "spaces/abc", displayName: "FFC Team", spaceType: "ROOM" });
    expect(c.provider).toBe("google-chat");
    expect(c.name).toBe("FFC Team");
    expect(c.type).toBe("channel");
  });

  test("normalizes a DM", () => {
    const c = normalizeGoogleChatSpace({ name: "spaces/dm123", displayName: "", spaceType: "DIRECT_MESSAGE" });
    expect(c.type).toBe("dm");
  });
});

describe("normalizeGoogleChatMessage", () => {
  test("normalizes a Google Chat message", () => {
    const m = normalizeGoogleChatMessage({ name: "spaces/abc/messages/m1", text: "Hi", createTime: "2026-05-20T10:00:00Z", sender: { displayName: "Laura" } }, "spaces/abc");
    expect(m.provider).toBe("google-chat");
    expect(m.sender).toBe("Laura");
    expect(m.text).toBe("Hi");
  });
});
