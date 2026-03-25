/**
 * Undo delete/archive — issue #87
 * Tests: undoActionFor, isUndoableEmailAction, buildUndoToastMessage,
 *        and the email-actions API route additions (untrash, unarchive).
 */

// ── Pure helpers (duplicated inline — project pattern) ────────────────────────

function undoActionFor(action) {
  if (action === 'trash') return 'untrash';
  if (action === 'archive') return 'unarchive';
  return null;
}

function isUndoableEmailAction(action) {
  return action === 'trash' || action === 'archive';
}

function buildUndoToastMessage(action) {
  if (action === 'trash') return 'Deleted';
  if (action === 'archive') return 'Archived';
  return 'Done';
}

// ── undoActionFor ─────────────────────────────────────────────────────────────

describe('undoActionFor', () => {
  test('trash → untrash', () => {
    expect(undoActionFor('trash')).toBe('untrash');
  });

  test('archive → unarchive', () => {
    expect(undoActionFor('archive')).toBe('unarchive');
  });

  test('markRead → null (not undoable)', () => {
    expect(undoActionFor('markRead')).toBeNull();
  });

  test('snooze → null (not undoable)', () => {
    expect(undoActionFor('snooze')).toBeNull();
  });

  test('star → null (not undoable)', () => {
    expect(undoActionFor('star')).toBeNull();
  });

  test('unknown action → null', () => {
    expect(undoActionFor('something')).toBeNull();
  });
});

// ── isUndoableEmailAction ──────────────────────────────────────────────────────

describe('isUndoableEmailAction', () => {
  test('trash is undoable', () => {
    expect(isUndoableEmailAction('trash')).toBe(true);
  });

  test('archive is undoable', () => {
    expect(isUndoableEmailAction('archive')).toBe(true);
  });

  test('markRead is NOT undoable', () => {
    expect(isUndoableEmailAction('markRead')).toBe(false);
  });

  test('snooze is NOT undoable', () => {
    expect(isUndoableEmailAction('snooze')).toBe(false);
  });

  test('star is NOT undoable', () => {
    expect(isUndoableEmailAction('star')).toBe(false);
  });

  test('unstar is NOT undoable', () => {
    expect(isUndoableEmailAction('unstar')).toBe(false);
  });
});

// ── buildUndoToastMessage ─────────────────────────────────────────────────────

describe('buildUndoToastMessage', () => {
  test('trash → "Deleted"', () => {
    expect(buildUndoToastMessage('trash')).toBe('Deleted');
  });

  test('archive → "Archived"', () => {
    expect(buildUndoToastMessage('archive')).toBe('Archived');
  });

  test('fallback for unknown → "Done"', () => {
    expect(buildUndoToastMessage('markRead')).toBe('Done');
  });
});

// ── email restore logic ────────────────────────────────────────────────────────

describe('email restore logic', () => {
  // Simulates the client-side state update when undo is triggered:
  // the removed email is re-prepended to the list.

  function removeEmail(emails, id) {
    return emails.filter(e => e.id !== id);
  }

  function restoreEmail(emails, email) {
    // Prepend restored email; avoid duplicate if somehow still present
    if (emails.some(e => e.id === email.id)) return emails;
    return [email, ...emails];
  }

  const mockEmails = [
    { id: 'msg1', subject: 'Hello', from: 'a@b.com' },
    { id: 'msg2', subject: 'World', from: 'c@d.com' },
    { id: 'msg3', subject: 'FYI',   from: 'e@f.com' },
  ];

  test('removeEmail removes the correct email', () => {
    const result = removeEmail(mockEmails, 'msg2');
    expect(result).toHaveLength(2);
    expect(result.find(e => e.id === 'msg2')).toBeUndefined();
  });

  test('removeEmail leaves other emails intact', () => {
    const result = removeEmail(mockEmails, 'msg1');
    expect(result.map(e => e.id)).toEqual(['msg2', 'msg3']);
  });

  test('restoreEmail prepends the email back', () => {
    const afterRemove = removeEmail(mockEmails, 'msg2');
    const afterRestore = restoreEmail(afterRemove, mockEmails[1]);
    expect(afterRestore[0].id).toBe('msg2');
    expect(afterRestore).toHaveLength(3);
  });

  test('restoreEmail does not duplicate if email already present', () => {
    const email = mockEmails[0];
    const result = restoreEmail(mockEmails, email);
    expect(result).toHaveLength(3); // no duplicate
  });

  test('restoreEmail after full removal gives a 1-element list', () => {
    const single = [{ id: 'only', subject: 'One', from: 'x@y.com' }];
    const afterRemove = removeEmail(single, 'only');
    expect(afterRemove).toHaveLength(0);
    const afterRestore = restoreEmail(afterRemove, single[0]);
    expect(afterRestore).toHaveLength(1);
    expect(afterRestore[0].id).toBe('only');
  });
});

// ── toast with undo — state shape ────────────────────────────────────────────

describe('toast state shape', () => {
  // The toast state upgrades from `string | null` to `{ message, onUndo } | null`.
  // This tests the shape helpers for building toast data.

  function makeToast(message, onUndo = null) {
    return { message, onUndo };
  }

  function hasUndo(toast) {
    return !!(toast && toast.onUndo);
  }

  test('makeToast with message only — no undo', () => {
    const t = makeToast('Email sent!');
    expect(t.message).toBe('Email sent!');
    expect(t.onUndo).toBeNull();
    expect(hasUndo(t)).toBe(false);
  });

  test('makeToast with onUndo function — has undo', () => {
    const fn = () => {};
    const t = makeToast('Deleted', fn);
    expect(t.message).toBe('Deleted');
    expect(t.onUndo).toBe(fn);
    expect(hasUndo(t)).toBe(true);
  });

  test('hasUndo returns false for null toast', () => {
    expect(hasUndo(null)).toBe(false);
  });

  test('hasUndo returns false for toast without onUndo', () => {
    expect(hasUndo({ message: 'Done', onUndo: null })).toBe(false);
  });
});
