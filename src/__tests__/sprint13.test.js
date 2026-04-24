/**
 * Sprint 13 — Follow-Up Intelligence & End-of-Day Recap
 * F1: Follow-up action on emails
 * F2: Sent email reply tracking
 * F3: End-of-day recap
 * F4: Follow-up donor prioritization
 */

// ── F1: Follow-up queue management ──────────────────────────────────────────

function createFollowUp(emailId, from, subject, note, dueDate) {
  return {
    id: `fu_${Date.now()}_${emailId}`,
    emailId,
    from: from || '',
    subject: subject || '',
    note: note || '',
    dueDate: dueDate || null,
    createdAt: new Date().toISOString(),
    completed: false,
  };
}

function sortFollowUps(followUps) {
  return [...followUps].sort((a, b) => {
    // Completed items last
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    // Items with due dates first, sorted by date
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    // Fall back to creation date
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

function getOverdueFollowUps(followUps) {
  const now = new Date();
  return followUps.filter(f => !f.completed && f.dueDate && new Date(f.dueDate) < now);
}

function getPendingFollowUps(followUps) {
  return followUps.filter(f => !f.completed);
}

function completeFollowUp(followUps, id) {
  return followUps.map(f => f.id === id ? { ...f, completed: true, completedAt: new Date().toISOString() } : f);
}

function removeFollowUp(followUps, id) {
  return followUps.filter(f => f.id !== id);
}

// ── F2: Reply tracking ──────────────────────────────────────────────────────

function isAwaitingReply(sentEmail, inboxEmails, windowHours = 48) {
  if (!sentEmail || !sentEmail.date) return false;
  const sentDate = new Date(sentEmail.date);
  const cutoff = new Date(sentDate.getTime() + windowHours * 60 * 60 * 1000);
  if (new Date() < cutoff) return false; // Not yet past the window

  // Check if any inbox email is a reply to this one
  const toAddr = (sentEmail.to || '').toLowerCase();
  const subjectNorm = (sentEmail.subject || '').replace(/^(re:\s*)+/i, '').toLowerCase().trim();

  return !inboxEmails.some(e => {
    const fromAddr = (e.from || '').toLowerCase();
    const reSubject = (e.subject || '').replace(/^(re:\s*)+/i, '').toLowerCase().trim();
    return fromAddr.includes(toAddr.split(',')[0]?.trim()?.match(/[\w.-]+@[\w.-]+/)?.[0] || '___') && reSubject === subjectNorm;
  });
}

function daysSinceSent(sentDate) {
  if (!sentDate) return 0;
  return Math.floor((Date.now() - new Date(sentDate).getTime()) / (1000 * 60 * 60 * 24));
}

// ── F3: End-of-day logic ─────────────────────────────────────────────────────

function isEndOfDay(hour) {
  return hour >= 15; // 3pm or later
}

function buildEodContext(emailsHandled, meetingsAttended, tasksCompleted, followUpsPending, nonReplies) {
  const parts = [];
  parts.push(`Emails handled today: ${emailsHandled}`);
  parts.push(`Meetings attended: ${meetingsAttended}`);
  parts.push(`Tasks completed: ${tasksCompleted}`);
  if (followUpsPending > 0) parts.push(`Follow-ups still pending: ${followUpsPending}`);
  if (nonReplies > 0) parts.push(`Sent emails without reply (48h+): ${nonReplies}`);
  return parts.join('\n');
}

// ── F4: Donor prioritization ─────────────────────────────────────────────────

function isDonorContact(email) {
  const from = (email || '').toLowerCase();
  return /classy\.org/.test(from) || /donat|gift|foundation|fund/.test(from);
}

function sortFollowUpsWithDonorPriority(followUps) {
  return [...followUps].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const aDonor = isDonorContact(a.from);
    const bDonor = isDonorContact(b.from);
    if (aDonor !== bDonor) return aDonor ? -1 : 1;
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("createFollowUp", () => {
  test("creates follow-up with all fields", () => {
    const fu = createFollowUp("email1", "pat@acme.org", "Re: Grant", "Follow up next week", "2026-04-30");
    expect(fu.emailId).toBe("email1");
    expect(fu.from).toBe("pat@acme.org");
    expect(fu.subject).toBe("Re: Grant");
    expect(fu.note).toBe("Follow up next week");
    expect(fu.dueDate).toBe("2026-04-30");
    expect(fu.completed).toBe(false);
    expect(fu.id).toMatch(/^fu_/);
  });

  test("handles missing optional fields", () => {
    const fu = createFollowUp("email1", null, null, null, null);
    expect(fu.from).toBe("");
    expect(fu.note).toBe("");
    expect(fu.dueDate).toBeNull();
  });
});

describe("sortFollowUps", () => {
  test("completed items sort last", () => {
    const fus = [
      { completed: true, createdAt: "2026-04-01" },
      { completed: false, createdAt: "2026-04-02" },
    ];
    const sorted = sortFollowUps(fus);
    expect(sorted[0].completed).toBe(false);
  });

  test("items with due dates sort before those without", () => {
    const fus = [
      { completed: false, dueDate: null, createdAt: "2026-04-01" },
      { completed: false, dueDate: "2026-04-15", createdAt: "2026-04-02" },
    ];
    const sorted = sortFollowUps(fus);
    expect(sorted[0].dueDate).toBe("2026-04-15");
  });

  test("earlier due dates sort first", () => {
    const fus = [
      { completed: false, dueDate: "2026-04-20", createdAt: "2026-04-01" },
      { completed: false, dueDate: "2026-04-15", createdAt: "2026-04-02" },
    ];
    const sorted = sortFollowUps(fus);
    expect(sorted[0].dueDate).toBe("2026-04-15");
  });
});

describe("getOverdueFollowUps", () => {
  test("returns overdue items", () => {
    const fus = [
      { completed: false, dueDate: "2020-01-01" },
      { completed: false, dueDate: "2030-01-01" },
      { completed: true, dueDate: "2020-01-01" },
    ];
    expect(getOverdueFollowUps(fus)).toHaveLength(1);
  });

  test("returns empty when no overdue", () => {
    expect(getOverdueFollowUps([{ completed: false, dueDate: "2030-01-01" }])).toHaveLength(0);
  });
});

describe("getPendingFollowUps", () => {
  test("filters out completed", () => {
    const fus = [{ completed: false }, { completed: true }, { completed: false }];
    expect(getPendingFollowUps(fus)).toHaveLength(2);
  });
});

describe("completeFollowUp", () => {
  test("marks specific follow-up as completed", () => {
    const fus = [{ id: "a", completed: false }, { id: "b", completed: false }];
    const result = completeFollowUp(fus, "a");
    expect(result[0].completed).toBe(true);
    expect(result[1].completed).toBe(false);
  });

  test("does not mutate original", () => {
    const fus = [{ id: "a", completed: false }];
    completeFollowUp(fus, "a");
    expect(fus[0].completed).toBe(false);
  });
});

describe("removeFollowUp", () => {
  test("removes by id", () => {
    const fus = [{ id: "a" }, { id: "b" }];
    expect(removeFollowUp(fus, "a")).toHaveLength(1);
    expect(removeFollowUp(fus, "a")[0].id).toBe("b");
  });
});

describe("isAwaitingReply", () => {
  test("returns true when past window and no reply", () => {
    const sent = { date: "2026-04-20T10:00:00Z", to: "pat@acme.org", subject: "Grant proposal" };
    const inbox = []; // No replies
    expect(isAwaitingReply(sent, inbox, 48)).toBe(true);
  });

  test("returns false when reply exists", () => {
    const sent = { date: "2026-04-20T10:00:00Z", to: "pat@acme.org", subject: "Grant proposal" };
    const inbox = [{ from: "pat@acme.org", subject: "Re: Grant proposal" }];
    expect(isAwaitingReply(sent, inbox, 48)).toBe(false);
  });

  test("returns false when within window", () => {
    const sent = { date: new Date().toISOString(), to: "pat@acme.org", subject: "Hi" };
    expect(isAwaitingReply(sent, [], 48)).toBe(false);
  });

  test("handles null sent email", () => {
    expect(isAwaitingReply(null, [])).toBe(false);
  });
});

describe("daysSinceSent", () => {
  test("calculates days correctly", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysSinceSent(twoDaysAgo)).toBe(2);
  });

  test("returns 0 for null", () => {
    expect(daysSinceSent(null)).toBe(0);
  });
});

describe("isEndOfDay", () => {
  test("true at 3pm", () => { expect(isEndOfDay(15)).toBe(true); });
  test("true at 6pm", () => { expect(isEndOfDay(18)).toBe(true); });
  test("false at 2pm", () => { expect(isEndOfDay(14)).toBe(false); });
  test("false at 9am", () => { expect(isEndOfDay(9)).toBe(false); });
});

describe("buildEodContext", () => {
  test("includes all metrics", () => {
    const r = buildEodContext(12, 3, 5, 2, 1);
    expect(r).toContain("12");
    expect(r).toContain("3");
    expect(r).toContain("5");
    expect(r).toContain("2");
    expect(r).toContain("1");
  });

  test("omits follow-ups and non-replies when zero", () => {
    const r = buildEodContext(5, 2, 1, 0, 0);
    expect(r).not.toContain("pending");
    expect(r).not.toContain("without reply");
  });
});

describe("isDonorContact", () => {
  test("Classy is donor", () => { expect(isDonorContact("noreply@classy.org")).toBe(true); });
  test("foundation is donor", () => { expect(isDonorContact("grants@walkerfoundation.org")).toBe(true); });
  test("regular is not donor", () => { expect(isDonorContact("pat@acme.com")).toBe(false); });
  test("handles null", () => { expect(isDonorContact(null)).toBe(false); });
});

describe("sortFollowUpsWithDonorPriority", () => {
  test("donor contacts sort before non-donors", () => {
    const fus = [
      { completed: false, from: "pat@acme.com", createdAt: "2026-04-01" },
      { completed: false, from: "grants@foundation.org", createdAt: "2026-04-02" },
    ];
    const sorted = sortFollowUpsWithDonorPriority(fus);
    expect(sorted[0].from).toContain("foundation");
  });

  test("completed still sorts last even if donor", () => {
    const fus = [
      { completed: false, from: "pat@acme.com", createdAt: "2026-04-01" },
      { completed: true, from: "grants@foundation.org", createdAt: "2026-04-02" },
    ];
    const sorted = sortFollowUpsWithDonorPriority(fus);
    expect(sorted[0].from).toContain("acme");
  });
});
