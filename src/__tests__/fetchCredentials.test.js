/**
 * Fetch credentials audit — ensures all API calls include credentials.
 * This test reads the actual source and verifies no fetch calls to /api/ are
 * missing credentials: 'include'. This catches the class of bug where new
 * fetch calls are added without auth cookies.
 */
const fs = require('fs');
const path = require('path');

describe("fetch credentials audit", () => {
  let indexSource;

  beforeAll(() => {
    indexSource = fs.readFileSync(
      path.join(__dirname, '..', 'pages', 'index.js'),
      'utf-8'
    );
  });

  test("all fetch calls to /api/ with method options include credentials", () => {
    // Strategy: find every line that has fetch("/api/... and a method: keyword,
    // then check the surrounding context (±5 lines) for 'credentials'
    const lines = indexSource.split('\n');
    const violations = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip lines that are comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

      // Find fetch calls to /api/ that specify a method (POST, PUT, PATCH, DELETE)
      // Exclude /api/auth/ endpoints — those are pre-auth (no cookies to send)
      if (/fetch\(["'`]\/api\//.test(line) && !/\/api\/auth\//.test(line) && /method:\s*["'`](POST|PUT|PATCH|DELETE)["'`]/.test(line)) {
        // Check this line for credentials
        if (line.includes('credentials')) continue;

        // Check surrounding context (the fetch options might span multiple lines)
        const context = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 6)).join('\n');
        if (!context.includes('credentials')) {
          violations.push(`Line ${i + 1}: ${line.trim().slice(0, 120)}`);
        }
      }

      // Also catch multi-line fetch where method: is on a different line than fetch(
      if (/method:\s*["'`](POST|PUT|PATCH|DELETE)["'`]/.test(line) && !line.includes('fetch(')) {
        // Look back for the fetch call
        const prevContext = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
        if (/fetch\(["'`]\/api\//.test(prevContext) && !/\/api\/auth\//.test(prevContext)) {
          const fullContext = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 5)).join('\n');
          if (!fullContext.includes('credentials')) {
            violations.push(`Line ${i + 1}: ${line.trim().slice(0, 120)}`);
          }
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(`Found ${violations.length} fetch call(s) to /api/ missing credentials: 'include':\n${violations.join('\n')}`);
    }
  });
});
