/**
 * Birthday automation helpers
 * Tests: extractBirthdayName
 */

// ── Pure helper (duplicated inline — project pattern) ─────────────────────────

function extractBirthdayName(summary) {
  return (summary || '')
    .replace(/[\u0027\u2018\u2019`]s?\s*(b-?day|birthday)\s*$/i, '')
    .replace(/^(b-?day|birthday)\s*[-–:]\s*/i, '')
    .trim();
}

// ── extractBirthdayName ───────────────────────────────────────────────────────

describe('extractBirthdayName', () => {
  test("\"John Smith's birthday\" → \"John Smith\"", () => {
    expect(extractBirthdayName("John Smith's birthday")).toBe('John Smith');
  });

  test("\"Bill Johnson's birthday\" → \"Bill Johnson\"", () => {
    expect(extractBirthdayName("Bill Johnson's birthday")).toBe('Bill Johnson');
  });

  test('"Birthday - John Smith" → "John Smith"', () => {
    expect(extractBirthdayName('Birthday - John Smith')).toBe('John Smith');
  });

  test('"Birthday: Carmen" → "Carmen"', () => {
    expect(extractBirthdayName('Birthday: Carmen')).toBe('Carmen');
  });

  test('case-insensitive: "JOHN SMITH\'S BIRTHDAY" → "JOHN SMITH"', () => {
    expect(extractBirthdayName("JOHN SMITH'S BIRTHDAY")).toBe('JOHN SMITH');
  });

  test('handles curly apostrophe', () => {
    expect(extractBirthdayName("Laura\u2019s birthday")).toBe('Laura');
  });

  test('empty string → empty string', () => {
    expect(extractBirthdayName('')).toBe('');
  });

  test('undefined → empty string', () => {
    expect(extractBirthdayName(undefined)).toBe('');
  });

  test('trims whitespace from result', () => {
    expect(extractBirthdayName("  Adjoa Kittoe's birthday  ")).toBe('Adjoa Kittoe');
  });

  test('first name extraction from full name', () => {
    const name = extractBirthdayName("Gretchen Roberts's birthday");
    expect(name.split(' ')[0]).toBe('Gretchen');
  });

  test("\"Bill Johnson's Bday\" → \"Bill Johnson\"", () => {
    expect(extractBirthdayName("Bill Johnson's Bday")).toBe('Bill Johnson');
  });

  test("\"Bill Johnson's bday\" → \"Bill Johnson\"", () => {
    expect(extractBirthdayName("Bill Johnson's bday")).toBe('Bill Johnson');
  });

  test("\"Bill Johnson's B-Day\" → \"Bill Johnson\"", () => {
    expect(extractBirthdayName("Bill Johnson's B-Day")).toBe('Bill Johnson');
  });

  test('\"Bday - Carmen\" → \"Carmen\"', () => {
    expect(extractBirthdayName('Bday - Carmen')).toBe('Carmen');
  });
});

// ── Birthday recipient routing (#111) ────────────────────────────────────────
// Birthday person should be in To, everyone else in CC.

function initBirthdayRecipients(bdayName, recipients) {
  const name = (bdayName || '').toLowerCase();
  const allAddrs = [recipients.to, recipients.cc].filter(Boolean).join(', ')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!name || allAddrs.length === 0) return { to: recipients.to || '', cc: recipients.cc || '' };
  const bdayAddr = allAddrs.find(a => {
    const namePart = a.replace(/<[^>]*>/, '').toLowerCase();
    const nameParts = name.split(/\s+/);
    return nameParts.some(p => p.length > 1 && namePart.includes(p));
  });
  if (bdayAddr) {
    const rest = allAddrs.filter(a => a !== bdayAddr);
    return { to: bdayAddr, cc: rest.join(', ') };
  }
  return { to: recipients.to || '', cc: recipients.cc || '' };
}

describe('initBirthdayRecipients (#111)', () => {
  test('birthday person moves from CC to To', () => {
    const result = initBirthdayRecipients('Jada Smith', {
      to: 'bill@example.com',
      cc: 'jada@example.com, carmen@example.com',
    });
    expect(result.to).toBe('jada@example.com');
    expect(result.cc).toBe('bill@example.com, carmen@example.com');
  });

  test('birthday person already in To stays in To', () => {
    const result = initBirthdayRecipients('Jada Smith', {
      to: 'Jada Smith <jada@example.com>',
      cc: 'bill@example.com',
    });
    expect(result.to).toBe('Jada Smith <jada@example.com>');
    expect(result.cc).toBe('bill@example.com');
  });

  test('matches by first name when last name missing', () => {
    const result = initBirthdayRecipients('Jada', {
      to: 'bill@example.com',
      cc: 'jada@freshfoodconnect.org, carmen@example.com',
    });
    expect(result.to).toBe('jada@freshfoodconnect.org');
    expect(result.cc).toContain('bill@example.com');
  });

  test('falls back to original when no name match', () => {
    const result = initBirthdayRecipients('Unknown Person', {
      to: 'bill@example.com',
      cc: 'carmen@example.com',
    });
    expect(result.to).toBe('bill@example.com');
    expect(result.cc).toBe('carmen@example.com');
  });

  test('handles empty recipients gracefully', () => {
    const result = initBirthdayRecipients('Jada', { to: '', cc: '' });
    expect(result.to).toBe('');
    expect(result.cc).toBe('');
  });
});
