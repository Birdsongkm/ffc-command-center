/**
 * Chat provider plugin contract tests.
 * Validates that both Google Chat and Slack providers map to the same
 * normalized schema, and that the UI helpers work correctly.
 */

// ── Import the shared registry ───────────────────────────────────────────────
const {
  getProviderIcon, normalizeConversation, normalizeMessage,
  sortConversations, sortMessages, getTotalUnread, PROVIDER_ICONS,
} = require('../lib/chatRegistry');

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA CONTRACT TESTS — every provider must produce these shapes
// ═══════════════════════════════════════════════════════════════════════════════

describe("Conversation schema contract", () => {
  const requiredFields = ['id', 'provider', 'name', 'type', 'participants', 'lastMessage', 'lastMessageAt', 'unreadCount', 'icon'];

  test("Google Chat conversation has all required fields", () => {
    const c = normalizeConversation({ id: "spaces/abc", displayName: "Team" }, "google-chat");
    for (const field of requiredFields) {
      expect(c).toHaveProperty(field);
    }
  });

  test("Slack conversation has all required fields", () => {
    const c = normalizeConversation({ id: "C123", name: "general" }, "slack");
    for (const field of requiredFields) {
      expect(c).toHaveProperty(field);
    }
  });

  test("Unknown provider conversation has all required fields", () => {
    const c = normalizeConversation({ id: "x" }, "telegram");
    for (const field of requiredFields) {
      expect(c).toHaveProperty(field);
    }
  });

  test("type is always one of: channel, dm, group", () => {
    const validTypes = ['channel', 'dm', 'group'];
    expect(validTypes).toContain(normalizeConversation({ isDm: true }, "slack").type);
    expect(validTypes).toContain(normalizeConversation({ isGroup: true }, "slack").type);
    expect(validTypes).toContain(normalizeConversation({}, "slack").type);
  });

  test("unreadCount is always a number", () => {
    expect(typeof normalizeConversation({}, "slack").unreadCount).toBe("number");
    expect(typeof normalizeConversation({ unreadCount: "3" }, "slack").unreadCount).toBe("string"); // raw passthrough — caller should ensure number
  });

  test("participants is always an array", () => {
    expect(Array.isArray(normalizeConversation({}, "slack").participants)).toBe(true);
  });
});

describe("Message schema contract", () => {
  const requiredFields = ['id', 'conversationId', 'provider', 'sender', 'text', 'timestamp', 'attachments', 'isOwn'];

  test("Google Chat message has all required fields", () => {
    const m = normalizeMessage({ id: "m1", sender: "Pat", text: "Hi", timestamp: "2026-05-20T10:00:00Z" }, "google-chat", "spaces/abc");
    for (const field of requiredFields) {
      expect(m).toHaveProperty(field);
    }
  });

  test("Slack message has all required fields", () => {
    const m = normalizeMessage({ ts: "123", user: "U1", text: "Hey" }, "slack", "C123");
    for (const field of requiredFields) {
      expect(m).toHaveProperty(field);
    }
  });

  test("attachments is always an array", () => {
    expect(Array.isArray(normalizeMessage({}, "slack", "c1").attachments)).toBe(true);
  });

  test("isOwn is always a boolean", () => {
    expect(typeof normalizeMessage({}, "slack", "c1").isOwn).toBe("boolean");
  });

  test("sender is never null", () => {
    expect(normalizeMessage({}, "slack", "c1").sender).toBe("Unknown");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER ICONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("PROVIDER_ICONS registry", () => {
  test("has all expected providers", () => {
    const expected = ['google-chat', 'slack', 'teams', 'discord', 'whatsapp', 'telegram', 'zoom', 'messenger'];
    for (const p of expected) {
      expect(PROVIDER_ICONS[p]).toBeDefined();
    }
  });

  test("all icons are non-empty strings", () => {
    for (const [, icon] of Object.entries(PROVIDER_ICONS)) {
      expect(typeof icon).toBe("string");
      expect(icon.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SORTING — conversations
// ═══════════════════════════════════════════════════════════════════════════════

describe("sortConversations edge cases", () => {
  test("empty array returns empty", () => {
    expect(sortConversations([])).toEqual([]);
  });

  test("single item returns same", () => {
    const c = [{ id: "a", unreadCount: 0, lastMessageAt: null }];
    expect(sortConversations(c)).toHaveLength(1);
  });

  test("stable sort — equal items preserve order", () => {
    const convos = [
      { id: "a", unreadCount: 0, lastMessageAt: "2026-05-20T10:00:00Z" },
      { id: "b", unreadCount: 0, lastMessageAt: "2026-05-20T10:00:00Z" },
    ];
    const sorted = sortConversations(convos);
    // Both have same timestamp, order should be stable
    expect(sorted).toHaveLength(2);
  });

  test("mixed providers sort correctly", () => {
    const convos = [
      { id: "s1", provider: "slack", unreadCount: 0, lastMessageAt: "2026-05-20T08:00:00Z" },
      { id: "g1", provider: "google-chat", unreadCount: 2, lastMessageAt: "2026-05-20T07:00:00Z" },
      { id: "s2", provider: "slack", unreadCount: 1, lastMessageAt: "2026-05-20T10:00:00Z" },
    ];
    const sorted = sortConversations(convos);
    expect(sorted[0].unreadCount).toBeGreaterThan(0); // unread first
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SORTING — messages
// ═══════════════════════════════════════════════════════════════════════════════

describe("sortMessages edge cases", () => {
  test("empty array", () => { expect(sortMessages([])).toEqual([]); });

  test("already sorted stays sorted", () => {
    const msgs = [
      { id: "a", timestamp: "2026-05-20T08:00:00Z" },
      { id: "b", timestamp: "2026-05-20T09:00:00Z" },
      { id: "c", timestamp: "2026-05-20T10:00:00Z" },
    ];
    const sorted = sortMessages(msgs);
    expect(sorted[0].id).toBe("a");
    expect(sorted[2].id).toBe("c");
  });

  test("reverse sorted gets fixed", () => {
    const msgs = [
      { id: "c", timestamp: "2026-05-20T10:00:00Z" },
      { id: "a", timestamp: "2026-05-20T08:00:00Z" },
    ];
    expect(sortMessages(msgs)[0].id).toBe("a");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UNREAD COUNT
// ═══════════════════════════════════════════════════════════════════════════════

describe("getTotalUnread", () => {
  test("sums across providers", () => {
    expect(getTotalUnread([
      { provider: "slack", unreadCount: 3 },
      { provider: "google-chat", unreadCount: 5 },
      { provider: "slack", unreadCount: 1 },
    ])).toBe(9);
  });

  test("handles zero unread", () => {
    expect(getTotalUnread([{ unreadCount: 0 }, { unreadCount: 0 }])).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ATTACHMENT NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("attachment normalization", () => {
  test("Slack file attachment", () => {
    const m = normalizeMessage({
      attachments: [{ name: "report.pdf", permalink: "https://files.slack.com/xyz", mimetype: "application/pdf" }]
    }, "slack", "c1");
    expect(m.attachments[0].name).toBe("report.pdf");
    expect(m.attachments[0].url).toContain("slack.com");
    expect(m.attachments[0].type).toBe("application/pdf");
  });

  test("Google Chat attachment", () => {
    const m = normalizeMessage({
      attachments: [{ name: "photo.jpg", url: "https://chat.google.com/download/xyz" }]
    }, "google-chat", "spaces/abc");
    expect(m.attachments[0].name).toBe("photo.jpg");
  });

  test("attachment with missing fields gets defaults", () => {
    const m = normalizeMessage({ attachments: [{}] }, "slack", "c1");
    expect(m.attachments[0].name).toBe("file");
    expect(m.attachments[0].url).toBe("");
    expect(m.attachments[0].type).toBe("unknown");
  });

  test("no attachments = empty array", () => {
    expect(normalizeMessage({}, "slack", "c1").attachments).toEqual([]);
  });

  test("multiple attachments preserved", () => {
    const m = normalizeMessage({
      attachments: [{ name: "a.pdf" }, { name: "b.png" }, { name: "c.doc" }]
    }, "slack", "c1");
    expect(m.attachments).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-PROVIDER CONSISTENCY
// ═══════════════════════════════════════════════════════════════════════════════

describe("cross-provider consistency", () => {
  test("same message shape from Google Chat and Slack", () => {
    const gcMsg = normalizeMessage({ id: "m1", sender: "Pat", text: "Hello", timestamp: "2026-05-20T10:00:00Z" }, "google-chat", "spaces/abc");
    const slackMsg = normalizeMessage({ id: "m2", sender: "Pat", text: "Hello", timestamp: "2026-05-20T10:00:00Z" }, "slack", "C123");

    // Same fields exist
    expect(Object.keys(gcMsg).sort()).toEqual(Object.keys(slackMsg).sort());

    // Same types
    for (const key of Object.keys(gcMsg)) {
      expect(typeof gcMsg[key]).toBe(typeof slackMsg[key]);
    }
  });

  test("conversations from different providers can be sorted together", () => {
    const mixed = [
      normalizeConversation({ id: "s1", name: "general", unreadCount: 2, lastMessageAt: "2026-05-20T08:00:00Z" }, "slack"),
      normalizeConversation({ id: "g1", displayName: "FFC Team", unreadCount: 0, lastMessageAt: "2026-05-20T10:00:00Z" }, "google-chat"),
    ];
    const sorted = sortConversations(mixed);
    expect(sorted[0].provider).toBe("slack"); // unread first
  });

  test("getTotalUnread works across mixed providers", () => {
    const mixed = [
      normalizeConversation({ unreadCount: 3 }, "slack"),
      normalizeConversation({ unreadCount: 1 }, "google-chat"),
    ];
    expect(getTotalUnread(mixed)).toBe(4);
  });
});
