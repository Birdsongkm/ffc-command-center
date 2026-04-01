/**
 * Payroll review flow — issue #94
 * Tests: isPayrollEmail, getPayrollChanges
 *
 * When a "Payroll Approval" email arrives from @dnatsi.com, the dashboard
 * should offer a payroll review that compares the current PDF to the last 4
 * previous payroll PDFs and highlights changes. Approving creates a draft reply.
 */

// ── Pure helpers (duplicated inline — project pattern) ─────────────────────────

function isPayrollEmail(email) {
  if (!email) return false;
  const from = (email.from || '').toLowerCase();
  const subj = (email.subject || '').toLowerCase();
  return from.includes('@dnatsi.com') && subj.includes('payroll approval');
}

function getPayrollChanges(currentLines, prevLines) {
  const currentSet = new Set((currentLines || []).filter(l => l.trim()));
  const prevSet = new Set((prevLines || []).filter(l => l.trim()));
  const added = [];
  const removed = [];
  const unchanged = [];
  currentSet.forEach(l => {
    if (prevSet.has(l)) unchanged.push(l);
    else added.push(l);
  });
  prevSet.forEach(l => {
    if (!currentSet.has(l)) removed.push(l);
  });
  return { added, removed, unchanged };
}

// ── isPayrollEmail ─────────────────────────────────────────────────────────────

describe('isPayrollEmail', () => {
  test('from @dnatsi.com + subject "Payroll Approval" → true', () => {
    expect(isPayrollEmail({ from: 'Sarah Hoague <sarah@dnatsi.com>', subject: 'Payroll Approval' })).toBe(true);
  });

  test('from @dnatsi.com + subject lowercase "payroll approval" → true', () => {
    expect(isPayrollEmail({ from: 'sarah@dnatsi.com', subject: 'payroll approval' })).toBe(true);
  });

  test('from @dnatsi.com + subject "RE: Payroll Approval" → true', () => {
    expect(isPayrollEmail({ from: 'sarah@dnatsi.com', subject: 'RE: Payroll Approval' })).toBe(true);
  });

  test('from other domain + subject "Payroll Approval" → false', () => {
    expect(isPayrollEmail({ from: 'payroll@example.com', subject: 'Payroll Approval' })).toBe(false);
  });

  test('from @dnatsi.com + unrelated subject → false', () => {
    expect(isPayrollEmail({ from: 'sarah@dnatsi.com', subject: 'Payroll Reminder' })).toBe(false);
  });

  test('from @dnatsi.com + empty subject → false', () => {
    expect(isPayrollEmail({ from: 'sarah@dnatsi.com', subject: '' })).toBe(false);
  });

  test('null email → false', () => {
    expect(isPayrollEmail(null)).toBe(false);
  });

  test('missing from field → false', () => {
    expect(isPayrollEmail({ subject: 'Payroll Approval' })).toBe(false);
  });

  test('mixed-case domain still matches', () => {
    expect(isPayrollEmail({ from: 'Sarah@DNATSI.COM', subject: 'Payroll Approval' })).toBe(true);
  });

  test('subject with extra text still matches', () => {
    expect(isPayrollEmail({ from: 'sarah@dnatsi.com', subject: 'FWD: Payroll Approval 2026-04-01' })).toBe(true);
  });
});

// ── getPayrollChanges ──────────────────────────────────────────────────────────

describe('getPayrollChanges', () => {
  test('identical lines → no added or removed', () => {
    const lines = ['Laura Lavid  $4,500.00', 'Carmen Alcantara  $3,800.00'];
    const result = getPayrollChanges(lines, lines);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.unchanged).toHaveLength(2);
  });

  test('line only in current → in added', () => {
    const result = getPayrollChanges(['New Employee  $3,000.00'], []);
    expect(result.added).toContain('New Employee  $3,000.00');
    expect(result.removed).toHaveLength(0);
  });

  test('line only in previous → in removed', () => {
    const result = getPayrollChanges([], ['Former Employee  $3,500.00']);
    expect(result.removed).toContain('Former Employee  $3,500.00');
    expect(result.added).toHaveLength(0);
  });

  test('common lines → in unchanged', () => {
    const shared = 'Gretchen Roberts  $4,200.00';
    const result = getPayrollChanges([shared, 'Extra Line'], [shared]);
    expect(result.unchanged).toContain(shared);
  });

  test('empty current, non-empty previous → all removed', () => {
    const prev = ['Line A', 'Line B'];
    const result = getPayrollChanges([], prev);
    expect(result.removed).toHaveLength(2);
    expect(result.added).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });

  test('non-empty current, empty previous → all added', () => {
    const current = ['Line A', 'Line B'];
    const result = getPayrollChanges(current, []);
    expect(result.added).toHaveLength(2);
    expect(result.removed).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });

  test('both empty → all arrays empty', () => {
    const result = getPayrollChanges([], []);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });

  test('whitespace-only lines excluded from comparison', () => {
    const result = getPayrollChanges(['  ', '\t', ''], ['  ']);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });

  test('returns plain arrays (not Sets) for iterable render', () => {
    const result = getPayrollChanges(['A'], ['B']);
    expect(Array.isArray(result.added)).toBe(true);
    expect(Array.isArray(result.removed)).toBe(true);
    expect(Array.isArray(result.unchanged)).toBe(true);
  });

  test('null inputs treated as empty', () => {
    const result = getPayrollChanges(null, null);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });

  test('salary change shows as added + removed (not same)', () => {
    const current = ['Laura Lavid  $4,750.00'];
    const prev = ['Laura Lavid  $4,500.00'];
    const result = getPayrollChanges(current, prev);
    expect(result.added).toContain('Laura Lavid  $4,750.00');
    expect(result.removed).toContain('Laura Lavid  $4,500.00');
    expect(result.unchanged).toHaveLength(0);
  });
});
