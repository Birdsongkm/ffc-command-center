/**
 * CC allocation spreadsheet URL extraction tests.
 * Ensures we find Google Sheets links in plain text, HTML hrefs,
 * and various URL formats.
 */

function extractSpreadsheetFromBody(plainText, htmlText) {
  const bodyText = (plainText || '') + '\n' + (htmlText || '');

  const sheetMatch = bodyText.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    || (htmlText || '').match(/href="(https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+[^"]*)"/)
    || bodyText.match(/https:\/\/docs\.google\.com\/spreadsheets\/[^\s"'<]+/);

  if (!sheetMatch) return { url: null, id: null };

  const url = sheetMatch[1]?.startsWith('http') ? sheetMatch[1] : sheetMatch[0];
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const id = idMatch ? idMatch[1] : null;
  return {
    url: id ? `https://docs.google.com/spreadsheets/d/${id}` : url,
    id,
  };
}

describe("extractSpreadsheetFromBody", () => {
  test("finds URL in plain text", () => {
    const r = extractSpreadsheetFromBody(
      "Here is the sheet: https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmN/edit",
      ""
    );
    expect(r.id).toBe("1aBcDeFgHiJkLmN");
    expect(r.url).toContain("1aBcDeFgHiJkLmN");
  });

  test("finds URL in HTML href only (plain text has no link)", () => {
    const r = extractSpreadsheetFromBody(
      "Please review the spreadsheet",
      '<a href="https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmN/edit#gid=0">Click here</a>'
    );
    expect(r.id).toBe("1aBcDeFgHiJkLmN");
  });

  test("finds URL in HTML body text (not in href)", () => {
    const r = extractSpreadsheetFromBody(
      "",
      '<p>Link: https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmN/edit</p>'
    );
    expect(r.id).toBe("1aBcDeFgHiJkLmN");
  });

  test("handles URL with query params", () => {
    const r = extractSpreadsheetFromBody(
      "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmN/edit?usp=sharing",
      ""
    );
    expect(r.id).toBe("1aBcDeFgHiJkLmN");
  });

  test("handles URL with gid fragment", () => {
    const r = extractSpreadsheetFromBody(
      "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmN/edit#gid=123456",
      ""
    );
    expect(r.id).toBe("1aBcDeFgHiJkLmN");
  });

  test("returns null when no spreadsheet URL", () => {
    const r = extractSpreadsheetFromBody("No links here", "<p>Nothing</p>");
    expect(r.url).toBeNull();
    expect(r.id).toBeNull();
  });

  test("returns null for Google Docs (not Sheets)", () => {
    const r = extractSpreadsheetFromBody(
      "https://docs.google.com/document/d/1aBcDeFgHiJkLmN/edit",
      ""
    );
    expect(r.id).toBeNull();
  });

  test("returns null for null inputs", () => {
    const r = extractSpreadsheetFromBody(null, null);
    expect(r.url).toBeNull();
  });

  test("finds URL when plain text is empty but HTML has it", () => {
    const r = extractSpreadsheetFromBody(
      "",
      'Review: <a href="https://docs.google.com/spreadsheets/d/ABC123_xyz/edit">Sheet</a>'
    );
    expect(r.id).toBe("ABC123_xyz");
  });

  test("handles HubSpot-forwarded email with link in HTML", () => {
    const html = `
      <div>Log email to HubSpot</div>
      <p>Hi Team FFC!</p>
      <p>Please review and update your credit card transactions</p>
      <a href="https://docs.google.com/spreadsheets/d/1X2Y3Z_abcdef/edit?usp=sharing">View Spreadsheet</a>
    `;
    const r = extractSpreadsheetFromBody("Hi Team FFC! Please review...", html);
    expect(r.id).toBe("1X2Y3Z_abcdef");
  });

  test("prefers first match when multiple sheets in body", () => {
    const r = extractSpreadsheetFromBody(
      "Sheet 1: https://docs.google.com/spreadsheets/d/FIRST/edit Sheet 2: https://docs.google.com/spreadsheets/d/SECOND/edit",
      ""
    );
    expect(r.id).toBe("FIRST");
  });
});
