/**
 * Sprint 7 planned features tests
 * F1: AI daily focus briefing
 * F2: Per-email classification explanation
 * F3: Batch AI triage (recommendation parsing)
 * F4: Donor intent signal
 */

// ── F2: Classification explanation ───────────────────────────────────────────

const BUCKET_RULES = {
  'needs-response': 'Email requires a reply — 3 or fewer recipients and no other bucket matched, OR DropboxSign/HelloSign',
  'fyi-mass': 'Mass send — 20+ recipients, not from Classy/HubSpot',
  'classy-onetime': 'Classy donation notification — "donation", "gift", or "contribution" in subject',
  'team': 'Internal — sender is @freshfoodconnect.org',
  'classy-recurring': 'Classy platform email — from Classy domain',
  'calendar-notif': 'Google Calendar notification',
  'docs-activity': 'Google Drive/Docs activity email',
  'automated': 'System/automated email — noreply, no-reply, or notifications@ sender',
  'newsletter': 'Newsletter/list email — has List-Unsubscribe or List-Id header',
  'sales': 'Likely sales/spam — cold outreach signals or learned sender',
  'invoices': 'Invoice, receipt, or payment notification',
  'to-do': 'Marked as to-do by user',
};

function classifyExplanation(bucket, email) {
  const rule = BUCKET_RULES[bucket];
  if (!rule) return `Classified as "${bucket}"`;

  const details = [];
  const from = (email?.from || '').toLowerCase();
  const subject = (email?.subject || '').toLowerCase();

  if (bucket === 'needs-response') {
    if (/dropboxsign|hellosign/.test(from)) details.push('Sender is DropboxSign/HelloSign (always needs response)');
    else details.push(`${email?.recipientCount || '?'} recipients (≤3 threshold)`);
  }
  if (bucket === 'fyi-mass') details.push(`${email?.recipientCount || '?'} recipients (≥20 threshold)`);
  if (bucket === 'team' && from.includes('freshfoodconnect.org')) details.push(`From: ${from}`);
  if (bucket === 'classy-onetime' && /classy/.test(from)) details.push(`From Classy, subject contains donation keyword`);
  if (bucket === 'newsletter') details.push('Has List-Unsubscribe or List-Id header');
  if (bucket === 'automated' && /noreply|no-reply|notifications@/.test(from)) details.push(`Sender: ${from}`);
  if (bucket === 'sales') details.push('Matched sales/spam signals');

  return `${rule}${details.length ? '. ' + details.join('; ') : ''}`;
}

// ── F4: Donor intent signal ──────────────────────────────────────────────────

function detectDonorIntent(email, donationDomains) {
  const from = (email?.from || '').toLowerCase();
  const subject = (email?.subject || '').toLowerCase();

  // Check Classy notifications
  if (/classy\.org/.test(from) && /donat|gift|contribut|pledge/.test(subject)) {
    return { isDonor: true, signal: 'Classy donation notification', level: 'active' };
  }

  // Check known donation-related domains
  if (donationDomains && donationDomains.some(d => from.includes(d))) {
    return { isDonor: true, signal: 'Known donor domain', level: 'known' };
  }

  // Check subject keywords
  if (/major gift|planned giving|annual fund|capital campaign|endowment/.test(subject)) {
    return { isDonor: true, signal: 'Fundraising keyword in subject', level: 'prospect' };
  }

  return { isDonor: false, signal: null, level: null };
}

// ── F1: Focus briefing — parse/validate structure ────────────────────────────

function parseFocusBriefing(text) {
  if (!text || !text.trim()) return [];
  // Split on numbered items or bullet points
  const lines = text.split(/\n/).filter(l => l.trim());
  const items = [];
  for (const line of lines) {
    const cleaned = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '').trim();
    if (cleaned.length > 5) items.push(cleaned);
  }
  return items.slice(0, 5); // Cap at 5 items
}

function buildFocusPromptContext(emails, events, tasks) {
  const parts = [];
  if (emails?.length) parts.push(`${emails.length} unread emails (${emails.filter(e => e.bucket === 'needs-response').length} need response)`);
  if (events?.length) parts.push(`${events.length} meetings today`);
  if (tasks?.length) {
    const overdue = tasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < new Date());
    const pending = tasks.filter(t => !t.done);
    parts.push(`${pending.length} pending tasks${overdue.length ? ` (${overdue.length} overdue)` : ''}`);
  }
  return parts.join(', ');
}

// ── F3: Triage recommendation parsing ────────────────────────────────────────

function parseTriageRecommendation(text) {
  // Expected format from AI: "RESPOND: reason" or "ARCHIVE: reason" or "DEFER: reason"
  const match = text.match(/^(RESPOND|ARCHIVE|DEFER|DELETE|FLAG):\s*(.+)/i);
  if (match) return { action: match[1].toLowerCase(), reason: match[2].trim() };
  // Fallback: try to infer
  const lower = (text || '').toLowerCase();
  if (/respond|reply|answer/.test(lower)) return { action: 'respond', reason: text };
  if (/archive|skip|ignore/.test(lower)) return { action: 'archive', reason: text };
  if (/defer|later|snooze/.test(lower)) return { action: 'defer', reason: text };
  return { action: 'unknown', reason: text || 'Could not determine' };
}

function buildTriagePrompt(emails) {
  return emails.map((e, i) =>
    `Email ${i + 1}: From="${e.from}" Subject="${e.subject}" Snippet="${(e.snippet || '').slice(0, 100)}"`
  ).join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("classifyExplanation", () => {
  test("explains needs-response for DropboxSign", () => {
    const r = classifyExplanation('needs-response', { from: 'noreply@dropboxsign.com' });
    expect(r).toContain('DropboxSign');
    expect(r).toContain('always needs response');
  });

  test("explains needs-response by recipient count", () => {
    const r = classifyExplanation('needs-response', { from: 'pat@acme.org', recipientCount: 2 });
    expect(r).toContain('2 recipients');
    expect(r).toContain('≤3');
  });

  test("explains fyi-mass with count", () => {
    const r = classifyExplanation('fyi-mass', { from: 'newsletter@org.com', recipientCount: 25 });
    expect(r).toContain('25 recipients');
    expect(r).toContain('≥20');
  });

  test("explains team with sender domain", () => {
    const r = classifyExplanation('team', { from: 'laura@freshfoodconnect.org' });
    expect(r).toContain('freshfoodconnect.org');
  });

  test("explains newsletter", () => {
    const r = classifyExplanation('newsletter', { from: 'news@org.com' });
    expect(r).toContain('List-Unsubscribe');
  });

  test("returns generic for unknown bucket", () => {
    const r = classifyExplanation('weird-bucket', {});
    expect(r).toContain('weird-bucket');
  });

  test("explains sales bucket", () => {
    const r = classifyExplanation('sales', { from: 'sales@spamco.com' });
    expect(r).toContain('sales/spam');
  });

  test("explains automated with sender", () => {
    const r = classifyExplanation('automated', { from: 'noreply@system.com' });
    expect(r).toContain('noreply@system.com');
  });
});

describe("detectDonorIntent", () => {
  test("detects Classy donation", () => {
    const r = detectDonorIntent({ from: 'noreply@classy.org', subject: 'New donation received' });
    expect(r.isDonor).toBe(true);
    expect(r.signal).toContain('Classy');
    expect(r.level).toBe('active');
  });

  test("detects known donor domain", () => {
    const r = detectDonorIntent({ from: 'pat@donor.org', subject: 'Hello' }, ['donor.org']);
    expect(r.isDonor).toBe(true);
    expect(r.level).toBe('known');
  });

  test("detects fundraising keyword", () => {
    const r = detectDonorIntent({ from: 'someone@gmail.com', subject: 'Re: major gift discussion' });
    expect(r.isDonor).toBe(true);
    expect(r.level).toBe('prospect');
  });

  test("no signal for regular email", () => {
    const r = detectDonorIntent({ from: 'pat@acme.com', subject: 'Meeting tomorrow' });
    expect(r.isDonor).toBe(false);
  });

  test("handles null email", () => {
    const r = detectDonorIntent(null);
    expect(r.isDonor).toBe(false);
  });

  test("handles empty donor domains", () => {
    const r = detectDonorIntent({ from: 'pat@acme.com', subject: 'Hi' }, []);
    expect(r.isDonor).toBe(false);
  });
});

describe("parseFocusBriefing", () => {
  test("parses numbered items", () => {
    const r = parseFocusBriefing("1. Reply to donor email\n2. Prep for board meeting\n3. Review grant proposal");
    expect(r).toHaveLength(3);
    expect(r[0]).toBe("Reply to donor email");
  });

  test("parses bullet items", () => {
    const r = parseFocusBriefing("- Reply to Pat\n- Check Classy dashboard\n- Send weekly update");
    expect(r).toHaveLength(3);
  });

  test("caps at 5 items", () => {
    const r = parseFocusBriefing("1. A\n2. B\n3. C\n4. D\n5. E\n6. F\n7. G");
    expect(r.length).toBeLessThanOrEqual(5);
  });

  test("returns empty for null", () => {
    expect(parseFocusBriefing(null)).toEqual([]);
  });

  test("returns empty for empty string", () => {
    expect(parseFocusBriefing("")).toEqual([]);
  });

  test("filters short lines", () => {
    const r = parseFocusBriefing("1. Do this important thing\n2. OK\n3. Also do that");
    // "OK" is only 2 chars, should be filtered
    expect(r).toHaveLength(2);
  });
});

describe("buildFocusPromptContext", () => {
  test("includes email count with needs-response", () => {
    const emails = [{ bucket: 'needs-response' }, { bucket: 'team' }, { bucket: 'needs-response' }];
    const r = buildFocusPromptContext(emails, [], []);
    expect(r).toContain('3 unread emails');
    expect(r).toContain('2 need response');
  });

  test("includes meeting count", () => {
    const r = buildFocusPromptContext([], [{}, {}], []);
    expect(r).toContain('2 meetings');
  });

  test("includes overdue tasks", () => {
    const tasks = [
      { done: false, dueDate: '2020-01-01' },
      { done: false },
      { done: true, dueDate: '2020-01-01' },
    ];
    const r = buildFocusPromptContext([], [], tasks);
    expect(r).toContain('2 pending');
    expect(r).toContain('1 overdue');
  });

  test("handles all empty", () => {
    expect(buildFocusPromptContext([], [], [])).toBe('');
  });
});

describe("parseTriageRecommendation", () => {
  test("parses RESPOND format", () => {
    const r = parseTriageRecommendation("RESPOND: This is from a donor, reply within 24h");
    expect(r.action).toBe('respond');
    expect(r.reason).toContain('donor');
  });

  test("parses ARCHIVE format", () => {
    const r = parseTriageRecommendation("ARCHIVE: Automated notification, no action needed");
    expect(r.action).toBe('archive');
  });

  test("parses DEFER format", () => {
    const r = parseTriageRecommendation("DEFER: Can wait until next week");
    expect(r.action).toBe('defer');
  });

  test("case insensitive", () => {
    const r = parseTriageRecommendation("respond: needs a reply");
    expect(r.action).toBe('respond');
  });

  test("fallback inference for reply keyword", () => {
    const r = parseTriageRecommendation("You should reply to this soon");
    expect(r.action).toBe('respond');
  });

  test("fallback inference for archive keyword", () => {
    const r = parseTriageRecommendation("Safe to archive this one");
    expect(r.action).toBe('archive');
  });

  test("unknown for ambiguous text", () => {
    const r = parseTriageRecommendation("This is interesting");
    expect(r.action).toBe('unknown');
  });

  test("handles empty text", () => {
    const r = parseTriageRecommendation("");
    expect(r.action).toBe('unknown');
  });
});

describe("buildTriagePrompt", () => {
  test("formats emails with index", () => {
    const emails = [
      { from: "pat@acme.org", subject: "Hello", snippet: "Hi there" },
      { from: "news@org.com", subject: "Newsletter", snippet: "This week" },
    ];
    const r = buildTriagePrompt(emails);
    expect(r).toContain('Email 1:');
    expect(r).toContain('Email 2:');
    expect(r).toContain('pat@acme.org');
  });

  test("truncates long snippets", () => {
    const emails = [{ from: "a@b.com", subject: "X", snippet: "x".repeat(200) }];
    const r = buildTriagePrompt(emails);
    expect(r.length).toBeLessThan(250);
  });
});
