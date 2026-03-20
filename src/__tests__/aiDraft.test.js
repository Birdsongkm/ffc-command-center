/**
 * Sprint 2 — /api/ai-draft validation logic
 *
 * Tests the pure validation and prompt-building pieces
 * that don't require network calls.
 */

// ── validateAiDraftRequest ────────────────────────────────────────────────────
// Mirrors the validation in /api/ai-draft.js
function validateAiDraftRequest(body) {
  if (!body) return "Missing request body";
  if (!body.from && !body.subject) return "Missing email context";
  return null;
}

describe("validateAiDraftRequest", () => {
  test("null body → error", () => {
    expect(validateAiDraftRequest(null)).toBeTruthy();
  });

  test("empty body → error", () => {
    expect(validateAiDraftRequest({})).toBeTruthy();
  });

  test("only from present → ok (subject can be omitted)", () => {
    expect(validateAiDraftRequest({ from: "alice@example.com" })).toBeNull();
  });

  test("only subject present → ok (from can be omitted)", () => {
    expect(validateAiDraftRequest({ subject: "Hello" })).toBeNull();
  });

  test("both from and subject present → ok", () => {
    expect(validateAiDraftRequest({ from: "a@b.com", subject: "Hi" })).toBeNull();
  });
});

// ── buildAiDraftPrompt ────────────────────────────────────────────────────────
// Mirrors prompt construction in /api/ai-draft.js
function buildAiDraftPrompt({ from, subject, body, snippet }) {
  const emailText = (body || snippet || "").slice(0, 2000);
  return [
    "You are drafting a reply email on behalf of Kayla Birdsong, CEO of Fresh Food Connect",
    `From: ${from}`,
    `Subject: ${subject}`,
    emailText,
  ].join("\n");
}

describe("buildAiDraftPrompt", () => {
  const base = { from: "donor@example.com", subject: "Thank you!", body: "Great work.", snippet: "" };

  test("includes from in prompt", () => {
    expect(buildAiDraftPrompt(base)).toContain("donor@example.com");
  });

  test("includes subject in prompt", () => {
    expect(buildAiDraftPrompt(base)).toContain("Thank you!");
  });

  test("includes email body in prompt", () => {
    expect(buildAiDraftPrompt(base)).toContain("Great work.");
  });

  test("falls back to snippet when body is empty", () => {
    const p = buildAiDraftPrompt({ ...base, body: "", snippet: "Snippet text" });
    expect(p).toContain("Snippet text");
  });

  test("truncates very long body at 2000 chars", () => {
    const longBody = "x".repeat(3000);
    const prompt = buildAiDraftPrompt({ ...base, body: longBody });
    expect(prompt).toContain("x".repeat(2000));
    expect(prompt).not.toContain("x".repeat(2001));
  });

  test("includes Kayla / Fresh Food Connect identity", () => {
    const p = buildAiDraftPrompt(base);
    expect(p).toContain("Kayla Birdsong");
    expect(p).toContain("Fresh Food Connect");
  });
});

// ── priorityScore ordering (integration spot-checks) ─────────────────────────
// Already covered in sprint2.test.js; these are additional edge cases.

function senderTier(fromAddr, contactHistory) {
  const addr = (fromAddr || "").toLowerCase();
  if (addr.includes("@freshfoodconnect.org") || addr.includes("@ffc.")) return "team";
  const hist = contactHistory?.[fromAddr] || contactHistory?.[addr];
  if (!hist) return "unknown";
  if (hist.totalMessages >= 5) return "frequent";
  return "known";
}

function priorityScore(email, contactHistory) {
  const fromAddr = email.from?.match(/<(.+)>/)?.[1] || email.from || "";
  const tier = senderTier(fromAddr, contactHistory);
  const tierWeight = { team: 3, frequent: 2, known: 1.2, unknown: 1 };
  const tw = tierWeight[tier] || 1;
  const ageDays = email.internalDate ? Math.floor((Date.now() - parseInt(email.internalDate)) / 86400000) : 0;
  const ageWeight = Math.min(ageDays, 14);
  const subj = (email.subject || "").toLowerCase();
  const urgencyBonus =
    subj.includes("urgent") || subj.includes("asap") || subj.includes("critical") ? 10 :
    subj.includes("grant") || subj.includes("deadline") || subj.includes("sign") ? 6 :
    subj.includes("follow up") || subj.includes("invoice") ? 3 : 0;
  return Math.round(tw * (1 + ageWeight * 0.5) + urgencyBonus);
}

describe("priorityScore edge cases", () => {
  test("missing internalDate treated as 0 days old", () => {
    const email = { from: "x@gmail.com", subject: "Hi" }; // no internalDate
    expect(priorityScore(email, {})).toBeGreaterThan(0);
  });

  test("email from display name with angle brackets extracts address for tier", () => {
    const email = {
      from: "Alice <alice@freshfoodconnect.org>",
      subject: "Hi",
      internalDate: String(Date.now()),
    };
    expect(senderTier("alice@freshfoodconnect.org", {})).toBe("team");
    expect(priorityScore(email, {})).toBeGreaterThan(2); // team tier
  });

  test("ASAP in subject gives max urgency bonus", () => {
    const base = { from: "x@gmail.com", internalDate: String(Date.now()) };
    const normal = priorityScore({ ...base, subject: "Hello" }, {});
    const asap = priorityScore({ ...base, subject: "ASAP: need your help" }, {});
    expect(asap - normal).toBe(10);
  });
});
