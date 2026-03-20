/**
 * Issue #13 — Sender avatar initials + color
 * Issue #14 — Suggested action learning
 */

// ── senderAvatar ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#4A9B4A","#3B82C4","#C4942A","#D45555","#7C5AC4","#3A9B5A","#C44A8B","#C47A3A"];

function senderAvatar(from) {
  const name = (from || "").replace(/<.*>/, "").trim() || "?";
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || "?").toUpperCase();
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return { initials, color };
}

describe('senderAvatar', () => {
  test('two-word name → first + last initials', () => {
    expect(senderAvatar("John Smith").initials).toBe("JS");
  });

  test('three-word name → first + last initials', () => {
    expect(senderAvatar("Mary Jo Doe").initials).toBe("MD");
  });

  test('single word → single initial', () => {
    expect(senderAvatar("Kayla").initials).toBe("K");
  });

  test('email with display name → extracts name', () => {
    expect(senderAvatar("Alice Brown <alice@example.com>").initials).toBe("AB");
  });

  test('bare email address → uses first char', () => {
    expect(senderAvatar("alice@example.com").initials).toBe("A");
  });

  test('empty string → fallback ?', () => {
    expect(senderAvatar("").initials).toBe("?");
  });

  test('null → fallback ?', () => {
    expect(senderAvatar(null).initials).toBe("?");
  });

  test('returns a color from the palette', () => {
    const { color } = senderAvatar("John Smith");
    expect(AVATAR_COLORS).toContain(color);
  });

  test('same sender always gets same color (deterministic)', () => {
    expect(senderAvatar("Alice Brown").color).toBe(senderAvatar("Alice Brown").color);
  });

  test('different senders can get different colors', () => {
    const colors = ["Alice Brown", "Bob Jones", "Carol Lee", "Dan Wu", "Eve Fox", "Frank Adams", "Grace Hill", "Hank Moon"]
      .map(n => senderAvatar(n).color);
    const unique = new Set(colors);
    expect(unique.size).toBeGreaterThan(1);
  });

  test('initials are uppercase', () => {
    const { initials } = senderAvatar("lowercase name");
    expect(initials).toBe(initials.toUpperCase());
  });
});

// ── recordEmailAction ─────────────────────────────────────────────────────────
function recordEmailAction(history, bucket, action) {
  const updated = { ...history };
  if (!updated[bucket]) updated[bucket] = {};
  updated[bucket] = { ...updated[bucket], [action]: (updated[bucket][action] || 0) + 1 };
  return updated;
}

describe('recordEmailAction', () => {
  test('records first action for a bucket', () => {
    const result = recordEmailAction({}, 'needs-response', 'archive');
    expect(result['needs-response']['archive']).toBe(1);
  });

  test('increments existing count', () => {
    const history = { 'needs-response': { archive: 2 } };
    expect(recordEmailAction(history, 'needs-response', 'archive')['needs-response']['archive']).toBe(3);
  });

  test('tracks multiple actions per bucket', () => {
    let h = {};
    h = recordEmailAction(h, 'automated', 'trash');
    h = recordEmailAction(h, 'automated', 'trash');
    h = recordEmailAction(h, 'automated', 'markRead');
    expect(h['automated']['trash']).toBe(2);
    expect(h['automated']['markRead']).toBe(1);
  });

  test('does not mutate original history', () => {
    const original = { 'team': { archive: 1 } };
    recordEmailAction(original, 'team', 'archive');
    expect(original['team']['archive']).toBe(1);
  });

  test('handles multiple buckets independently', () => {
    let h = {};
    h = recordEmailAction(h, 'newsletter', 'trash');
    h = recordEmailAction(h, 'automated', 'archive');
    expect(h['newsletter']['trash']).toBe(1);
    expect(h['automated']['archive']).toBe(1);
    expect(h['newsletter']['archive']).toBeUndefined();
  });
});

// ── getSuggestedAction ────────────────────────────────────────────────────────
function getSuggestedAction(history, bucket, threshold = 3) {
  const bh = history?.[bucket];
  if (!bh) return null;
  const entries = Object.entries(bh);
  if (!entries.length) return null;
  const [topAction, count] = entries.sort(([, a], [, b]) => b - a)[0];
  if (count < threshold) return null;
  return { action: topAction, count };
}

describe('getSuggestedAction', () => {
  test('returns null for empty history', () => {
    expect(getSuggestedAction({}, 'needs-response')).toBeNull();
  });

  test('returns null for null history', () => {
    expect(getSuggestedAction(null, 'needs-response')).toBeNull();
  });

  test('returns null when count below threshold', () => {
    const h = { 'automated': { trash: 2 } };
    expect(getSuggestedAction(h, 'automated', 3)).toBeNull();
  });

  test('returns suggestion when count meets threshold', () => {
    const h = { 'automated': { trash: 3 } };
    const result = getSuggestedAction(h, 'automated', 3);
    expect(result).toEqual({ action: 'trash', count: 3 });
  });

  test('returns most frequent action', () => {
    const h = { 'newsletter': { trash: 5, archive: 2, markRead: 1 } };
    expect(getSuggestedAction(h, 'newsletter', 3)?.action).toBe('trash');
  });

  test('returns null for unknown bucket', () => {
    const h = { 'team': { archive: 10 } };
    expect(getSuggestedAction(h, 'needs-response')).toBeNull();
  });

  test('custom threshold respected', () => {
    const h = { 'team': { archive: 5 } };
    expect(getSuggestedAction(h, 'team', 10)).toBeNull();
    expect(getSuggestedAction(h, 'team', 5)).toEqual({ action: 'archive', count: 5 });
  });
});
