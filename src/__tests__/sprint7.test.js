/**
 * Sprint 7 — Intelligence & Clarity + User Issues #63–68
 *
 * Tests for:
 * - groupAgendaItems(items) → items grouped by assignee
 * - driveFileIcon(mimeType) → emoji icon for Drive file type
 * - getAutoScrollSpeed(clientY, windowHeight) → autoscroll speed
 */

// ── getScheduledTimeLabel ─────────────────────────────────────────────────────
function getScheduledTimeLabel(scheduledAt) {
  const now = Date.now();
  const diff = scheduledAt - now;
  if (diff <= 0) return 'Sending now…';
  const mins = Math.round(diff / 60000);
  const hrs = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);
  if (mins < 60) return `Sends in ${mins}m`;
  if (hrs < 24) return `Sends in ${hrs}h`;
  return `Sends in ${days}d`;
}

describe("getScheduledTimeLabel", () => {
  test("past time shows 'Sending now…'", () => {
    expect(getScheduledTimeLabel(Date.now() - 1000)).toBe('Sending now…');
  });
  test("30 minutes out", () => {
    expect(getScheduledTimeLabel(Date.now() + 30 * 60 * 1000)).toBe('Sends in 30m');
  });
  test("3 hours out", () => {
    expect(getScheduledTimeLabel(Date.now() + 3 * 3600 * 1000)).toBe('Sends in 3h');
  });
  test("2 days out", () => {
    expect(getScheduledTimeLabel(Date.now() + 2 * 86400 * 1000)).toBe('Sends in 2d');
  });
});

// ── groupAgendaItems ──────────────────────────────────────────────────────────
function groupAgendaItems(items) {
  const groups = {};
  (items || []).forEach(item => {
    const key = item.assignee || 'General';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

describe("groupAgendaItems", () => {
  test("empty array returns empty object", () => {
    expect(groupAgendaItems([])).toEqual({});
  });
  test("null returns empty object", () => {
    expect(groupAgendaItems(null)).toEqual({});
  });
  test("unassigned items go to General", () => {
    const items = [{ id: '1', text: 'Review budget', assignee: '' }];
    expect(groupAgendaItems(items)).toEqual({ General: [{ id: '1', text: 'Review budget', assignee: '' }] });
  });
  test("items grouped by assignee name", () => {
    const items = [
      { id: '1', text: 'Q1 recap', assignee: 'Laura' },
      { id: '2', text: 'Follow up grant', assignee: 'Brittany' },
      { id: '3', text: 'Budget review', assignee: 'Laura' },
    ];
    const g = groupAgendaItems(items);
    expect(g['Laura']).toHaveLength(2);
    expect(g['Brittany']).toHaveLength(1);
  });
  test("mixed assigned and unassigned", () => {
    const items = [
      { id: '1', text: 'General note', assignee: '' },
      { id: '2', text: 'Task for Gretchen', assignee: 'Gretchen' },
    ];
    const g = groupAgendaItems(items);
    expect(Object.keys(g)).toContain('General');
    expect(Object.keys(g)).toContain('Gretchen');
  });
});

// ── driveFileIcon ─────────────────────────────────────────────────────────────
function driveFileIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType === 'application/vnd.google-apps.folder') return '📁';
  if (mimeType === 'application/vnd.google-apps.document') return '📝';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return '📊';
  if (mimeType === 'application/vnd.google-apps.presentation') return '📽';
  if (mimeType === 'application/pdf') return '📕';
  return '📄';
}

// ── getAutoScrollSpeed ────────────────────────────────────────────────────────
// Returns scroll speed (px/frame) based on cursor position in viewport.
// Positive = scroll down, negative = scroll up, 0 = no scroll.
function getAutoScrollSpeed(clientY, windowHeight, edgeThreshold = 70) {
  if (clientY < edgeThreshold) {
    // Near top — scroll up, faster as cursor moves closer to edge
    return -Math.round((1 - clientY / edgeThreshold) * 12);
  }
  if (clientY > windowHeight - edgeThreshold) {
    // Near bottom — scroll down
    return Math.round((1 - (windowHeight - clientY) / edgeThreshold) * 12);
  }
  return 0;
}

describe("getAutoScrollSpeed", () => {
  const H = 800; // mock window height

  test("cursor in safe zone — no scroll", () => {
    expect(getAutoScrollSpeed(400, H)).toBe(0);
  });
  test("cursor at exact edge threshold — no scroll", () => {
    expect(getAutoScrollSpeed(70, H)).toBe(0);
    expect(getAutoScrollSpeed(H - 70, H)).toBe(0);
  });
  test("cursor above top threshold — scroll up (negative)", () => {
    expect(getAutoScrollSpeed(35, H)).toBeLessThan(0);
  });
  test("cursor at very top — max scroll up speed", () => {
    expect(getAutoScrollSpeed(0, H)).toBe(-12);
  });
  test("cursor below bottom threshold — scroll down (positive)", () => {
    expect(getAutoScrollSpeed(H - 35, H)).toBeGreaterThan(0);
  });
  test("cursor at very bottom — max scroll down speed", () => {
    expect(getAutoScrollSpeed(H, H)).toBe(12);
  });
  test("speed increases as cursor approaches top edge", () => {
    const slow = getAutoScrollSpeed(60, H);
    const fast = getAutoScrollSpeed(20, H);
    expect(fast).toBeLessThan(slow); // more negative = faster up
  });
});

describe("driveFileIcon", () => {
  test("folder", () => {
    expect(driveFileIcon('application/vnd.google-apps.folder')).toBe('📁');
  });
  test("google doc", () => {
    expect(driveFileIcon('application/vnd.google-apps.document')).toBe('📝');
  });
  test("google sheet", () => {
    expect(driveFileIcon('application/vnd.google-apps.spreadsheet')).toBe('📊');
  });
  test("google slides", () => {
    expect(driveFileIcon('application/vnd.google-apps.presentation')).toBe('📽');
  });
  test("pdf", () => {
    expect(driveFileIcon('application/pdf')).toBe('📕');
  });
  test("unknown type falls back to generic", () => {
    expect(driveFileIcon('image/png')).toBe('📄');
  });
  test("null/undefined falls back to generic", () => {
    expect(driveFileIcon(null)).toBe('📄');
    expect(driveFileIcon(undefined)).toBe('📄');
  });
});
