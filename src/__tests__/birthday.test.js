/**
 * Birthday automation helpers
 * Tests: extractBirthdayName
 */

// ── Pure helper (duplicated inline — project pattern) ─────────────────────────

function extractBirthdayName(summary) {
  return (summary || '')
    .replace(/[\u0027\u2018\u2019`]s?\s*birthday\s*$/i, '')
    .replace(/^birthday\s*[-–:]\s*/i, '')
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
});
