/**
 * Google Chat notifications — issue #89
 * Tests: isNewChatMessage, formatChatSender, formatChatPreview,
 *        buildChatNotifications, chatProviderFor
 *
 * These pure helpers drive the real-time chat pop-up notification system.
 * Architecture is provider-agnostic so Teams / Slack can be added later.
 */

// ── Pure helpers (duplicated inline — project pattern) ────────────────────────

function isNewChatMessage(msg, lastPollMs) {
  if (!msg || !msg.createTime) return false;
  return new Date(msg.createTime).getTime() > lastPollMs;
}

function formatChatSender(msg) {
  return msg?.sender?.displayName || msg?.sender?.name || 'Unknown';
}

function formatChatPreview(msg, maxLen = 80) {
  const text = msg?.text || '[attachment]';
  return text.length > maxLen ? text.slice(0, maxLen) + '\u2026' : text;
}

function buildChatNotifications(messages, lastPollMs) {
  return messages
    .filter(m => isNewChatMessage(m, lastPollMs))
    .map(m => ({
      id: m.name || String(Date.now()),
      sender: formatChatSender(m),
      preview: formatChatPreview(m),
      spaceName: m.spaceName || '',
      timestamp: new Date(m.createTime).getTime(),
    }));
}

const CHAT_PROVIDERS = [
  { id: 'google-chat', name: 'Google Chat', apiPath: '/api/chat-messages', icon: '💬' },
];

function chatProviderFor(id, providers) {
  return (providers || CHAT_PROVIDERS).find(p => p.id === id) || null;
}

// ── isNewChatMessage ──────────────────────────────────────────────────────────

describe('isNewChatMessage', () => {
  const now = 1700000000000; // fixed reference timestamp

  test('returns true when message createTime is after lastPollMs', () => {
    const msg = { createTime: new Date(now + 5000).toISOString() };
    expect(isNewChatMessage(msg, now)).toBe(true);
  });

  test('returns false when message createTime is before lastPollMs', () => {
    const msg = { createTime: new Date(now - 5000).toISOString() };
    expect(isNewChatMessage(msg, now)).toBe(false);
  });

  test('returns false when message createTime equals lastPollMs', () => {
    const msg = { createTime: new Date(now).toISOString() };
    expect(isNewChatMessage(msg, now)).toBe(false);
  });

  test('returns false when msg is null', () => {
    expect(isNewChatMessage(null, now)).toBe(false);
  });

  test('returns false when msg has no createTime', () => {
    expect(isNewChatMessage({ text: 'hello' }, now)).toBe(false);
  });

  test('returns false when msg is undefined', () => {
    expect(isNewChatMessage(undefined, now)).toBe(false);
  });

  test('returns true for very recent message (now + 1ms)', () => {
    const msg = { createTime: new Date(now + 1).toISOString() };
    expect(isNewChatMessage(msg, now)).toBe(true);
  });
});

// ── formatChatSender ──────────────────────────────────────────────────────────

describe('formatChatSender', () => {
  test('returns displayName when present', () => {
    const msg = { sender: { displayName: 'Laura Lavid', name: 'users/abc' } };
    expect(formatChatSender(msg)).toBe('Laura Lavid');
  });

  test('falls back to sender.name when displayName is absent', () => {
    const msg = { sender: { name: 'users/abc123' } };
    expect(formatChatSender(msg)).toBe('users/abc123');
  });

  test('returns "Unknown" when sender is absent', () => {
    const msg = { text: 'hello' };
    expect(formatChatSender(msg)).toBe('Unknown');
  });

  test('returns "Unknown" when msg is null', () => {
    expect(formatChatSender(null)).toBe('Unknown');
  });

  test('returns "Unknown" when both displayName and name are absent', () => {
    const msg = { sender: {} };
    expect(formatChatSender(msg)).toBe('Unknown');
  });

  test('returns "Unknown" when sender fields are empty strings', () => {
    const msg = { sender: { displayName: '', name: '' } };
    // falsy empty strings fall through to 'Unknown'
    expect(formatChatSender(msg)).toBe('Unknown');
  });
});

// ── formatChatPreview ─────────────────────────────────────────────────────────

describe('formatChatPreview', () => {
  test('returns text as-is when within maxLen', () => {
    const msg = { text: 'Hello, team!' };
    expect(formatChatPreview(msg)).toBe('Hello, team!');
  });

  test('truncates text longer than maxLen and appends ellipsis', () => {
    const long = 'a'.repeat(100);
    const result = formatChatPreview({ text: long }, 80);
    expect(result).toHaveLength(81); // 80 chars + ellipsis char
    expect(result.endsWith('\u2026')).toBe(true);
  });

  test('returns "[attachment]" when msg.text is absent', () => {
    expect(formatChatPreview({ sender: { displayName: 'X' } })).toBe('[attachment]');
  });

  test('returns "[attachment]" when msg is null-like', () => {
    expect(formatChatPreview(null)).toBe('[attachment]');
  });

  test('respects custom maxLen', () => {
    const msg = { text: 'Hello world' };
    const result = formatChatPreview(msg, 5);
    expect(result).toBe('Hello\u2026');
  });

  test('text exactly at maxLen is NOT truncated', () => {
    const msg = { text: 'a'.repeat(80) };
    const result = formatChatPreview(msg, 80);
    expect(result).toBe('a'.repeat(80));
    expect(result.endsWith('\u2026')).toBe(false);
  });
});

// ── buildChatNotifications ────────────────────────────────────────────────────

describe('buildChatNotifications', () => {
  const now = 1700000000000;

  const makeMsg = (overrides = {}) => ({
    name: 'spaces/abc/messages/123',
    createTime: new Date(now + 10000).toISOString(),
    text: 'Hey, check this out!',
    sender: { displayName: 'Carmen Alcantara' },
    spaceName: 'Programs Team',
    ...overrides,
  });

  test('returns empty array when no messages are newer than lastPollMs', () => {
    const old = makeMsg({ createTime: new Date(now - 1000).toISOString() });
    expect(buildChatNotifications([old], now)).toEqual([]);
  });

  test('returns notification for each new message', () => {
    const msgs = [
      makeMsg({ name: 'spaces/a/messages/1', createTime: new Date(now + 1000).toISOString() }),
      makeMsg({ name: 'spaces/a/messages/2', createTime: new Date(now + 2000).toISOString() }),
    ];
    const result = buildChatNotifications(msgs, now);
    expect(result).toHaveLength(2);
  });

  test('notification has correct shape', () => {
    const msg = makeMsg();
    const [notif] = buildChatNotifications([msg], now);
    expect(notif).toMatchObject({
      id: 'spaces/abc/messages/123',
      sender: 'Carmen Alcantara',
      preview: 'Hey, check this out!',
      spaceName: 'Programs Team',
    });
    expect(typeof notif.timestamp).toBe('number');
  });

  test('filters out old messages and keeps new ones', () => {
    const msgs = [
      makeMsg({ name: 'old', createTime: new Date(now - 5000).toISOString() }),
      makeMsg({ name: 'new', createTime: new Date(now + 5000).toISOString() }),
    ];
    const result = buildChatNotifications(msgs, now);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('new');
  });

  test('returns empty array for empty messages input', () => {
    expect(buildChatNotifications([], now)).toEqual([]);
  });

  test('uses spaceName from message', () => {
    const msg = makeMsg({ spaceName: 'Finance DM' });
    const [notif] = buildChatNotifications([msg], now);
    expect(notif.spaceName).toBe('Finance DM');
  });

  test('falls back to empty string when spaceName absent', () => {
    const msg = makeMsg();
    delete msg.spaceName;
    const [notif] = buildChatNotifications([msg], now);
    expect(notif.spaceName).toBe('');
  });

  test('truncates long message text in preview', () => {
    const msg = makeMsg({ text: 'x'.repeat(100) });
    const [notif] = buildChatNotifications([msg], now);
    expect(notif.preview.endsWith('\u2026')).toBe(true);
    expect(notif.preview).toHaveLength(81);
  });
});

// ── chatProviderFor ───────────────────────────────────────────────────────────

describe('chatProviderFor', () => {
  const providers = [
    { id: 'google-chat', name: 'Google Chat', apiPath: '/api/chat-messages', icon: '💬' },
    { id: 'slack', name: 'Slack', apiPath: '/api/slack-messages', icon: '💬' },
  ];

  test('returns provider config for known id', () => {
    const p = chatProviderFor('google-chat', providers);
    expect(p).not.toBeNull();
    expect(p.id).toBe('google-chat');
    expect(p.apiPath).toBe('/api/chat-messages');
  });

  test('returns null for unknown id', () => {
    expect(chatProviderFor('teams', providers)).toBeNull();
  });

  test('returns null for empty string id', () => {
    expect(chatProviderFor('', providers)).toBeNull();
  });

  test('returns slack provider when present', () => {
    const p = chatProviderFor('slack', providers);
    expect(p.name).toBe('Slack');
  });

  test('each provider has required fields', () => {
    providers.forEach(p => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('apiPath');
      expect(p).toHaveProperty('icon');
    });
  });

  test('CHAT_PROVIDERS default list contains google-chat', () => {
    const p = chatProviderFor('google-chat');
    expect(p).not.toBeNull();
    expect(p.id).toBe('google-chat');
  });
});

// ── provider config shape ─────────────────────────────────────────────────────

describe('CHAT_PROVIDERS config shape', () => {
  test('has at least one provider', () => {
    expect(CHAT_PROVIDERS.length).toBeGreaterThan(0);
  });

  test('first provider is google-chat', () => {
    expect(CHAT_PROVIDERS[0].id).toBe('google-chat');
  });

  test('google-chat apiPath points to /api/chat-messages', () => {
    expect(CHAT_PROVIDERS[0].apiPath).toBe('/api/chat-messages');
  });

  test('all providers have icon field', () => {
    CHAT_PROVIDERS.forEach(p => {
      expect(typeof p.icon).toBe('string');
      expect(p.icon.length).toBeGreaterThan(0);
    });
  });
});
