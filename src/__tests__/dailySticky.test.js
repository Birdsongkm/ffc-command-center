const { localDateKey, dailyStickyKey, loadDailySticky, saveDailySticky } = require('../lib/dailySticky');

describe('dailySticky', () => {
  describe('localDateKey', () => {
    test('formats date as YYYY-MM-DD', () => {
      expect(localDateKey(new Date(2026, 4, 5))).toBe('2026-05-05');
    });
    test('zero-pads single-digit months and days', () => {
      expect(localDateKey(new Date(2026, 0, 9))).toBe('2026-01-09');
    });
    test('uses current date when called with no arg', () => {
      const k = localDateKey();
      expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('dailyStickyKey', () => {
    test('prefixes with ffc_daily_sticky_', () => {
      expect(dailyStickyKey(new Date(2026, 4, 5))).toBe('ffc_daily_sticky_2026-05-05');
    });
    test('produces different keys for different days', () => {
      const a = dailyStickyKey(new Date(2026, 4, 5));
      const b = dailyStickyKey(new Date(2026, 4, 6));
      expect(a).not.toBe(b);
    });
  });

  describe('loadDailySticky / saveDailySticky', () => {
    function makeStorage() {
      const data = {};
      return {
        getItem: k => (k in data ? data[k] : null),
        setItem: (k, v) => { data[k] = String(v); },
        _data: data,
      };
    }

    test('round-trips text for a given date', () => {
      const s = makeStorage();
      const d = new Date(2026, 4, 5);
      saveDailySticky(s, d, 'milk\neggs\ncall Pat');
      expect(loadDailySticky(s, d)).toBe('milk\neggs\ncall Pat');
    });

    test('returns empty string when nothing stored for that date', () => {
      const s = makeStorage();
      expect(loadDailySticky(s, new Date(2026, 4, 5))).toBe('');
    });

    test('isolates content between days', () => {
      const s = makeStorage();
      saveDailySticky(s, new Date(2026, 4, 5), 'monday list');
      saveDailySticky(s, new Date(2026, 4, 6), 'tuesday list');
      expect(loadDailySticky(s, new Date(2026, 4, 5))).toBe('monday list');
      expect(loadDailySticky(s, new Date(2026, 4, 6))).toBe('tuesday list');
    });

    test('handles null storage gracefully (SSR)', () => {
      expect(loadDailySticky(null, new Date())).toBe('');
      expect(() => saveDailySticky(null, new Date(), 'x')).not.toThrow();
    });

    test('swallows storage exceptions (quota / disabled)', () => {
      const broken = {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('quota'); },
      };
      expect(loadDailySticky(broken, new Date())).toBe('');
      expect(() => saveDailySticky(broken, new Date(), 'x')).not.toThrow();
    });
  });
});
