/**
 * Dark mode — issue #83
 * Tests: theme object completeness, brightness polarity, localStorage preference.
 */

// Duplicated inline per project pattern (no imports from index.js)
const LIGHT_T = {
  bg: "#E0E0E0", surface: "#FFFFFF", card: "#FFFFFF", cardHover: "#D4D4D4",
  border: "#D8E4D2", borderLight: "#E8F0E4", text: "#2C3E2C", textMuted: "#6B8068",
  textDim: "#94AC8E", accent: "#4A9B4A", accentDark: "#357A35", accentBg: "#E8F5E8",
  gold: "#C4942A", goldBg: "#FFF8E8", danger: "#D45555", dangerBg: "#FFF0F0",
  info: "#4A8BB5", infoBg: "#EDF5FB", white: "#FFFFFF",
  emailBlue: "#3B82C4", emailBlueBg: "#EBF3FB", emailBlueBorder: "#B8D4F0",
  calGreen: "#3A9B5A", calGreenBg: "#E6F5EC", calGreenBorder: "#A8DDB8",
  taskAmber: "#C4942A", taskAmberBg: "#FFF8E8", taskAmberBorder: "#E8D5A0",
  driveViolet: "#7C5AC4", driveVioletBg: "#F0EBF9", driveVioletBorder: "#C4B0E8",
  urgentCoral: "#D45555", urgentCoralBg: "#FFF0F0", urgentCoralBorder: "#F0B8B8",
  stickyYellow: "#F5E642", stickyYellowBg: "#FFFDE8", stickyYellowBorder: "#E8E0A0",
  leafDecor: "#4A9B4A",
};

const DARK_T = {
  bg: "#111827", surface: "#1F2937", card: "#1F2937", cardHover: "#2D3748",
  border: "#2A4A2A", borderLight: "#1A3020", text: "#E8F0E8", textMuted: "#9CAE98",
  textDim: "#7A9278", accent: "#5AAD5A", accentDark: "#4A9B4A", accentBg: "#0F2010",
  gold: "#D4A840", goldBg: "#1F1A00", danger: "#E06868", dangerBg: "#200808",
  info: "#5A9BC5", infoBg: "#0A1820", white: "#1F2937",
  emailBlue: "#4A90D4", emailBlueBg: "#0A1828", emailBlueBorder: "#1A3855",
  calGreen: "#4AAD6A", calGreenBg: "#081A10", calGreenBorder: "#1A4A28",
  taskAmber: "#D4A840", taskAmberBg: "#1F1A00", taskAmberBorder: "#3A3010",
  driveViolet: "#9B7ADA", driveVioletBg: "#120A28", driveVioletBorder: "#2A1A4A",
  urgentCoral: "#E06868", urgentCoralBg: "#200808", urgentCoralBorder: "#3A1010",
  stickyYellow: "#F5E642", stickyYellowBg: "#1A1A00", stickyYellowBorder: "#3A3A10",
  leafDecor: "#5AAD5A",
};

function brightness(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function getDarkModePreference(storage) {
  // Takes a mock storage object {getItem} for testability
  try { return storage.getItem('ffc_dark_mode') === 'true'; } catch { return false; }
}

describe("DARK_T theme completeness", () => {
  test("DARK_T has exactly the same keys as LIGHT_T", () => {
    expect(Object.keys(DARK_T).sort()).toEqual(Object.keys(LIGHT_T).sort());
  });

  test("all DARK_T values are valid hex colors", () => {
    Object.entries(DARK_T).forEach(([key, val]) => {
      expect(val).toMatch(/^#[0-9A-Fa-f]{6}$/, `${key} should be a 6-digit hex color`);
    });
  });

  test("all LIGHT_T values are valid hex colors", () => {
    Object.entries(LIGHT_T).forEach(([key, val]) => {
      expect(val).toMatch(/^#[0-9A-Fa-f]{6}$/, `${key} should be a 6-digit hex color`);
    });
  });
});

describe("DARK_T brightness polarity", () => {
  test("DARK_T.bg is darker than LIGHT_T.bg", () => {
    expect(brightness(DARK_T.bg)).toBeLessThan(brightness(LIGHT_T.bg));
  });

  test("DARK_T.card is darker than LIGHT_T.card", () => {
    expect(brightness(DARK_T.card)).toBeLessThan(brightness(LIGHT_T.card));
  });

  test("DARK_T.surface is darker than LIGHT_T.surface", () => {
    expect(brightness(DARK_T.surface)).toBeLessThan(brightness(LIGHT_T.surface));
  });

  test("DARK_T.text is lighter than LIGHT_T.text", () => {
    expect(brightness(DARK_T.text)).toBeGreaterThan(brightness(LIGHT_T.text));
  });

  test("DARK_T.accentBg is darker than LIGHT_T.accentBg", () => {
    expect(brightness(DARK_T.accentBg)).toBeLessThan(brightness(LIGHT_T.accentBg));
  });

  test("DARK_T.infoBg is darker than LIGHT_T.infoBg", () => {
    expect(brightness(DARK_T.infoBg)).toBeLessThan(brightness(LIGHT_T.infoBg));
  });
});

describe("dark mode theme switching logic", () => {
  test("defaults to light mode when key absent", () => {
    const storage = { getItem: () => null };
    expect(getDarkModePreference(storage)).toBe(false);
  });

  test("reads true from storage", () => {
    const storage = { getItem: () => 'true' };
    expect(getDarkModePreference(storage)).toBe(true);
  });

  test("reads false from storage", () => {
    const storage = { getItem: () => 'false' };
    expect(getDarkModePreference(storage)).toBe(false);
  });

  test("returns false when storage throws", () => {
    const storage = { getItem: () => { throw new Error("no storage"); } };
    expect(getDarkModePreference(storage)).toBe(false);
  });

  test("selecting dark theme returns DARK_T bg", () => {
    const dark = true;
    const T = dark ? DARK_T : LIGHT_T;
    expect(T.bg).toBe(DARK_T.bg);
  });

  test("selecting light theme returns LIGHT_T bg", () => {
    const dark = false;
    const T = dark ? DARK_T : LIGHT_T;
    expect(T.bg).toBe(LIGHT_T.bg);
  });
});
