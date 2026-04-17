/**
 * Meeting Prep tests — MEETING_PREP_SPEC.md
 * TDD: tests written first, then implementation.
 */

// ── Identity resolution ──────────────────────────────────────────────────────

function isExternalAttendee(email) {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return !lower.endsWith('@freshfoodconnect.org') && !lower.endsWith('@ffc.org');
}

function getExternalAttendees(event) {
  const attendees = event?.attendees || [];
  return attendees
    .map(a => ({ email: (a.email || '').toLowerCase().trim(), displayName: a.displayName || '' }))
    .filter(a => a.email && isExternalAttendee(a.email));
}

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

function resolveIdentity(email, threads) {
  const normalized = normalizeEmail(email);
  if (!normalized) return { email: normalized, name: null, org: null, confidence: 'low', trail: [] };

  const trail = [];
  let name = null;
  let org = null;

  // Extract name from email threads (From headers often have "Name <email>")
  const matchingThreads = (threads || []).filter(t =>
    normalizeEmail(t.from || '').includes(normalized) ||
    (t.fromName && normalizeEmail(t.fromEmail || '') === normalized)
  );

  trail.push(`${matchingThreads.length} Gmail threads found`);

  if (matchingThreads.length > 0 && matchingThreads[0].fromName) {
    name = matchingThreads[0].fromName;
    trail.push(`Name from Gmail: "${name}"`);
  }

  // Org from email domain (not gmail/yahoo/outlook/hotmail)
  const domain = normalized.split('@')[1] || '';
  const genericDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com'];
  if (domain && !genericDomains.includes(domain)) {
    org = domain.replace(/\.(com|org|net|io|co)$/, '').replace(/\./g, ' ');
    trail.push(`Org inferred from domain: ${domain}`);
  }

  let confidence = 'low';
  if (matchingThreads.length >= 3 && name) confidence = 'high';
  else if (matchingThreads.length >= 1 || name) confidence = 'med';

  trail.push(`Confidence: ${confidence}`);

  return { email: normalized, name, org, confidence, trail };
}

// ── Stage inference ──────────────────────────────────────────────────────────

function inferStage(threads, donationSignals) {
  const hasDonations = donationSignals && donationSignals.length > 0;
  const threadCount = (threads || []).length;

  if (hasDonations && threadCount >= 5) return 'active-major';
  if (hasDonations) return 'active';
  if (threadCount >= 3) return 'known';
  if (threadCount >= 1) return 'new';
  return 'unknown';
}

// ── Brief section builders ───────────────────────────────────────────────────

function buildWhyThisMeeting(event, lastThread) {
  if (event?.description) {
    return { text: event.description.slice(0, 200), source: 'calendar-description', citation: `cal:${event.id}` };
  }
  if (lastThread?.subject) {
    return { text: `Booked from thread: "${lastThread.subject}"`, source: 'gmail-thread', citation: `msg:${lastThread.id}` };
  }
  return null;
}

function buildLastContact(threads) {
  if (!threads || threads.length === 0) return null;
  const sorted = [...threads].sort((a, b) => new Date(b.date) - new Date(a.date));
  const last = sorted[0];
  return {
    text: `Last emailed on ${last.date} re: "${last.subject}"`,
    date: last.date,
    citation: `msg:${last.id}`,
  };
}

// ── Sparse data detection ────────────────────────────────────────────────────

function isSparseData(briefSections) {
  const hasThreads = briefSections.lastContact != null;
  const hasSharedDocs = briefSections.connectionPoints?.sharedDocs?.length > 0;
  const hasDonations = briefSections.relationship?.donations?.length > 0;
  return !hasThreads && !hasSharedDocs && !hasDonations;
}

function buildSparseDataCard() {
  return {
    type: 'low-signal',
    missing: ['No prior email threads', 'No shared docs', 'No FFC giving history found'],
    manualContextField: true,
  };
}

// ── Source status ─────────────────────────────────────────────────────────────

function buildSourceStatus(gmail, drive, calendar) {
  const sources = [
    { name: 'Gmail', status: gmail },
    { name: 'Drive', status: drive },
    { name: 'Calendar', status: calendar },
  ];
  const complete = sources.filter(s => s.status === 'loaded' || s.status === 'partial').length;
  return { sources, summary: `${complete} of ${sources.length} sources complete` };
}

// ── Completion signal ────────────────────────────────────────────────────────

function getCompletionSignal(briefGenerated, drawerOpened, docModifiedTime, meetingEndTime) {
  if (docModifiedTime && meetingEndTime && new Date(docModifiedTime) > new Date(meetingEndTime)) {
    return 'doc-touched';
  }
  if (drawerOpened) return 'opened';
  if (briefGenerated) return 'brief-ready';
  return null;
}

// ── Privacy guard ────────────────────────────────────────────────────────────

function isFolderSafe(permissions) {
  if (!permissions || permissions.length === 0) return true;
  for (const p of permissions) {
    if (p.type === 'anyone') return false;
    if (p.type === 'domain' && !p.domain?.endsWith('freshfoodconnect.org')) return false;
    if (p.type === 'user' || p.type === 'group') {
      const email = (p.emailAddress || '').toLowerCase();
      if (email && !email.endsWith('@freshfoodconnect.org')) return false;
    }
  }
  return true;
}

// ── Doc naming ───────────────────────────────────────────────────────────────

function buildPrepDocTitle(name, email) {
  if (name) return `${name} — Meeting Prep`;
  return `${email} — Meeting Prep`;
}

function buildPrepSectionHeading(meetingDate) {
  return `## Prep for ${meetingDate} meeting`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("isExternalAttendee", () => {
  test("FFC email is internal", () => {
    expect(isExternalAttendee("kayla@freshfoodconnect.org")).toBe(false);
  });
  test("external email is external", () => {
    expect(isExternalAttendee("pat@acme.org")).toBe(true);
  });
  test("handles null", () => {
    expect(isExternalAttendee(null)).toBe(false);
  });
  test("case insensitive", () => {
    expect(isExternalAttendee("Laura@FreshFoodConnect.org")).toBe(false);
  });
  test("trims whitespace", () => {
    expect(isExternalAttendee("  pat@acme.org  ")).toBe(true);
  });
});

describe("getExternalAttendees", () => {
  test("filters out FFC attendees", () => {
    const event = { attendees: [
      { email: "kayla@freshfoodconnect.org", displayName: "Kayla" },
      { email: "pat@acme.org", displayName: "Pat" },
    ]};
    const ext = getExternalAttendees(event);
    expect(ext).toHaveLength(1);
    expect(ext[0].email).toBe("pat@acme.org");
  });
  test("returns empty for all-internal meeting", () => {
    const event = { attendees: [{ email: "kayla@freshfoodconnect.org" }] };
    expect(getExternalAttendees(event)).toHaveLength(0);
  });
  test("handles no attendees", () => {
    expect(getExternalAttendees({})).toHaveLength(0);
  });
  test("handles null event", () => {
    expect(getExternalAttendees(null)).toHaveLength(0);
  });
});

describe("resolveIdentity", () => {
  test("high confidence with 3+ threads and name", () => {
    const threads = [
      { from: "Pat Wynne <pat@acme.org>", fromName: "Pat Wynne", fromEmail: "pat@acme.org" },
      { from: "Pat Wynne <pat@acme.org>", fromName: "Pat Wynne", fromEmail: "pat@acme.org" },
      { from: "Pat Wynne <pat@acme.org>", fromName: "Pat Wynne", fromEmail: "pat@acme.org" },
    ];
    const id = resolveIdentity("pat@acme.org", threads);
    expect(id.confidence).toBe("high");
    expect(id.name).toBe("Pat Wynne");
    expect(id.org).toBe("acme");
  });
  test("med confidence with 1-2 threads", () => {
    const threads = [{ from: "Pat <pat@acme.org>", fromName: "Pat", fromEmail: "pat@acme.org" }];
    const id = resolveIdentity("pat@acme.org", threads);
    expect(id.confidence).toBe("med");
  });
  test("low confidence with no threads", () => {
    const id = resolveIdentity("pat@acme.org", []);
    expect(id.confidence).toBe("low");
  });
  test("no org from generic domain", () => {
    const id = resolveIdentity("pat@gmail.com", []);
    expect(id.org).toBeNull();
  });
  test("org from non-generic domain", () => {
    const id = resolveIdentity("pat@acme.org", []);
    expect(id.org).toBe("acme");
  });
  test("handles null email", () => {
    const id = resolveIdentity(null, []);
    expect(id.email).toBe("");
    expect(id.confidence).toBe("low");
  });
  test("trail includes thread count", () => {
    const id = resolveIdentity("pat@acme.org", []);
    expect(id.trail.some(t => t.includes("0 Gmail threads"))).toBe(true);
  });
});

describe("inferStage", () => {
  test("unknown with no threads and no donations", () => {
    expect(inferStage([], [])).toBe("unknown");
  });
  test("new with 1-2 threads, no donations", () => {
    expect(inferStage([{}, {}], [])).toBe("new");
  });
  test("known with 3+ threads, no donations", () => {
    expect(inferStage([{}, {}, {}], [])).toBe("known");
  });
  test("active with donations", () => {
    expect(inferStage([{}], [{ amount: 100 }])).toBe("active");
  });
  test("active-major with 5+ threads and donations", () => {
    expect(inferStage([{}, {}, {}, {}, {}], [{ amount: 500 }])).toBe("active-major");
  });
});

describe("buildWhyThisMeeting", () => {
  test("uses calendar description when present", () => {
    const r = buildWhyThisMeeting({ id: "ev1", description: "Discuss sponsorship" }, null);
    expect(r.text).toBe("Discuss sponsorship");
    expect(r.source).toBe("calendar-description");
    expect(r.citation).toBe("cal:ev1");
  });
  test("falls back to last thread subject", () => {
    const r = buildWhyThisMeeting({ id: "ev1" }, { id: "msg1", subject: "Spring event" });
    expect(r.text).toContain("Spring event");
    expect(r.citation).toBe("msg:msg1");
  });
  test("returns null when no data", () => {
    expect(buildWhyThisMeeting({}, null)).toBeNull();
  });
  test("truncates long descriptions", () => {
    const r = buildWhyThisMeeting({ id: "ev1", description: "x".repeat(300) }, null);
    expect(r.text.length).toBe(200);
  });
});

describe("buildLastContact", () => {
  test("returns most recent thread", () => {
    const threads = [
      { id: "m1", date: "2026-03-01", subject: "Old" },
      { id: "m2", date: "2026-04-15", subject: "Recent" },
    ];
    const r = buildLastContact(threads);
    expect(r.text).toContain("Recent");
    expect(r.date).toBe("2026-04-15");
  });
  test("returns null for empty threads", () => {
    expect(buildLastContact([])).toBeNull();
  });
  test("returns null for null", () => {
    expect(buildLastContact(null)).toBeNull();
  });
});

describe("isSparseData", () => {
  test("true when no threads, docs, or donations", () => {
    expect(isSparseData({ lastContact: null, connectionPoints: { sharedDocs: [] }, relationship: { donations: [] } })).toBe(true);
  });
  test("false when threads exist", () => {
    expect(isSparseData({ lastContact: { text: "..." }, connectionPoints: { sharedDocs: [] }, relationship: { donations: [] } })).toBe(false);
  });
  test("false when shared docs exist", () => {
    expect(isSparseData({ lastContact: null, connectionPoints: { sharedDocs: [{}] }, relationship: { donations: [] } })).toBe(false);
  });
  test("false when donations exist", () => {
    expect(isSparseData({ lastContact: null, connectionPoints: { sharedDocs: [] }, relationship: { donations: [{}] } })).toBe(false);
  });
});

describe("buildSourceStatus", () => {
  test("all loaded", () => {
    const s = buildSourceStatus("loaded", "loaded", "loaded");
    expect(s.summary).toBe("3 of 3 sources complete");
  });
  test("partial counts as complete", () => {
    const s = buildSourceStatus("loaded", "partial", "loaded");
    expect(s.summary).toBe("3 of 3 sources complete");
  });
  test("failed does not count", () => {
    const s = buildSourceStatus("loaded", "failed", "loaded");
    expect(s.summary).toBe("2 of 3 sources complete");
  });
  test("timed-out does not count", () => {
    const s = buildSourceStatus("timed-out", "loaded", "loaded");
    expect(s.summary).toBe("2 of 3 sources complete");
  });
});

describe("getCompletionSignal", () => {
  test("doc-touched when doc modified after meeting end", () => {
    expect(getCompletionSignal(true, true, "2026-04-17T15:00:00Z", "2026-04-17T14:00:00Z")).toBe("doc-touched");
  });
  test("opened when drawer was viewed", () => {
    expect(getCompletionSignal(true, true, null, null)).toBe("opened");
  });
  test("brief-ready when generated but not opened", () => {
    expect(getCompletionSignal(true, false, null, null)).toBe("brief-ready");
  });
  test("null when nothing generated", () => {
    expect(getCompletionSignal(false, false, null, null)).toBeNull();
  });
  test("doc-touched takes priority over opened", () => {
    expect(getCompletionSignal(true, true, "2026-04-17T16:00:00Z", "2026-04-17T15:00:00Z")).toBe("doc-touched");
  });
});

describe("isFolderSafe", () => {
  test("safe with no permissions", () => {
    expect(isFolderSafe([])).toBe(true);
  });
  test("safe with null permissions", () => {
    expect(isFolderSafe(null)).toBe(true);
  });
  test("unsafe with anyone sharing", () => {
    expect(isFolderSafe([{ type: "anyone" }])).toBe(false);
  });
  test("safe with FFC user", () => {
    expect(isFolderSafe([{ type: "user", emailAddress: "kayla@freshfoodconnect.org" }])).toBe(true);
  });
  test("unsafe with external user", () => {
    expect(isFolderSafe([{ type: "user", emailAddress: "pat@acme.org" }])).toBe(false);
  });
  test("unsafe with non-FFC domain", () => {
    expect(isFolderSafe([{ type: "domain", domain: "acme.org" }])).toBe(false);
  });
  test("safe with FFC domain", () => {
    expect(isFolderSafe([{ type: "domain", domain: "freshfoodconnect.org" }])).toBe(true);
  });
});

describe("buildPrepDocTitle", () => {
  test("uses name when available", () => {
    expect(buildPrepDocTitle("Pat Wynne", "pat@acme.org")).toBe("Pat Wynne — Meeting Prep");
  });
  test("falls back to email", () => {
    expect(buildPrepDocTitle(null, "pat@acme.org")).toBe("pat@acme.org — Meeting Prep");
  });
});

describe("buildPrepSectionHeading", () => {
  test("formats date correctly", () => {
    expect(buildPrepSectionHeading("2026-04-17")).toBe("## Prep for 2026-04-17 meeting");
  });
});

describe("buildSparseDataCard", () => {
  test("includes all missing signals", () => {
    const card = buildSparseDataCard();
    expect(card.type).toBe("low-signal");
    expect(card.missing).toHaveLength(3);
    expect(card.manualContextField).toBe(true);
  });
});
