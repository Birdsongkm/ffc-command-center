/**
 * Sprint 2 — AI-Assisted Email Drafting & Smart Prioritization
 * Issue #20
 *
 * Tests for:
 * - senderTier(fromAddr, contactHistory) → 'team' | 'frequent' | 'known' | 'unknown'
 * - priorityScore(email, contactHistory) → number (higher = more urgent)
 * - relationshipBadge(fromAddr, contactHistory) → string | null
 * - suggestArchiveLabel(email) → string | null
 */

// ── senderTier ────────────────────────────────────────────────────────────────
function senderTier(fromAddr, contactHistory) {
  const addr = (fromAddr || "").toLowerCase();
  if (addr.includes("@freshfoodconnect.org") || addr.includes("@ffc.")) return "team";
  const hist = contactHistory?.[fromAddr] || contactHistory?.[addr];
  if (!hist) return "unknown";
  if (hist.totalMessages >= 5) return "frequent";
  return "known";
}

describe("senderTier", () => {
  test("freshfoodconnect.org address → team", () => {
    expect(senderTier("alice@freshfoodconnect.org", {})).toBe("team");
  });

  test("@ffc. address → team", () => {
    expect(senderTier("bob@ffc.org", {})).toBe("team");
  });

  test("no history → unknown", () => {
    expect(senderTier("stranger@gmail.com", {})).toBe("unknown");
  });

  test("null history → unknown", () => {
    expect(senderTier("stranger@gmail.com", null)).toBe("unknown");
  });

  test("history with < 5 messages → known", () => {
    expect(senderTier("donor@example.com", { "donor@example.com": { totalMessages: 3 } })).toBe("known");
  });

  test("history with >= 5 messages → frequent", () => {
    expect(senderTier("donor@example.com", { "donor@example.com": { totalMessages: 5 } })).toBe("frequent");
  });

  test("history with many messages → frequent", () => {
    expect(senderTier("partner@org.com", { "partner@org.com": { totalMessages: 20 } })).toBe("frequent");
  });
});

// ── priorityScore ─────────────────────────────────────────────────────────────
function priorityScore(email, contactHistory) {
  const fromAddr = email.from?.match(/<(.+)>/)?.[1] || email.from || "";
  const tier = senderTier(fromAddr, contactHistory);
  const tierWeight = { team: 3, frequent: 2, known: 1.2, unknown: 1 };
  const tw = tierWeight[tier] || 1;

  const ageDays = email.internalDate
    ? Math.floor((Date.now() - parseInt(email.internalDate)) / 86400000)
    : 0;
  const ageWeight = Math.min(ageDays, 14); // cap at 14 days

  const subj = (email.subject || "").toLowerCase();
  const urgencyBonus =
    subj.includes("urgent") || subj.includes("asap") || subj.includes("critical") ? 10 :
    subj.includes("grant") || subj.includes("deadline") || subj.includes("sign") ? 6 :
    subj.includes("follow up") || subj.includes("invoice") ? 3 : 0;

  return Math.round(tw * (1 + ageWeight * 0.5) + urgencyBonus);
}

describe("priorityScore", () => {
  const baseEmail = { from: "donor@example.com", subject: "Hello", internalDate: String(Date.now()) };

  test("returns a positive number", () => {
    expect(priorityScore(baseEmail, {})).toBeGreaterThan(0);
  });

  test("team sender scores higher than unknown for same age", () => {
    const teamEmail = { ...baseEmail, from: "alice@freshfoodconnect.org" };
    const unknownEmail = { ...baseEmail, from: "stranger@gmail.com" };
    expect(priorityScore(teamEmail, {})).toBeGreaterThan(priorityScore(unknownEmail, {}));
  });

  test("older email scores higher than fresh email (same sender tier)", () => {
    const freshEmail = { from: "x@freshfoodconnect.org", subject: "Hi", internalDate: String(Date.now()) };
    const oldEmail = { from: "x@freshfoodconnect.org", subject: "Hi", internalDate: String(Date.now() - 7 * 86400000) };
    expect(priorityScore(oldEmail, {})).toBeGreaterThan(priorityScore(freshEmail, {}));
  });

  test("urgent subject keyword adds urgency bonus", () => {
    const urgentEmail = { ...baseEmail, subject: "URGENT: Please sign contract" };
    expect(priorityScore(urgentEmail, {})).toBeGreaterThan(priorityScore(baseEmail, {}));
  });

  test("grant deadline subject adds urgency bonus", () => {
    const grantEmail = { ...baseEmail, subject: "Grant deadline approaching" };
    expect(priorityScore(grantEmail, {})).toBeGreaterThan(priorityScore(baseEmail, {}));
  });

  test("frequent sender scores higher than known", () => {
    const hist = {
      "frequent@org.com": { totalMessages: 10 },
      "known@org.com": { totalMessages: 2 }
    };
    const freqEmail = { ...baseEmail, from: "frequent@org.com" };
    const knownEmail = { ...baseEmail, from: "known@org.com" };
    expect(priorityScore(freqEmail, hist)).toBeGreaterThan(priorityScore(knownEmail, hist));
  });

  test("age capped at 14 days — 20-day old email scores same as 14-day old", () => {
    const old14 = { from: "x@gmail.com", subject: "Hi", internalDate: String(Date.now() - 14 * 86400000) };
    const old20 = { from: "x@gmail.com", subject: "Hi", internalDate: String(Date.now() - 20 * 86400000) };
    expect(priorityScore(old14, {})).toBe(priorityScore(old20, {}));
  });
});

// ── relationshipBadge ─────────────────────────────────────────────────────────
function relationshipBadge(fromAddr, contactHistory) {
  const addr = (fromAddr || "").toLowerCase();
  const hist = contactHistory?.[fromAddr] || contactHistory?.[addr];
  if (!hist) return "First contact";
  const lastMs = hist.lastContact ? new Date(hist.lastContact).getTime() : 0;
  const daysSinceLast = lastMs ? Math.floor((Date.now() - lastMs) / 86400000) : 999;
  if (daysSinceLast > 60) return "Lapsed";
  if (hist.totalMessages >= 5) return "Frequent";
  return null;
}

describe("relationshipBadge", () => {
  test("no history → First contact", () => {
    expect(relationshipBadge("new@example.com", {})).toBe("First contact");
  });

  test("null history → First contact", () => {
    expect(relationshipBadge("new@example.com", null)).toBe("First contact");
  });

  test("last contact > 60 days ago → Lapsed", () => {
    const lastContact = new Date(Date.now() - 61 * 86400000).toISOString();
    expect(relationshipBadge("old@example.com", { "old@example.com": { totalMessages: 2, lastContact } })).toBe("Lapsed");
  });

  test("recent contact + >=5 messages → Frequent", () => {
    const lastContact = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(relationshipBadge("freq@example.com", { "freq@example.com": { totalMessages: 8, lastContact } })).toBe("Frequent");
  });

  test("recent contact + <5 messages → null (no badge needed)", () => {
    const lastContact = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(relationshipBadge("reg@example.com", { "reg@example.com": { totalMessages: 3, lastContact } })).toBeNull();
  });

  test("lapsed takes priority over frequent count", () => {
    const lastContact = new Date(Date.now() - 90 * 86400000).toISOString();
    expect(relationshipBadge("old@example.com", { "old@example.com": { totalMessages: 10, lastContact } })).toBe("Lapsed");
  });
});

// ── suggestArchiveLabel ───────────────────────────────────────────────────────
function suggestArchiveLabel(email) {
  const from = (email.from || "").toLowerCase();
  const subj = (email.subject || "").toLowerCase();
  const snippet = (email.snippet || "").toLowerCase();
  const text = from + " " + subj + " " + snippet;

  if (text.includes("donation") || text.includes("donor") || text.includes("fundrais") || text.includes("classy") || text.includes("gift")) return "Fundraising";
  if (text.includes("grant") || text.includes("proposal") || text.includes("loi") || text.includes("rfp")) return "Grants";
  if (text.includes("board") || text.includes("trustee") || text.includes("director")) return "Board";
  if (text.includes("invoice") || text.includes("payment") || text.includes("finance") || text.includes("budget")) return "Finance";
  if (text.includes("calendar") || text.includes("meeting") || text.includes("invite") || text.includes("rsvp")) return "Meetings";
  if (text.includes("@freshfoodconnect.org") || text.includes("team") || text.includes("staff")) return "Team";
  if (text.includes("unsubscribe") || text.includes("newsletter") || text.includes("list-id")) return "Newsletter";
  return null;
}

describe("suggestArchiveLabel", () => {
  test("donation email → Fundraising", () => {
    expect(suggestArchiveLabel({ from: "info@classy.org", subject: "New donation received", snippet: "" })).toBe("Fundraising");
  });

  test("grant email → Grants", () => {
    expect(suggestArchiveLabel({ from: "foundation@grant.org", subject: "LOI submission reminder", snippet: "" })).toBe("Grants");
  });

  test("board email → Board", () => {
    expect(suggestArchiveLabel({ from: "board@org.com", subject: "Board meeting minutes", snippet: "" })).toBe("Board");
  });

  test("invoice email → Finance", () => {
    expect(suggestArchiveLabel({ from: "billing@vendor.com", subject: "Invoice #1234", snippet: "" })).toBe("Finance");
  });

  test("meeting invite → Meetings", () => {
    expect(suggestArchiveLabel({ from: "calendar-notification@google.com", subject: "Meeting invite", snippet: "" })).toBe("Meetings");
  });

  test("team email → Team", () => {
    expect(suggestArchiveLabel({ from: "alice@freshfoodconnect.org", subject: "Update", snippet: "" })).toBe("Team");
  });

  test("newsletter email → Newsletter", () => {
    expect(suggestArchiveLabel({ from: "news@org.com", subject: "Weekly newsletter", snippet: "unsubscribe" })).toBe("Newsletter");
  });

  test("unrecognized email → null", () => {
    expect(suggestArchiveLabel({ from: "friend@gmail.com", subject: "Just checking in", snippet: "hope you're well" })).toBeNull();
  });

  test("classy in from → Fundraising", () => {
    expect(suggestArchiveLabel({ from: "noreply@classy.org", subject: "Recurring donation", snippet: "" })).toBe("Fundraising");
  });
});
