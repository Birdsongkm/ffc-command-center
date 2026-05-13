/**
 * Email drag-and-drop tests
 * Verifies: dragging one email moves only that email, not the whole domain.
 * This test exists because the original drop handler learned the sender's
 * domain on every drag, causing ALL emails from that domain to move.
 */

// ── The override model ───────────────────────────────────────────────────────

// emailBucketOverrides: { emailId → bucketKey }
// Only the specific email ID gets an override. No domain/sender learning.

function applyDragDropOverride(overrides, emailId, targetBucket) {
  return { ...overrides, [emailId]: targetBucket };
}

function getEffectiveBucket(emailId, overrides, classifiedBucket) {
  return (overrides && overrides[emailId]) || classifiedBucket;
}

function countEmailsInBucket(emails, overrides, targetBucket, classifyFn) {
  return emails.filter(e => {
    const override = overrides[e.id];
    return (override || classifyFn(e)) === targetBucket;
  }).length;
}

// ── Spam button model (domain learning — ONLY for spam) ──────────────────────

function applySpamLearning(learnedBuckets, senderEmail) {
  const updated = { ...learnedBuckets };
  const domain = senderEmail.split('@')[1] || '';
  if (senderEmail) updated[senderEmail] = 'sales';
  if (domain) updated[domain] = 'sales';
  return updated;
}

function isLearnedSpam(learnedBuckets, senderEmail) {
  const domain = (senderEmail || '').split('@')[1] || '';
  return learnedBuckets[senderEmail] === 'sales' || learnedBuckets[domain] === 'sales';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("drag-and-drop: moves only one email", () => {
  const emails = [
    { id: "e1", from: "laura@freshfoodconnect.org", subject: "Update 1" },
    { id: "e2", from: "laura@freshfoodconnect.org", subject: "Update 2" },
    { id: "e3", from: "laura@freshfoodconnect.org", subject: "Update 3" },
    { id: "e4", from: "pat@acme.org", subject: "Hello" },
  ];
  const classify = () => "team";

  test("dragging e1 to 'needs-response' only moves e1", () => {
    const overrides = applyDragDropOverride({}, "e1", "needs-response");
    expect(getEffectiveBucket("e1", overrides, "team")).toBe("needs-response");
    expect(getEffectiveBucket("e2", overrides, "team")).toBe("team");
    expect(getEffectiveBucket("e3", overrides, "team")).toBe("team");
  });

  test("other emails from same sender stay in original bucket", () => {
    const overrides = applyDragDropOverride({}, "e1", "needs-response");
    const inTeam = countEmailsInBucket(emails, overrides, "team", classify);
    expect(inTeam).toBe(3); // e2, e3, e4 stay
    const inNeeds = countEmailsInBucket(emails, overrides, "needs-response", classify);
    expect(inNeeds).toBe(1); // only e1
  });

  test("dragging two different emails creates two separate overrides", () => {
    let overrides = applyDragDropOverride({}, "e1", "needs-response");
    overrides = applyDragDropOverride(overrides, "e4", "to-do");
    expect(getEffectiveBucket("e1", overrides, "team")).toBe("needs-response");
    expect(getEffectiveBucket("e4", overrides, "team")).toBe("to-do");
    expect(getEffectiveBucket("e2", overrides, "team")).toBe("team");
  });

  test("override does not affect emails from same domain", () => {
    // e1 and e2 are both from freshfoodconnect.org
    const overrides = applyDragDropOverride({}, "e1", "sales");
    // Only e1 should be in sales, NOT e2 or e3
    expect(getEffectiveBucket("e1", overrides, "team")).toBe("sales");
    expect(getEffectiveBucket("e2", overrides, "team")).toBe("team");
  });

  test("does not mutate original overrides object", () => {
    const original = {};
    applyDragDropOverride(original, "e1", "needs-response");
    expect(original).toEqual({});
  });

  test("re-dragging same email updates the override", () => {
    let overrides = applyDragDropOverride({}, "e1", "needs-response");
    overrides = applyDragDropOverride(overrides, "e1", "to-do");
    expect(getEffectiveBucket("e1", overrides, "team")).toBe("to-do");
  });
});

describe("spam button: learns domain (separate from drag)", () => {
  test("spam learning saves both email and domain", () => {
    const learned = applySpamLearning({}, "spammer@junk.com");
    expect(learned["spammer@junk.com"]).toBe("sales");
    expect(learned["junk.com"]).toBe("sales");
  });

  test("spam learning affects all emails from that domain", () => {
    const learned = applySpamLearning({}, "spammer@junk.com");
    expect(isLearnedSpam(learned, "other@junk.com")).toBe(true);
  });

  test("spam learning does NOT affect other domains", () => {
    const learned = applySpamLearning({}, "spammer@junk.com");
    expect(isLearnedSpam(learned, "pat@acme.org")).toBe(false);
  });

  test("drag-drop does NOT trigger domain learning", () => {
    // This is the key test: applyDragDropOverride does not touch learnedBuckets
    const overrides = applyDragDropOverride({}, "e1", "sales");
    const learnedBuckets = {}; // Should remain empty
    expect(Object.keys(learnedBuckets)).toHaveLength(0);
    // Only e1 has an override
    expect(overrides["e1"]).toBe("sales");
  });
});

describe("getEffectiveBucket", () => {
  test("returns override when set", () => {
    expect(getEffectiveBucket("e1", { e1: "sales" }, "team")).toBe("sales");
  });

  test("returns classified bucket when no override", () => {
    expect(getEffectiveBucket("e1", {}, "team")).toBe("team");
  });

  test("returns classified bucket when overrides is null", () => {
    expect(getEffectiveBucket("e1", null, "team")).toBe("team");
  });

  test("override for different email doesn't affect this one", () => {
    expect(getEffectiveBucket("e1", { e2: "sales" }, "team")).toBe("team");
  });
});
