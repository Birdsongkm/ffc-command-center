// Daily post-it sticky note — keyed per local-date so each day starts fresh.
// Prior days' content stays in localStorage (not auto-deleted) but is not surfaced.

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function localDateKey(date) {
  const d = date instanceof Date ? date : new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function dailyStickyKey(date) {
  return 'ffc_daily_sticky_' + localDateKey(date);
}

function loadDailySticky(storage, date) {
  if (!storage) return '';
  try { return storage.getItem(dailyStickyKey(date)) || ''; } catch { return ''; }
}

function saveDailySticky(storage, date, text) {
  if (!storage) return;
  try { storage.setItem(dailyStickyKey(date), text); } catch {}
}

module.exports = { localDateKey, dailyStickyKey, loadDailySticky, saveDailySticky };
