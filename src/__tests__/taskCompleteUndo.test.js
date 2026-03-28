/**
 * Task complete undo — issue #93
 * Tests: getTaskToggleToast
 *
 * When a task is marked done, the Toast should show an Undo button so the user
 * can reverse the action. When a task is re-opened (done → false), no undo is
 * needed — just a simple confirmation message.
 */

// ── Pure helper (duplicated inline — project pattern) ─────────────────────────

function getTaskToggleToast(currentlyDone) {
  if (currentlyDone) {
    // Task was done, user is re-opening it
    return { message: "Task reopened", hasUndo: false };
  }
  // Task was not done, user is marking it complete — offer undo
  return { message: "Task completed!", hasUndo: true };
}

// ── getTaskToggleToast ────────────────────────────────────────────────────────

describe('getTaskToggleToast', () => {
  test('marking done (not done → done): message is "Task completed!"', () => {
    expect(getTaskToggleToast(false).message).toBe('Task completed!');
  });

  test('marking done: hasUndo is true', () => {
    expect(getTaskToggleToast(false).hasUndo).toBe(true);
  });

  test('reopening (done → not done): message is "Task reopened"', () => {
    expect(getTaskToggleToast(true).message).toBe('Task reopened');
  });

  test('reopening: hasUndo is false', () => {
    expect(getTaskToggleToast(true).hasUndo).toBe(false);
  });

  test('marking done returns a new object each call', () => {
    const a = getTaskToggleToast(false);
    const b = getTaskToggleToast(false);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  test('result shape: message is a string', () => {
    expect(typeof getTaskToggleToast(false).message).toBe('string');
    expect(typeof getTaskToggleToast(true).message).toBe('string');
  });

  test('result shape: hasUndo is a boolean', () => {
    expect(typeof getTaskToggleToast(false).hasUndo).toBe('boolean');
    expect(typeof getTaskToggleToast(true).hasUndo).toBe('boolean');
  });

  test('marking done — message is non-empty', () => {
    expect(getTaskToggleToast(false).message.length).toBeGreaterThan(0);
  });

  test('reopening — message is non-empty', () => {
    expect(getTaskToggleToast(true).message.length).toBeGreaterThan(0);
  });
});
