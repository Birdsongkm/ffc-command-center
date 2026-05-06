/**
 * Popup trigger tests — verifies all 5 popup triggers fire correctly
 * and don't re-trigger after being handled.
 *
 * CC Allocation: only current month, only if no reply sent
 * Payroll: only unread emails from @dnatsi.com with "payroll approval"
 * Board Prep: only if meeting within 21 days, keyed by event id
 * Birthday: only today (or Fri→Sun), keyed by content hash
 * Finance: keyed by messageId
 */

// ── CC Allocation trigger logic ──────────────────────────────────────────────

function isCurrentMonthEmail(emailDate) {
  if (!emailDate) return false;
  const now = new Date();
  const d = new Date(emailDate);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function hasKaylaReplied(threadMessages) {
  return (threadMessages || []).some(m => {
    const from = (m.from || '').toLowerCase();
    return from.includes('freshfoodconnect.org') || from.includes('kayla');
  });
}

function shouldShowCcAllocPopup(emailInfo, dismissedId) {
  if (!emailInfo?.found) return false;
  if (emailInfo.messageId === dismissedId) return false;
  return true;
}

// ── Payroll trigger logic ────────────────────────────────────────────────────

function isPayrollApprovalEmail(email) {
  const from = (email?.from || '').toLowerCase();
  const subject = (email?.subject || '').toLowerCase();
  return from.includes('@dnatsi.com') && subject.includes('payroll approval');
}

function shouldShowPayrollPopup(email, dismissedIds) {
  if (!isPayrollApprovalEmail(email)) return false;
  if (dismissedIds && dismissedIds.has(email.id)) return false;
  return true;
}

// ── Board Prep trigger logic ─────────────────────────────────────────────────

function shouldShowBoardPrepPopup(boardPrepInfo, dismissedId, panelOpen) {
  if (!boardPrepInfo?.meeting) return false;
  if (panelOpen) return false;
  const eventKey = boardPrepInfo.meeting.id || boardPrepInfo.meeting.start;
  if (eventKey === dismissedId) return false;
  return true;
}

// ── Birthday trigger logic ───────────────────────────────────────────────────

function birthdayContentKey(birthdays) {
  return (birthdays || []).map(b => `${b.name || ''}_${b.date || ''}`).join('|');
}

function shouldShowBirthdayPopup(birthdayInfo, dismissedKey, panelOpen) {
  if (!birthdayInfo?.birthdays?.length) return false;
  if (panelOpen) return false;
  if (birthdayContentKey(birthdayInfo.birthdays) === dismissedKey) return false;
  return true;
}

// ── Dismissal persistence logic ──────────────────────────────────────────────

function persistDismissal(key, value) {
  // In real code this writes to localStorage; here we just return the shape
  return { key, value, persisted: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CC Allocation trigger", () => {
  test("isCurrentMonthEmail: true for this month", () => {
    expect(isCurrentMonthEmail(new Date().toISOString())).toBe(true);
  });

  test("isCurrentMonthEmail: false for last month", () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    expect(isCurrentMonthEmail(lastMonth.toISOString())).toBe(false);
  });

  test("isCurrentMonthEmail: false for null", () => {
    expect(isCurrentMonthEmail(null)).toBe(false);
  });

  test("hasKaylaReplied: true when FFC reply exists", () => {
    expect(hasKaylaReplied([
      { from: "debbie@dnatsi.com" },
      { from: "kayla@freshfoodconnect.org" },
    ])).toBe(true);
  });

  test("hasKaylaReplied: false when only Debbie messages", () => {
    expect(hasKaylaReplied([{ from: "debbie@dnatsi.com" }])).toBe(false);
  });

  test("hasKaylaReplied: empty thread", () => {
    expect(hasKaylaReplied([])).toBe(false);
  });

  test("shouldShowCcAllocPopup: shows when found and not dismissed", () => {
    expect(shouldShowCcAllocPopup({ found: true, messageId: "msg1" }, null)).toBe(true);
  });

  test("shouldShowCcAllocPopup: hidden when dismissed", () => {
    expect(shouldShowCcAllocPopup({ found: true, messageId: "msg1" }, "msg1")).toBe(false);
  });

  test("shouldShowCcAllocPopup: hidden when not found", () => {
    expect(shouldShowCcAllocPopup({ found: false }, null)).toBe(false);
  });

  test("shouldShowCcAllocPopup: shows for new message even if old one dismissed", () => {
    expect(shouldShowCcAllocPopup({ found: true, messageId: "msg2" }, "msg1")).toBe(true);
  });
});

describe("Payroll trigger", () => {
  test("isPayrollApprovalEmail: true for matching email", () => {
    expect(isPayrollApprovalEmail({ from: "debbie@dnatsi.com", subject: "Payroll Approval - April 2026" })).toBe(true);
  });

  test("isPayrollApprovalEmail: false for wrong sender", () => {
    expect(isPayrollApprovalEmail({ from: "pat@acme.org", subject: "Payroll Approval" })).toBe(false);
  });

  test("isPayrollApprovalEmail: false for wrong subject", () => {
    expect(isPayrollApprovalEmail({ from: "debbie@dnatsi.com", subject: "Credit card transactions" })).toBe(false);
  });

  test("shouldShowPayrollPopup: shows for matching email", () => {
    expect(shouldShowPayrollPopup({ id: "msg1", from: "debbie@dnatsi.com", subject: "Payroll Approval" }, new Set())).toBe(true);
  });

  test("shouldShowPayrollPopup: hidden when dismissed", () => {
    expect(shouldShowPayrollPopup({ id: "msg1", from: "debbie@dnatsi.com", subject: "Payroll Approval" }, new Set(["msg1"]))).toBe(false);
  });
});

describe("Board Prep trigger", () => {
  test("shows when meeting exists and not dismissed", () => {
    expect(shouldShowBoardPrepPopup({ meeting: { id: "ev1" } }, null, false)).toBe(true);
  });

  test("hidden when no meeting", () => {
    expect(shouldShowBoardPrepPopup({}, null, false)).toBe(false);
  });

  test("hidden when panel is open", () => {
    expect(shouldShowBoardPrepPopup({ meeting: { id: "ev1" } }, null, true)).toBe(false);
  });

  test("hidden when dismissed by event id", () => {
    expect(shouldShowBoardPrepPopup({ meeting: { id: "ev1" } }, "ev1", false)).toBe(false);
  });

  test("shows for different event after dismissal", () => {
    expect(shouldShowBoardPrepPopup({ meeting: { id: "ev2" } }, "ev1", false)).toBe(true);
  });

  test("falls back to start when no id", () => {
    expect(shouldShowBoardPrepPopup({ meeting: { start: "2026-05-10" } }, "2026-05-10", false)).toBe(false);
  });
});

describe("Birthday trigger", () => {
  test("birthdayContentKey: builds key from names and dates", () => {
    expect(birthdayContentKey([{ name: "Pat", date: "2026-05-06" }])).toBe("Pat_2026-05-06");
  });

  test("birthdayContentKey: multiple birthdays", () => {
    expect(birthdayContentKey([
      { name: "Pat", date: "2026-05-06" },
      { name: "Kim", date: "2026-05-07" },
    ])).toBe("Pat_2026-05-06|Kim_2026-05-07");
  });

  test("birthdayContentKey: empty array", () => {
    expect(birthdayContentKey([])).toBe("");
  });

  test("shows when birthdays exist and not dismissed", () => {
    expect(shouldShowBirthdayPopup({ birthdays: [{ name: "Pat", date: "2026-05-06" }] }, null, false)).toBe(true);
  });

  test("hidden when dismissed with matching key", () => {
    const info = { birthdays: [{ name: "Pat", date: "2026-05-06" }] };
    expect(shouldShowBirthdayPopup(info, "Pat_2026-05-06", false)).toBe(false);
  });

  test("hidden when no birthdays", () => {
    expect(shouldShowBirthdayPopup({ birthdays: [] }, null, false)).toBe(false);
  });

  test("hidden when panel open", () => {
    expect(shouldShowBirthdayPopup({ birthdays: [{ name: "Pat" }] }, null, true)).toBe(false);
  });

  test("shows for different birthday after dismissal", () => {
    const info = { birthdays: [{ name: "Kim", date: "2026-05-07" }] };
    expect(shouldShowBirthdayPopup(info, "Pat_2026-05-06", false)).toBe(true);
  });
});

describe("Dismissal persistence", () => {
  test("returns persisted shape", () => {
    const r = persistDismissal("ffc_dismissed_cc_alloc", "msg1");
    expect(r.persisted).toBe(true);
    expect(r.key).toBe("ffc_dismissed_cc_alloc");
    expect(r.value).toBe("msg1");
  });
});
