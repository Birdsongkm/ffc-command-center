/**
 * Sprint 5 — Global Search & Team Activity Digest
 *
 * Tests for:
 * - searchEmails(emails, query) → matching emails
 * - searchTasks(tasks, query) → matching tasks
 * - searchDrafts(drafts, query) → matching drafts
 * - scoreSearchResult(item, query, type) → relevance score
 * - buildTeamActivity(emails, tasks, teamMembers) → activity per member
 */

// ── scoreSearchResult ─────────────────────────────────────────────────────────
function scoreSearchResult(item, query, type) {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  let score = 0;
  if (type === 'email') {
    const subj = (item.subject || '').toLowerCase();
    const from = (item.from || '').toLowerCase();
    const snippet = (item.snippet || '').toLowerCase();
    if (subj.includes(q)) score += 10;
    if (from.includes(q)) score += 8;
    if (snippet.includes(q)) score += 3;
  } else if (type === 'task') {
    const title = (item.title || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    if (title.includes(q)) score += 10;
    if (notes.includes(q)) score += 4;
  } else if (type === 'draft') {
    const subj = (item.subject || '').toLowerCase();
    const to = (item.to || '').toLowerCase();
    const snippet = (item.snippet || '').toLowerCase();
    if (subj.includes(q)) score += 10;
    if (to.includes(q)) score += 8;
    if (snippet.includes(q)) score += 3;
  }
  return score;
}

describe("scoreSearchResult", () => {
  test("email — subject match scores highest", () => {
    const email = { subject: "Grant LOI due", from: "alice@org.com", snippet: "Please review" };
    expect(scoreSearchResult(email, "grant", "email")).toBe(10);
  });

  test("email — from match scores 8", () => {
    const email = { subject: "Hello", from: "grant@foundation.org", snippet: "" };
    expect(scoreSearchResult(email, "grant", "email")).toBe(8);
  });

  test("email — both subject and from match accumulates", () => {
    const email = { subject: "Grant update", from: "grant@foundation.org", snippet: "" };
    expect(scoreSearchResult(email, "grant", "email")).toBe(18);
  });

  test("email — snippet match scores 3", () => {
    const email = { subject: "Update", from: "alice@org.com", snippet: "about the grant" };
    expect(scoreSearchResult(email, "grant", "email")).toBe(3);
  });

  test("task — title match scores 10", () => {
    const task = { title: "Submit grant application", notes: "" };
    expect(scoreSearchResult(task, "grant", "task")).toBe(10);
  });

  test("task — notes match scores 4", () => {
    const task = { title: "Review docs", notes: "grant-related documents" };
    expect(scoreSearchResult(task, "grant", "task")).toBe(4);
  });

  test("empty query returns 0", () => {
    expect(scoreSearchResult({ subject: "Grant", from: "", snippet: "" }, "", "email")).toBe(0);
  });

  test("no match returns 0", () => {
    expect(scoreSearchResult({ subject: "Hello", from: "a@b.com", snippet: "hi" }, "grant", "email")).toBe(0);
  });
});

// ── searchEmails ──────────────────────────────────────────────────────────────
function searchEmails(emails, query) {
  if (!query || !query.trim()) return [];
  return (emails || [])
    .map(e => ({ item: e, score: scoreSearchResult(e, query, 'email') }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.item);
}

describe("searchEmails", () => {
  const emails = [
    { id: '1', subject: "Grant LOI submission", from: "funder@foundation.org", snippet: "" },
    { id: '2', subject: "Weekly update", from: "alice@ffc.org", snippet: "" },
    { id: '3', subject: "Hello", from: "bob@gmail.com", snippet: "about the grant deadline" },
    { id: '4', subject: "Unrelated", from: "x@x.com", snippet: "nothing here" },
  ];

  test("empty query returns empty array", () => {
    expect(searchEmails(emails, "")).toEqual([]);
  });

  test("null query returns empty array", () => {
    expect(searchEmails(emails, null)).toEqual([]);
  });

  test("finds emails matching query", () => {
    const results = searchEmails(emails, "grant");
    expect(results.map(e => e.id)).toContain('1');
    expect(results.map(e => e.id)).toContain('3');
  });

  test("does not return non-matching emails", () => {
    const results = searchEmails(emails, "grant");
    expect(results.map(e => e.id)).not.toContain('4');
  });

  test("subject match ranked above snippet match", () => {
    const results = searchEmails(emails, "grant");
    expect(results[0].id).toBe('1'); // subject match ranked first
  });

  test("null emails returns empty array", () => {
    expect(searchEmails(null, "grant")).toEqual([]);
  });
});

// ── searchTasks ───────────────────────────────────────────────────────────────
function searchTasks(tasks, query) {
  if (!query || !query.trim()) return [];
  return (tasks || [])
    .map(t => ({ item: t, score: scoreSearchResult(t, query, 'task') }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.item);
}

describe("searchTasks", () => {
  const tasks = [
    { id: 't1', title: "Submit grant application", notes: "", done: false },
    { id: 't2', title: "Call Alice", notes: "discuss grant renewal", done: false },
    { id: 't3', title: "Review budget", notes: "Q2 numbers", done: true },
  ];

  test("finds task by title", () => {
    expect(searchTasks(tasks, "grant").map(t => t.id)).toContain('t1');
  });

  test("finds task by notes", () => {
    expect(searchTasks(tasks, "grant").map(t => t.id)).toContain('t2');
  });

  test("does not return non-matching tasks", () => {
    expect(searchTasks(tasks, "grant").map(t => t.id)).not.toContain('t3');
  });

  test("empty query returns empty", () => {
    expect(searchTasks(tasks, "")).toEqual([]);
  });
});

// ── buildTeamActivity ─────────────────────────────────────────────────────────
function buildTeamActivity(emails, tasks, teamMembers) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

  return (teamMembers || []).map(member => {
    const memberEmails = (emails || []).filter(e => {
      const from = (e.from || '').toLowerCase();
      return from.includes(member.email.toLowerCase()) || from.includes(member.name.toLowerCase().split(' ')[0]);
    });
    const recentEmails = memberEmails.filter(e => {
      const ts = e.internalDate ? parseInt(e.internalDate) : new Date(e.date || 0).getTime();
      return ts >= sevenDaysAgo;
    });
    const assignedTasks = (tasks || []).filter(t =>
      (t.assignee || '').toLowerCase().includes(member.name.toLowerCase()) ||
      (t.assignee || '').toLowerCase().includes(member.email.toLowerCase())
    );
    const completedTasks = assignedTasks.filter(t => t.done);
    const pendingTasks = assignedTasks.filter(t => !t.done);
    return {
      name: member.name,
      email: member.email,
      recentEmailCount: recentEmails.length,
      completedTaskCount: completedTasks.length,
      pendingTaskCount: pendingTasks.length,
    };
  });
}

describe("buildTeamActivity", () => {
  const now = Date.now();
  const team = [
    { name: "Alice Brown", email: "alice@freshfoodconnect.org", initials: "AB" },
    { name: "Bob Jones", email: "bob@freshfoodconnect.org", initials: "BJ" },
  ];
  const emails = [
    { from: "alice@freshfoodconnect.org", internalDate: String(now - 86400000) },
    { from: "alice@freshfoodconnect.org", internalDate: String(now - 2 * 86400000) },
    { from: "bob@freshfoodconnect.org", internalDate: String(now - 10 * 86400000) }, // >7 days
  ];
  const tasks = [
    { title: "Send report", assignee: "Alice Brown", done: true },
    { title: "Update donor list", assignee: "Alice Brown", done: false },
    { title: "Call funder", assignee: "Bob Jones", done: false },
  ];

  test("returns entry for each team member", () => {
    const result = buildTeamActivity(emails, tasks, team);
    expect(result).toHaveLength(2);
  });

  test("counts recent emails per member", () => {
    const result = buildTeamActivity(emails, tasks, team);
    const alice = result.find(r => r.name === "Alice Brown");
    expect(alice.recentEmailCount).toBe(2);
  });

  test("excludes emails older than 7 days", () => {
    const result = buildTeamActivity(emails, tasks, team);
    const bob = result.find(r => r.name === "Bob Jones");
    expect(bob.recentEmailCount).toBe(0);
  });

  test("counts completed tasks per member", () => {
    const result = buildTeamActivity(emails, tasks, team);
    const alice = result.find(r => r.name === "Alice Brown");
    expect(alice.completedTaskCount).toBe(1);
  });

  test("counts pending tasks per member", () => {
    const result = buildTeamActivity(emails, tasks, team);
    const bob = result.find(r => r.name === "Bob Jones");
    expect(bob.pendingTaskCount).toBe(1);
  });

  test("handles null inputs", () => {
    const result = buildTeamActivity(null, null, team);
    expect(result[0].recentEmailCount).toBe(0);
  });
});
