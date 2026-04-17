/**
 * Create Doc tests — issue #106
 * Tests: create-doc API input validation, folder placement logic.
 */

// Simulate the validation logic from create-doc.js handler
function validateCreateDocInput({ title, content, folderId }) {
  if (!title || !title.trim()) return { valid: false, error: 'Missing title' };
  if (!content) return { valid: false, error: 'Missing content' };
  return { valid: true, title: title.trim(), content, folderId: folderId || null };
}

function buildCreateDocMetadata(title, folderId) {
  const metadata = { name: title, mimeType: 'application/vnd.google-apps.document' };
  if (folderId) metadata.parents = [folderId];
  return metadata;
}

describe("validateCreateDocInput", () => {
  test("valid input with title and content", () => {
    const r = validateCreateDocInput({ title: "My Doc", content: "Hello" });
    expect(r.valid).toBe(true);
    expect(r.title).toBe("My Doc");
  });

  test("valid input with folderId", () => {
    const r = validateCreateDocInput({ title: "My Doc", content: "Hello", folderId: "folder123" });
    expect(r.valid).toBe(true);
    expect(r.folderId).toBe("folder123");
  });

  test("folderId defaults to null when not provided", () => {
    const r = validateCreateDocInput({ title: "My Doc", content: "Hello" });
    expect(r.folderId).toBeNull();
  });

  test("rejects empty title", () => {
    const r = validateCreateDocInput({ title: "", content: "Hello" });
    expect(r.valid).toBe(false);
    expect(r.error).toBe("Missing title");
  });

  test("rejects whitespace-only title", () => {
    const r = validateCreateDocInput({ title: "   ", content: "Hello" });
    expect(r.valid).toBe(false);
  });

  test("rejects null title", () => {
    const r = validateCreateDocInput({ title: null, content: "Hello" });
    expect(r.valid).toBe(false);
  });

  test("rejects missing content", () => {
    const r = validateCreateDocInput({ title: "Doc", content: "" });
    expect(r.valid).toBe(false);
  });

  test("trims title", () => {
    const r = validateCreateDocInput({ title: "  My Doc  ", content: "x" });
    expect(r.title).toBe("My Doc");
  });
});

describe("buildCreateDocMetadata", () => {
  test("creates metadata without folder", () => {
    const m = buildCreateDocMetadata("Test Doc", null);
    expect(m.name).toBe("Test Doc");
    expect(m.mimeType).toBe("application/vnd.google-apps.document");
    expect(m.parents).toBeUndefined();
  });

  test("creates metadata with folder", () => {
    const m = buildCreateDocMetadata("Test Doc", "folder123");
    expect(m.parents).toEqual(["folder123"]);
  });

  test("does not include parents when folderId is empty string", () => {
    const m = buildCreateDocMetadata("Test Doc", "");
    expect(m.parents).toBeUndefined();
  });
});
