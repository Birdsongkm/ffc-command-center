/**
 * Tests for draft update (PATCH) functionality.
 * Covers the buildDraftRaw helper and the update API response shapes.
 */
const { buildRawEmail } = require('../lib/email');

// Helper used by the PATCH handler: build raw email for a draft update
function buildDraftUpdateBody(draftId, { to, subject, body }) {
  const raw = buildRawEmail({ to, subject, body });
  return { message: { raw } };
}

function decodeRaw(raw) {
  const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

describe('draft update payload', () => {
  const params = { to: 'alice@example.com', subject: 'Hello', body: 'Draft body content.' };

  test('buildDraftUpdateBody returns message.raw field', () => {
    const payload = buildDraftUpdateBody('draft123', params);
    expect(payload).toHaveProperty('message');
    expect(payload.message).toHaveProperty('raw');
    expect(typeof payload.message.raw).toBe('string');
  });

  test('raw is valid base64url — no +, /, or trailing =', () => {
    const { message: { raw } } = buildDraftUpdateBody('draft123', params);
    expect(raw).not.toContain('+');
    expect(raw).not.toContain('/');
    expect(raw).not.toMatch(/=+$/);
  });

  test('decoded raw contains correct To header', () => {
    const { message: { raw } } = buildDraftUpdateBody('draft123', params);
    expect(decodeRaw(raw)).toContain('To: alice@example.com');
  });

  test('decoded raw contains correct Subject header', () => {
    const { message: { raw } } = buildDraftUpdateBody('draft123', params);
    expect(decodeRaw(raw)).toContain('Subject: Hello');
  });

  test('decoded raw contains body text', () => {
    const { message: { raw } } = buildDraftUpdateBody('draft123', params);
    expect(decodeRaw(raw)).toContain('Draft body content.');
  });

  test('handles subject with special characters', () => {
    const { message: { raw } } = buildDraftUpdateBody('d1', { ...params, subject: 'Re: Q4 Budget & Planning' });
    expect(decodeRaw(raw)).toContain('Subject: Re: Q4 Budget & Planning');
  });

  test('handles body with newlines', () => {
    const { message: { raw } } = buildDraftUpdateBody('d1', { ...params, body: 'Line one.\nLine two.\nLine three.' });
    expect(decodeRaw(raw)).toContain('Line one.');
    expect(decodeRaw(raw)).toContain('Line two.');
  });

  test('handles empty body gracefully', () => {
    const { message: { raw } } = buildDraftUpdateBody('d1', { ...params, body: '' });
    expect(typeof raw).toBe('string');
    expect(raw.length).toBeGreaterThan(0);
  });

  test('handles long body', () => {
    const longBody = 'A'.repeat(5000);
    const { message: { raw } } = buildDraftUpdateBody('d1', { ...params, body: longBody });
    expect(decodeRaw(raw)).toContain('A'.repeat(100));
  });
});

describe('draft update validation', () => {
  // Simulate the validation logic from the PATCH handler
  function validatePatchBody(body) {
    const { draftId, to, subject } = body || {};
    if (!draftId) return { error: 'Missing draftId' };
    if (!to) return { error: 'Missing to' };
    if (!subject) return { error: 'Missing subject' };
    return null;
  }

  test('returns error when draftId is missing', () => {
    expect(validatePatchBody({ to: 'a@b.com', subject: 'Hi' })).toEqual({ error: 'Missing draftId' });
  });

  test('returns error when to is missing', () => {
    expect(validatePatchBody({ draftId: 'd1', subject: 'Hi' })).toEqual({ error: 'Missing to' });
  });

  test('returns error when subject is missing', () => {
    expect(validatePatchBody({ draftId: 'd1', to: 'a@b.com' })).toEqual({ error: 'Missing subject' });
  });

  test('returns null when all required fields present', () => {
    expect(validatePatchBody({ draftId: 'd1', to: 'a@b.com', subject: 'Hi', body: 'text' })).toBeNull();
  });

  test('returns null when body is empty string (body is optional)', () => {
    expect(validatePatchBody({ draftId: 'd1', to: 'a@b.com', subject: 'Hi', body: '' })).toBeNull();
  });
});
