/**
 * Resizable panels tests — issue #104
 * Tests: panel size calculation, persistence structure, resize constraints.
 */

function clampPanelSize(dir, startW, startH, dx, dy) {
  const newW = dir === 'right' || dir === 'both' ? Math.max(280, startW + dx) : startW;
  const newH = dir === 'bottom' || dir === 'both' ? Math.max(100, startH + dy) : startH;
  return { width: newW, height: newH };
}

function mergePanelSize(existing, key, newSize) {
  return { ...existing, [key]: newSize };
}

function removePanelSize(existing, key) {
  const updated = { ...existing };
  delete updated[key];
  return updated;
}

describe("clampPanelSize", () => {
  test("horizontal resize respects min width 280", () => {
    const s = clampPanelSize('right', 400, 300, -200, 0);
    expect(s.width).toBe(280);
    expect(s.height).toBe(300);
  });

  test("vertical resize respects min height 100", () => {
    const s = clampPanelSize('bottom', 400, 200, 0, -150);
    expect(s.width).toBe(400);
    expect(s.height).toBe(100);
  });

  test("horizontal resize grows correctly", () => {
    const s = clampPanelSize('right', 400, 300, 100, 0);
    expect(s.width).toBe(500);
    expect(s.height).toBe(300);
  });

  test("vertical resize grows correctly", () => {
    const s = clampPanelSize('bottom', 400, 200, 0, 50);
    expect(s.height).toBe(250);
  });

  test("both direction resize", () => {
    const s = clampPanelSize('both', 400, 200, 50, 30);
    expect(s.width).toBe(450);
    expect(s.height).toBe(230);
  });

  test("vertical-only ignores dx", () => {
    const s = clampPanelSize('bottom', 400, 200, 999, 50);
    expect(s.width).toBe(400);
    expect(s.height).toBe(250);
  });

  test("horizontal-only ignores dy", () => {
    const s = clampPanelSize('right', 400, 200, 50, 999);
    expect(s.width).toBe(450);
    expect(s.height).toBe(200);
  });
});

describe("mergePanelSize", () => {
  test("adds new panel size", () => {
    const r = mergePanelSize({}, 'email-team', { width: 500, height: 200 });
    expect(r['email-team']).toEqual({ width: 500, height: 200 });
  });

  test("updates existing panel size", () => {
    const r = mergePanelSize({ 'email-team': { width: 400, height: 150 } }, 'email-team', { width: 600, height: 300 });
    expect(r['email-team']).toEqual({ width: 600, height: 300 });
  });

  test("preserves other panels", () => {
    const existing = { 'email-team': { width: 400, height: 150 }, 'section-calendar': { width: 800, height: 400 } };
    const r = mergePanelSize(existing, 'email-team', { width: 500, height: 200 });
    expect(r['section-calendar']).toEqual({ width: 800, height: 400 });
  });

  test("does not mutate original", () => {
    const original = { 'email-team': { width: 400, height: 150 } };
    mergePanelSize(original, 'email-sales', { width: 300, height: 120 });
    expect(original).not.toHaveProperty('email-sales');
  });
});

describe("removePanelSize", () => {
  test("removes a panel size", () => {
    const r = removePanelSize({ 'email-team': { width: 400, height: 150 } }, 'email-team');
    expect(r).not.toHaveProperty('email-team');
  });

  test("preserves other panels", () => {
    const r = removePanelSize({ a: { width: 1, height: 1 }, b: { width: 2, height: 2 } }, 'a');
    expect(r).toEqual({ b: { width: 2, height: 2 } });
  });

  test("handles removing non-existent key", () => {
    const r = removePanelSize({ a: { width: 1, height: 1 } }, 'b');
    expect(r).toEqual({ a: { width: 1, height: 1 } });
  });

  test("does not mutate original", () => {
    const original = { a: { width: 1, height: 1 } };
    removePanelSize(original, 'a');
    expect(original).toHaveProperty('a');
  });
});
