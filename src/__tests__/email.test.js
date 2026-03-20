const { buildRawEmail } = require('../lib/email');

function decodeRaw(raw) {
  // Reverse the base64url encoding used by Gmail API
  const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

describe('buildRawEmail', () => {
  const base = { to: 'donor@example.com', subject: 'Thank you', body: 'Hello there.' };

  test('returns a non-empty string', () => {
    const raw = buildRawEmail(base);
    expect(typeof raw).toBe('string');
    expect(raw.length).toBeGreaterThan(0);
  });

  test('output is valid base64url (no +, /, or = padding)', () => {
    const raw = buildRawEmail(base);
    expect(raw).not.toContain('+');
    expect(raw).not.toContain('/');
    expect(raw).not.toMatch(/=+$/);
  });

  test('decoded email contains To header', () => {
    const raw = buildRawEmail(base);
    expect(decodeRaw(raw)).toContain('To: donor@example.com');
  });

  test('decoded email contains Subject header', () => {
    const raw = buildRawEmail(base);
    expect(decodeRaw(raw)).toContain('Subject: Thank you');
  });

  test('decoded email contains body', () => {
    const raw = buildRawEmail(base);
    expect(decodeRaw(raw)).toContain('Hello there.');
  });

  test('decoded email contains MIME headers', () => {
    const raw = buildRawEmail(base);
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('Content-Type: text/plain; charset=utf-8');
    expect(decoded).toContain('MIME-Version: 1.0');
  });

  test('Cc header included when cc is provided', () => {
    const raw = buildRawEmail({ ...base, cc: 'team@ffc.org' });
    expect(decodeRaw(raw)).toContain('Cc: team@ffc.org');
  });

  test('Cc header absent when cc is not provided', () => {
    const raw = buildRawEmail(base);
    expect(decodeRaw(raw)).not.toContain('Cc:');
  });

  test('In-Reply-To header included when inReplyTo is provided', () => {
    const raw = buildRawEmail({ ...base, inReplyTo: '<msg123@mail.gmail.com>' });
    expect(decodeRaw(raw)).toContain('In-Reply-To: <msg123@mail.gmail.com>');
  });

  test('References header defaults to inReplyTo when references not provided', () => {
    const raw = buildRawEmail({ ...base, inReplyTo: '<msg123@mail.gmail.com>' });
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('References: <msg123@mail.gmail.com>');
  });

  test('References uses explicit value when provided', () => {
    const raw = buildRawEmail({ ...base, inReplyTo: '<msg1@gmail.com>', references: '<msg0@gmail.com> <msg1@gmail.com>' });
    expect(decodeRaw(raw)).toContain('References: <msg0@gmail.com> <msg1@gmail.com>');
  });

  test('signature appended after separator when provided', () => {
    const raw = buildRawEmail({ ...base, signature: 'Kayla\nFresh Food Connect' });
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('\n--\nKayla\nFresh Food Connect');
  });

  test('no signature separator when signature is absent', () => {
    const raw = buildRawEmail(base);
    expect(decodeRaw(raw)).not.toContain('\n--\n');
  });

  test('forward includes forwarded message block', () => {
    const raw = buildRawEmail({ ...base, forward: true, originalBody: 'Original message content.' });
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('---------- Forwarded message ---------');
    expect(decoded).toContain('Original message content.');
  });

  test('forward without originalBody does not add forward block', () => {
    const raw = buildRawEmail({ ...base, forward: true });
    const decoded = decodeRaw(raw);
    expect(decoded).not.toContain('Forwarded message');
  });

  test('body with unicode characters encodes correctly', () => {
    const raw = buildRawEmail({ ...base, body: 'Merci beaucoup! Naïve café résumé.' });
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('Naïve café résumé');
  });

  test('empty cc string does not add Cc header', () => {
    const raw = buildRawEmail({ ...base, cc: '' });
    expect(decodeRaw(raw)).not.toContain('Cc:');
  });
});
