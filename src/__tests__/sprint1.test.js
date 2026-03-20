/**
 * Sprint 1 — Foundation & Power User Efficiency
 * Tests for: oldest-email-age calculation, keyboard shortcut tab mapping, badge count logic
 */

// ── Oldest waiting email ──────────────────────────────────────────────────────
// Mirrors the inline logic added to the Today tab
function oldestEmailAgeDays(emails) {
  if (!emails || !emails.length) return null;
  const dates = emails
    .map(e => {
      if (e.internalDate) return parseInt(e.internalDate);
      if (e.date) return new Date(e.date).getTime();
      return NaN;
    })
    .filter(ts => !isNaN(ts) && ts > 0);
  if (!dates.length) return null;
  const oldestMs = Math.min(...dates);
  return Math.floor((Date.now() - oldestMs) / (1000 * 60 * 60 * 24));
}

describe('oldestEmailAgeDays', () => {
  test('returns null for empty array', () => {
    expect(oldestEmailAgeDays([])).toBeNull();
  });

  test('returns null for null input', () => {
    expect(oldestEmailAgeDays(null)).toBeNull();
  });

  test('returns 0 for email sent today', () => {
    const email = { internalDate: String(Date.now()) };
    expect(oldestEmailAgeDays([email])).toBe(0);
  });

  test('returns correct days for email sent 3 days ago', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const email = { internalDate: String(threeDaysAgo) };
    expect(oldestEmailAgeDays([email])).toBe(3);
  });

  test('picks the oldest when multiple emails given', () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    const emails = [
      { internalDate: String(twoDaysAgo) },
      { internalDate: String(fiveDaysAgo) },
    ];
    expect(oldestEmailAgeDays(emails)).toBe(5);
  });

  test('handles date string format as fallback', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const email = { date: sevenDaysAgo };
    expect(oldestEmailAgeDays([email])).toBe(7);
  });

  test('skips emails with no date', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const emails = [
      { subject: 'no date email' },
      { internalDate: String(threeDaysAgo) },
    ];
    expect(oldestEmailAgeDays(emails)).toBe(3);
  });

  test('returns null when all emails have no parseable date', () => {
    expect(oldestEmailAgeDays([{ subject: 'no date' }, { from: 'nobody' }])).toBeNull();
  });
});

// ── Tab keyboard shortcut mapping ─────────────────────────────────────────────
const TAB_IDS = ['today', 'emails', 'calendar', 'tasks', 'drive', 'drafts', 'sticky'];

function tabIdForKey(key) {
  const n = parseInt(key);
  if (n >= 1 && n <= TAB_IDS.length) return TAB_IDS[n - 1];
  return null;
}

describe('tabIdForKey', () => {
  test('key "1" → "today"', () => expect(tabIdForKey('1')).toBe('today'));
  test('key "2" → "emails"', () => expect(tabIdForKey('2')).toBe('emails'));
  test('key "3" → "calendar"', () => expect(tabIdForKey('3')).toBe('calendar'));
  test('key "4" → "tasks"', () => expect(tabIdForKey('4')).toBe('tasks'));
  test('key "5" → "drive"', () => expect(tabIdForKey('5')).toBe('drive'));
  test('key "6" → "drafts"', () => expect(tabIdForKey('6')).toBe('drafts'));
  test('key "7" → "sticky"', () => expect(tabIdForKey('7')).toBe('sticky'));
  test('key "0" → null', () => expect(tabIdForKey('0')).toBeNull());
  test('key "8" → null (out of range)', () => expect(tabIdForKey('8')).toBeNull());
  test('key "a" → null (non-numeric)', () => expect(tabIdForKey('a')).toBeNull());
});

// ── Badge count logic ─────────────────────────────────────────────────────────
function pendingTaskCount(tasks) {
  return (tasks || []).filter(t => !t.done).length;
}

describe('pendingTaskCount', () => {
  test('returns 0 for empty list', () => expect(pendingTaskCount([])).toBe(0));
  test('returns 0 for null', () => expect(pendingTaskCount(null)).toBe(0));
  test('counts only undone tasks', () => {
    const tasks = [
      { id: 1, done: false },
      { id: 2, done: true },
      { id: 3, done: false },
    ];
    expect(pendingTaskCount(tasks)).toBe(2);
  });
  test('returns total when all undone', () => {
    const tasks = [{ id: 1, done: false }, { id: 2, done: false }];
    expect(pendingTaskCount(tasks)).toBe(2);
  });
  test('returns 0 when all done', () => {
    const tasks = [{ id: 1, done: true }, { id: 2, done: true }];
    expect(pendingTaskCount(tasks)).toBe(0);
  });
});
