/**
 * Issue #17 — Email multi-select logic
 */

function toggleEmailSelection(selectedIds, emailId) {
  const next = new Set(selectedIds);
  if (next.has(emailId)) next.delete(emailId);
  else next.add(emailId);
  return next;
}

function selectAll(selectedIds, bucketEmails) {
  const next = new Set(selectedIds);
  bucketEmails.forEach(e => next.add(e.id));
  return next;
}

function deselectAll(selectedIds, bucketEmails) {
  const next = new Set(selectedIds);
  bucketEmails.forEach(e => next.delete(e.id));
  return next;
}

function isBucketAllSelected(selectedIds, bucketEmails) {
  return bucketEmails.length > 0 && bucketEmails.every(e => selectedIds.has(e.id));
}

describe('toggleEmailSelection', () => {
  test('adds email when not selected', () => {
    const result = toggleEmailSelection(new Set(), 'email-1');
    expect(result.has('email-1')).toBe(true);
  });

  test('removes email when already selected', () => {
    const result = toggleEmailSelection(new Set(['email-1']), 'email-1');
    expect(result.has('email-1')).toBe(false);
  });

  test('does not mutate original set', () => {
    const original = new Set(['email-1']);
    toggleEmailSelection(original, 'email-2');
    expect(original.size).toBe(1);
  });

  test('can select multiple emails', () => {
    let sel = new Set();
    sel = toggleEmailSelection(sel, 'a');
    sel = toggleEmailSelection(sel, 'b');
    sel = toggleEmailSelection(sel, 'c');
    expect(sel.size).toBe(3);
  });

  test('toggling same email twice returns to empty', () => {
    let sel = new Set();
    sel = toggleEmailSelection(sel, 'a');
    sel = toggleEmailSelection(sel, 'a');
    expect(sel.size).toBe(0);
  });
});

describe('selectAll / deselectAll', () => {
  const emails = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  test('selectAll adds all bucket emails to selection', () => {
    const result = selectAll(new Set(), emails);
    expect(result.size).toBe(3);
    expect(result.has('a')).toBe(true);
    expect(result.has('c')).toBe(true);
  });

  test('selectAll preserves existing selections from other buckets', () => {
    const result = selectAll(new Set(['x', 'y']), emails);
    expect(result.has('x')).toBe(true);
    expect(result.has('a')).toBe(true);
    expect(result.size).toBe(5);
  });

  test('deselectAll removes only bucket emails', () => {
    const result = deselectAll(new Set(['a', 'b', 'x']), emails);
    expect(result.has('a')).toBe(false);
    expect(result.has('b')).toBe(false);
    expect(result.has('x')).toBe(true);
  });

  test('deselectAll on empty set is a no-op', () => {
    expect(deselectAll(new Set(), emails).size).toBe(0);
  });
});

describe('isBucketAllSelected', () => {
  const emails = [{ id: 'a' }, { id: 'b' }];

  test('true when all bucket emails selected', () => {
    expect(isBucketAllSelected(new Set(['a', 'b']), emails)).toBe(true);
  });

  test('false when only some selected', () => {
    expect(isBucketAllSelected(new Set(['a']), emails)).toBe(false);
  });

  test('false when none selected', () => {
    expect(isBucketAllSelected(new Set(), emails)).toBe(false);
  });

  test('false for empty bucket', () => {
    expect(isBucketAllSelected(new Set(['a']), [])).toBe(false);
  });
});
