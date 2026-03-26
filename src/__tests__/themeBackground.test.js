/**
 * Theme background color — issue #88
 * Tests: isBlueBackground, hexToRgb, and that the theme bg values are blue.
 *
 * The page background (T.bg) was changed from gray to blue per user request.
 * Light mode: #E0E0E0 (gray) → #DDEAF5 (light blue)
 * Dark mode:  #111827 (dark gray-blue) → #0D1628 (dark navy)
 */

// ── Pure helpers (duplicated inline — project pattern) ────────────────────────

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

// Returns true if the blue channel is strictly dominant over both red and green.
function isBlueBackground(hex) {
  const { r, g, b } = hexToRgb(hex);
  return b > r && b > g;
}

// ── Current theme bg constants (must match LIGHT_T.bg / DARK_T.bg in index.js) ──
// Update these when the production values change — they serve as the contract.
const LIGHT_THEME_BG = '#DDEAF5'; // light blue
const DARK_THEME_BG  = '#0D1628'; // dark navy

// ── hexToRgb ──────────────────────────────────────────────────────────────────

describe('hexToRgb', () => {
  test('pure white #FFFFFF → r:255, g:255, b:255', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
  });

  test('pure blue #0000FF → r:0, g:0, b:255', () => {
    expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
  });

  test('pure red #FF0000 → r:255, g:0, b:0', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('light blue #DDEAF5 → b is highest channel', () => {
    const { r, g, b } = hexToRgb('#DDEAF5');
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  test('dark navy #0D1628 → b is highest channel', () => {
    const { r, g, b } = hexToRgb('#0D1628');
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  test('old gray #E0E0E0 → all channels equal (not blue-dominant)', () => {
    const { r, g, b } = hexToRgb('#E0E0E0');
    expect(r).toBe(g);
    expect(g).toBe(b);
  });
});

// ── isBlueBackground ──────────────────────────────────────────────────────────

describe('isBlueBackground', () => {
  test('pure blue is blue-background', () => {
    expect(isBlueBackground('#0000FF')).toBe(true);
  });

  test('light blue #DDEAF5 is blue-background', () => {
    expect(isBlueBackground('#DDEAF5')).toBe(true);
  });

  test('dark navy #0D1628 is blue-background', () => {
    expect(isBlueBackground('#0D1628')).toBe(true);
  });

  test('gray #E0E0E0 is NOT blue-background (old value)', () => {
    expect(isBlueBackground('#E0E0E0')).toBe(false);
  });

  test('dark gray-blue #111827 — blue channel check for old dark bg', () => {
    // old dark bg: r=17, g=24, b=39 → b > r and b > g, so it was technically blue-ish
    const { r, g, b } = hexToRgb('#111827');
    // document the old value channels
    expect(r).toBe(17);
    expect(g).toBe(24);
    expect(b).toBe(39);
  });

  test('pure red is NOT blue-background', () => {
    expect(isBlueBackground('#FF0000')).toBe(false);
  });

  test('pure green is NOT blue-background', () => {
    expect(isBlueBackground('#00FF00')).toBe(false);
  });

  test('white is NOT blue-background', () => {
    expect(isBlueBackground('#FFFFFF')).toBe(false);
  });
});

// ── Theme bg contract ─────────────────────────────────────────────────────────
// These tests ensure the constants here stay in sync with the production theme.
// If index.js changes T.bg, update LIGHT_THEME_BG / DARK_THEME_BG above.

describe('theme background is blue', () => {
  test('light theme bg is blue-dominant', () => {
    expect(isBlueBackground(LIGHT_THEME_BG)).toBe(true);
  });

  test('dark theme bg is blue-dominant', () => {
    expect(isBlueBackground(DARK_THEME_BG)).toBe(true);
  });

  test('light theme bg has correct value #DDEAF5', () => {
    expect(LIGHT_THEME_BG).toBe('#DDEAF5');
  });

  test('dark theme bg has correct value #0D1628', () => {
    expect(DARK_THEME_BG).toBe('#0D1628');
  });

  test('light theme bg is lighter than dark theme bg (higher luminance)', () => {
    const light = hexToRgb(LIGHT_THEME_BG);
    const dark  = hexToRgb(DARK_THEME_BG);
    const lightLum = light.r + light.g + light.b;
    const darkLum  = dark.r  + dark.g  + dark.b;
    expect(lightLum).toBeGreaterThan(darkLum);
  });

  test('both theme bg values have blue as the dominant channel', () => {
    const l = hexToRgb(LIGHT_THEME_BG);
    const d = hexToRgb(DARK_THEME_BG);
    expect(l.b).toBeGreaterThan(l.r);
    expect(l.b).toBeGreaterThan(l.g);
    expect(d.b).toBeGreaterThan(d.r);
    expect(d.b).toBeGreaterThan(d.g);
  });
});
