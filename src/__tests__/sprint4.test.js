/**
 * Sprint 4 — Reporting & Weekly Intelligence
 *
 * Tests for:
 * - buildWeeklyBriefContext(emails, tasks, events, donations) → structured context object
 * - formatBriefContext(ctx) → string prompt for AI
 * - weekOf(date) → ISO date string for start of week
 */

// ── weekOf ────────────────────────────────────────────────────────────────────
function weekOf(date) {
  // Parse as local date to avoid timezone shifts
  const parts = (typeof date === 'string' ? date : new Date(date).toISOString()).split('T')[0].split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const day = d.getDay(); // 0 = Sunday
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7)); // adjust to Monday
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

describe("weekOf", () => {
  test("Monday returns same day", () => {
    expect(weekOf("2026-03-16")).toBe("2026-03-16"); // Monday
  });

  test("Wednesday returns prior Monday", () => {
    expect(weekOf("2026-03-18")).toBe("2026-03-16");
  });

  test("Sunday returns prior Monday", () => {
    expect(weekOf("2026-03-22")).toBe("2026-03-16");
  });

  test("Friday returns prior Monday", () => {
    expect(weekOf("2026-03-20")).toBe("2026-03-16");
  });
});

// ── buildWeeklyBriefContext ───────────────────────────────────────────────────
function buildWeeklyBriefContext(emails, tasks, events, donations = []) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

  // Emails handled in last 7 days (not in inbox = archived/deleted)
  const recentEmails = (emails || []).filter(e => {
    const ts = e.internalDate ? parseInt(e.internalDate) : new Date(e.date || 0).getTime();
    return ts >= sevenDaysAgo;
  });

  // Tasks
  const completedTasks = (tasks || []).filter(t => t.done);
  const overdueTasks = (tasks || []).filter(t => !t.done && t.due && new Date(t.due) < new Date());
  const pendingTasks = (tasks || []).filter(t => !t.done);

  // Meetings this week
  const recentMeetings = (events || []).filter(ev => {
    const ts = new Date(ev.start || 0).getTime();
    return ts >= sevenDaysAgo && ts <= now;
  });

  // Donations
  const totalDonations = (donations || []).reduce((sum, d) => sum + (d.amount || 0), 0);
  const donationCount = (donations || []).length;

  return {
    emailCount: recentEmails.length,
    completedTaskCount: completedTasks.length,
    overdueTaskCount: overdueTasks.length,
    pendingTaskCount: pendingTasks.length,
    meetingCount: recentMeetings.length,
    totalDonations,
    donationCount,
    topDonation: (donations || []).length ? Math.max(...(donations || []).map(d => d.amount || 0)) : 0,
  };
}

describe("buildWeeklyBriefContext", () => {
  const now = Date.now();
  const recentEmail = { internalDate: String(now - 2 * 86400000) };
  const oldEmail = { internalDate: String(now - 10 * 86400000) };
  const doneTask = { done: true, title: "Call donor" };
  const overdueTask = { done: false, due: new Date(now - 86400000).toISOString(), title: "Submit grant" };
  const pendingTask = { done: false, due: new Date(now + 86400000).toISOString(), title: "Review budget" };
  const recentEvent = { start: new Date(now - 86400000).toISOString(), title: "Board call" };
  const oldEvent = { start: new Date(now - 9 * 86400000).toISOString(), title: "Old meeting" };

  test("counts emails in last 7 days only", () => {
    const ctx = buildWeeklyBriefContext([recentEmail, oldEmail], [], []);
    expect(ctx.emailCount).toBe(1);
  });

  test("counts completed tasks", () => {
    const ctx = buildWeeklyBriefContext([], [doneTask, overdueTask], []);
    expect(ctx.completedTaskCount).toBe(1);
  });

  test("counts overdue tasks", () => {
    const ctx = buildWeeklyBriefContext([], [overdueTask, pendingTask], []);
    expect(ctx.overdueTaskCount).toBe(1);
  });

  test("counts pending tasks (including overdue)", () => {
    const ctx = buildWeeklyBriefContext([], [overdueTask, pendingTask], []);
    expect(ctx.pendingTaskCount).toBe(2);
  });

  test("counts meetings in last 7 days only", () => {
    const ctx = buildWeeklyBriefContext([], [], [recentEvent, oldEvent]);
    expect(ctx.meetingCount).toBe(1);
  });

  test("sums donation amounts", () => {
    const ctx = buildWeeklyBriefContext([], [], [], [
      { amount: 100 }, { amount: 250 }, { amount: 50 }
    ]);
    expect(ctx.totalDonations).toBe(400);
  });

  test("finds top donation", () => {
    const ctx = buildWeeklyBriefContext([], [], [], [
      { amount: 100 }, { amount: 500 }, { amount: 50 }
    ]);
    expect(ctx.topDonation).toBe(500);
  });

  test("handles empty inputs gracefully", () => {
    const ctx = buildWeeklyBriefContext(null, null, null, null);
    expect(ctx.emailCount).toBe(0);
    expect(ctx.completedTaskCount).toBe(0);
    expect(ctx.totalDonations).toBe(0);
  });

  test("zero donations when empty", () => {
    const ctx = buildWeeklyBriefContext([], [], [], []);
    expect(ctx.topDonation).toBe(0);
    expect(ctx.donationCount).toBe(0);
  });
});

// ── formatBriefContext ────────────────────────────────────────────────────────
function formatBriefContext(ctx) {
  const lines = [
    `Emails in inbox this week: ${ctx.emailCount}`,
    `Tasks completed: ${ctx.completedTaskCount}`,
    `Tasks pending: ${ctx.pendingTaskCount}`,
    `Tasks overdue: ${ctx.overdueTaskCount}`,
    `Meetings attended: ${ctx.meetingCount}`,
  ];
  if (ctx.donationCount > 0) {
    lines.push(`Donations received (7 days): ${ctx.donationCount} totaling $${ctx.totalDonations.toLocaleString()}`);
    lines.push(`Largest donation: $${ctx.topDonation.toLocaleString()}`);
  }
  return lines.join('\n');
}

describe("formatBriefContext", () => {
  const ctx = {
    emailCount: 42,
    completedTaskCount: 5,
    pendingTaskCount: 3,
    overdueTaskCount: 1,
    meetingCount: 7,
    donationCount: 4,
    totalDonations: 1250,
    topDonation: 500,
  };

  test("includes email count", () => {
    expect(formatBriefContext(ctx)).toContain("42");
  });

  test("includes task counts", () => {
    const output = formatBriefContext(ctx);
    expect(output).toContain("5"); // completed
    expect(output).toContain("overdue");
  });

  test("includes meeting count", () => {
    expect(formatBriefContext(ctx)).toContain("7");
  });

  test("includes donation summary when donations present", () => {
    const output = formatBriefContext(ctx);
    expect(output).toContain("1,250");
    expect(output).toContain("500");
  });

  test("no donation section when no donations", () => {
    const noDonations = { ...ctx, donationCount: 0, totalDonations: 0, topDonation: 0 };
    expect(formatBriefContext(noDonations)).not.toContain("Donation");
  });
});
