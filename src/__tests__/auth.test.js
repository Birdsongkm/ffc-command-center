const { parseCookies } = require('../lib/auth');

// Note: refreshToken and getToken require fetch + Google OAuth — tested via integration.
// parseCookies is a pure function and fully unit-testable.

describe('parseCookies', () => {
  test('empty cookie string → empty object', () => {
    expect(parseCookies({ headers: { cookie: '' } })).toEqual({});
  });

  test('no cookie header → empty object', () => {
    expect(parseCookies({ headers: {} })).toEqual({});
  });

  test('single cookie', () => {
    expect(parseCookies({ headers: { cookie: 'ffc_at=abc123' } })).toEqual({ ffc_at: 'abc123' });
  });

  test('multiple cookies', () => {
    const result = parseCookies({ headers: { cookie: 'ffc_at=abc; ffc_rt=xyz; ffc_exp=9999' } });
    expect(result.ffc_at).toBe('abc');
    expect(result.ffc_rt).toBe('xyz');
    expect(result.ffc_exp).toBe('9999');
  });

  test('cookie value with = sign (base64)', () => {
    const result = parseCookies({ headers: { cookie: 'ffc_at=abc=def==' } });
    expect(result.ffc_at).toBe('abc=def==');
  });

  test('cookie with extra whitespace around semicolon', () => {
    const result = parseCookies({ headers: { cookie: 'ffc_at=abc ;  ffc_rt=xyz' } });
    expect(result.ffc_at).toBe('abc');
    expect(result.ffc_rt).toBe('xyz');
  });

  test('empty cookie key is skipped', () => {
    const result = parseCookies({ headers: { cookie: '=val; ffc_at=abc' } });
    expect(result.ffc_at).toBe('abc');
    expect(result['']).toBeUndefined();
  });

  test('all three ffc cookies present', () => {
    const exp = String(Date.now() + 3600000);
    const result = parseCookies({
      headers: { cookie: `ffc_at=token123; ffc_rt=refresh456; ffc_exp=${exp}` },
    });
    expect(result.ffc_at).toBe('token123');
    expect(result.ffc_rt).toBe('refresh456');
    expect(result.ffc_exp).toBe(exp);
  });
});
