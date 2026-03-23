/**
 * Sprint 7 — Intelligence & Clarity + User Issues #63–67
 *
 * Tests for:
 * - driveFileIcon(mimeType) → emoji icon for Drive file type
 */

// ── driveFileIcon ─────────────────────────────────────────────────────────────
function driveFileIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType === 'application/vnd.google-apps.folder') return '📁';
  if (mimeType === 'application/vnd.google-apps.document') return '📝';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return '📊';
  if (mimeType === 'application/vnd.google-apps.presentation') return '📽';
  if (mimeType === 'application/pdf') return '📕';
  return '📄';
}

describe("driveFileIcon", () => {
  test("folder", () => {
    expect(driveFileIcon('application/vnd.google-apps.folder')).toBe('📁');
  });
  test("google doc", () => {
    expect(driveFileIcon('application/vnd.google-apps.document')).toBe('📝');
  });
  test("google sheet", () => {
    expect(driveFileIcon('application/vnd.google-apps.spreadsheet')).toBe('📊');
  });
  test("google slides", () => {
    expect(driveFileIcon('application/vnd.google-apps.presentation')).toBe('📽');
  });
  test("pdf", () => {
    expect(driveFileIcon('application/pdf')).toBe('📕');
  });
  test("unknown type falls back to generic", () => {
    expect(driveFileIcon('image/png')).toBe('📄');
  });
  test("null/undefined falls back to generic", () => {
    expect(driveFileIcon(null)).toBe('📄');
    expect(driveFileIcon(undefined)).toBe('📄');
  });
});
