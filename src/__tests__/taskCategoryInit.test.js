/**
 * Task category initialization — issue #92
 * Tests: getTaskFormCategory
 *
 * When the user clicks the "+" button inside a category card on the task board,
 * the TaskForm should open with that category pre-selected.
 * getTaskFormCategory resolves the initial category from the formState object
 * stored in showTaskForm state.
 */

// ── Pure helper (duplicated inline — project pattern) ─────────────────────────

function getTaskFormCategory(formState, defaultCat) {
  const fallback = defaultCat || "admin";
  if (!formState) return fallback;
  return formState.category || fallback;
}

// ── getTaskFormCategory ───────────────────────────────────────────────────────

describe('getTaskFormCategory', () => {
  test('null formState → admin', () => {
    expect(getTaskFormCategory(null)).toBe('admin');
  });

  test('undefined formState → admin', () => {
    expect(getTaskFormCategory(undefined)).toBe('admin');
  });

  test('empty formState → admin', () => {
    expect(getTaskFormCategory({})).toBe('admin');
  });

  test('formState with category → that category', () => {
    expect(getTaskFormCategory({ category: 'programs' })).toBe('programs');
  });

  test('formState with finance category → finance', () => {
    expect(getTaskFormCategory({ category: 'finance' })).toBe('finance');
  });

  test('formState with board category → board', () => {
    expect(getTaskFormCategory({ category: 'board' })).toBe('board');
  });

  test('formState with prefillFromEmail but no category → admin', () => {
    expect(getTaskFormCategory({ prefillFromEmail: { subject: 'Hello' } })).toBe('admin');
  });

  test('formState with both category and prefillFromEmail → category wins', () => {
    expect(getTaskFormCategory({ category: 'fundraising', prefillFromEmail: {} })).toBe('fundraising');
  });

  test('custom defaultCat used when formState has no category', () => {
    expect(getTaskFormCategory({}, 'programs')).toBe('programs');
  });

  test('custom defaultCat ignored when formState has a category', () => {
    expect(getTaskFormCategory({ category: 'admin' }, 'programs')).toBe('admin');
  });

  test('custom section id preserved', () => {
    expect(getTaskFormCategory({ category: 'custom-1712345678' })).toBe('custom-1712345678');
  });

  test('empty string category falls back to default', () => {
    expect(getTaskFormCategory({ category: '' })).toBe('admin');
  });
});
