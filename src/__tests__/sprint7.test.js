/**
 * Sprint 7 — Intelligence & Clarity + User Issues #63–75
 *
 * Tests for:
 * - groupAgendaItems(items) → items grouped by assignee
 * - driveFileIcon(mimeType) → emoji icon for Drive file type
 * - getAutoScrollSpeed(clientY, windowHeight) → autoscroll speed
 * - parseAddressField(str) → parse comma-separated email addresses (#75)
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

// ── parseAddressField (#75) ───────────────────────────────────────────────────
// Parses a comma-separated header field (To / CC) into { name, email } objects.
function parseAddressField(str) {
  if (!str) return [];
  return str.split(",").flatMap(part => {
    part = part.trim();
    const match = part.match(/^(.*?)\s*<(.+?)>$/);
    if (match) {
      const name = match[1].replace(/"/g, "").trim();
      const addr = match[2].trim().toLowerCase();
      return addr ? [{ name: name || addr, email: addr }] : [];
    }
    if (part.includes("@")) return [{ name: part.toLowerCase(), email: part.toLowerCase() }];
    return [];
  });
}

describe("parseAddressField", () => {
  test("empty / null returns empty array", () => {
    expect(parseAddressField("")).toEqual([]);
    expect(parseAddressField(null)).toEqual([]);
    expect(parseAddressField(undefined)).toEqual([]);
  });

  test("plain email address", () => {
    const result = parseAddressField("kayla@freshfoodconnect.org");
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("kayla@freshfoodconnect.org");
    expect(result[0].name).toBe("kayla@freshfoodconnect.org");
  });

  test("display name + angle-bracket email", () => {
    const result = parseAddressField("Laura Smith <laura@freshfoodconnect.org>");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Laura Smith");
    expect(result[0].email).toBe("laura@freshfoodconnect.org");
  });

  test("quoted display name", () => {
    const result = parseAddressField('"Brittany Jones" <brittany@example.org>');
    expect(result[0].name).toBe("Brittany Jones");
    expect(result[0].email).toBe("brittany@example.org");
  });

  test("multiple comma-separated addresses", () => {
    const result = parseAddressField(
      "Laura Smith <laura@freshfoodconnect.org>, Gretchen <gretchen@example.com>"
    );
    expect(result).toHaveLength(2);
    expect(result.map(r => r.name)).toEqual(["Laura Smith", "Gretchen"]);
  });

  test("mixed plain and angle-bracket", () => {
    const result = parseAddressField("foo@bar.com, Baz Qux <baz@qux.com>");
    expect(result).toHaveLength(2);
    expect(result[0].email).toBe("foo@bar.com");
    expect(result[1].email).toBe("baz@qux.com");
  });

  test("email is lowercased", () => {
    const result = parseAddressField("KAYLA@FreshFoodConnect.ORG");
    expect(result[0].email).toBe("kayla@freshfoodconnect.org");
  });

  test("parts without @ are skipped", () => {
    const result = parseAddressField("not-an-email, Real <real@email.com>");
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("real@email.com");
  });
});

// ── getEventStatus (#77) ──────────────────────────────────────────────────────
// Returns event status relative to now: "inprogress", "soon", "upcoming", "past"
// "soon" = starts within 30 minutes
function getEventStatus(ev, now) {
  if (!ev || !ev.start) return "upcoming";
  const start = new Date(ev.start).getTime();
  const end = ev.end ? new Date(ev.end).getTime() : start + 3600000;
  const n = now || Date.now();
  if (n >= start && n < end) return "inprogress";
  if (start > n && start - n <= 30 * 60 * 1000) return "soon";
  if (n >= end) return "past";
  return "upcoming";
}

// Returns human-readable "In Xm" or "In Xh Xm" for future events
function minsUntil(ev, now) {
  const start = new Date(ev.start).getTime();
  const n = now || Date.now();
  const diffMs = start - n;
  if (diffMs <= 0) return "";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `In ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `In ${hrs}h ${rem}m` : `In ${hrs}h`;
}

describe("getEventStatus", () => {
  const now = new Date("2026-03-23T14:00:00").getTime();

  test("event in progress", () => {
    expect(getEventStatus({ start: "2026-03-23T13:30:00", end: "2026-03-23T14:30:00" }, now)).toBe("inprogress");
  });

  test("event starting in 20 minutes = soon", () => {
    expect(getEventStatus({ start: "2026-03-23T14:20:00", end: "2026-03-23T15:00:00" }, now)).toBe("soon");
  });

  test("event starting in 31 minutes = upcoming (not soon)", () => {
    expect(getEventStatus({ start: "2026-03-23T14:31:00", end: "2026-03-23T15:30:00" }, now)).toBe("upcoming");
  });

  test("event in the past", () => {
    expect(getEventStatus({ start: "2026-03-23T10:00:00", end: "2026-03-23T11:00:00" }, now)).toBe("past");
  });

  test("event starting now (exact start) = inprogress", () => {
    expect(getEventStatus({ start: "2026-03-23T14:00:00", end: "2026-03-23T15:00:00" }, now)).toBe("inprogress");
  });

  test("no end time — defaults to 1h duration", () => {
    expect(getEventStatus({ start: "2026-03-23T13:00:00" }, now)).toBe("past");
  });

  test("null event returns upcoming", () => {
    expect(getEventStatus(null, now)).toBe("upcoming");
  });
});

describe("minsUntil", () => {
  const now = new Date("2026-03-23T14:00:00").getTime();

  test("25 mins away", () => {
    expect(minsUntil({ start: "2026-03-23T14:25:00" }, now)).toBe("In 25m");
  });

  test("1 hour away", () => {
    expect(minsUntil({ start: "2026-03-23T15:00:00" }, now)).toBe("In 1h");
  });

  test("1 hour 30 mins away", () => {
    expect(minsUntil({ start: "2026-03-23T15:30:00" }, now)).toBe("In 1h 30m");
  });

  test("past event returns empty string", () => {
    expect(minsUntil({ start: "2026-03-23T13:00:00" }, now)).toBe("");
  });
});
