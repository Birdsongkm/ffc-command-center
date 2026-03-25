/**
 * Home tab Today's Schedule — PREP button gating (#86)
 * Tests: shouldShowTodayPrep, extractDocFromEvent, prepActionForEvent
 *
 * Issue: prep options (AI Research, doc link, drive search) were gated on
 * `hasOthers` (>1 attendees). After #86, they are gated on `isRealMeeting`
 * so solo video calls and other real-but-solo meetings also get prep options.
 */

// ── isRealMeeting (duplicated inline — project pattern) ───────────────────────

const BLOCK_WORDS = ["hold", "ooo", "out of office", "focus", "gym", "commute", "travel", "personal", "lunch", "coffee", "break", "think time"];

function isRealMeeting(ev) {
  if (!ev) return false;
  const title = (ev.title || "").toLowerCase();
  if (BLOCK_WORDS.some(w => title.includes(w))) return false;
  if (ev.attendees && ev.attendees.length > 1) return true;
  if (ev.hangoutLink) return true;
  return false;
}

// ── extractDocFromEvent (duplicated inline — project pattern) ──────────────────

function extractDocFromEvent(ev) {
  if (!ev) return null;
  if (Array.isArray(ev.attachments)) {
    for (const a of ev.attachments) {
      if (a.fileUrl && a.fileUrl.includes("docs.google.com")) return a.fileUrl;
      if (a.fileUrl && a.fileUrl.includes("drive.google.com")) return a.fileUrl;
    }
  }
  const desc = ev.description || "";
  const match = desc.match(/https?:\/\/(docs|drive)\.google\.com\/[^\s"<>]*/i);
  return match ? match[0] : null;
}

// ── shouldShowTodayPrep — the NEW gate logic replacing `hasOthers` ─────────────
// Prep options (AI Prep, doc link, Prep Done toggle) show for any real meeting,
// not just meetings with multiple attendees.

function shouldShowTodayPrep(ev) {
  return isRealMeeting(ev);
}

// ── prepActionForEvent — which doc button to show ──────────────────────────────
// Returns "doc" (open linked doc) or "search" (drive search) or null (not real).

function prepActionForEvent(ev) {
  if (!isRealMeeting(ev)) return null;
  const docUrl = extractDocFromEvent(ev);
  return docUrl ? "doc" : "search";
}

// ── shouldShowTodayPrep ────────────────────────────────────────────────────────

describe("shouldShowTodayPrep", () => {
  test("returns true for meeting with multiple attendees", () => {
    const ev = { title: "Board meeting", attendees: [{ email: "a@b.com" }, { email: "c@d.com" }] };
    expect(shouldShowTodayPrep(ev)).toBe(true);
  });

  test("returns true for solo meeting WITH hangout link (new behavior)", () => {
    // Previously gated on hasOthers — this is the key #86 fix
    const ev = { title: "1:1 check-in", attendees: [], hangoutLink: "https://meet.google.com/abc-def" };
    expect(shouldShowTodayPrep(ev)).toBe(true);
  });

  test("returns false for solo meeting without hangout link", () => {
    const ev = { title: "Review docs", attendees: [] };
    expect(shouldShowTodayPrep(ev)).toBe(false);
  });

  test("returns false for focus block even with attendees", () => {
    const ev = { title: "Focus time", attendees: [{ email: "a@b.com" }, { email: "c@d.com" }] };
    expect(shouldShowTodayPrep(ev)).toBe(false);
  });

  test("returns false for OOO event", () => {
    const ev = { title: "OOO - vacation", attendees: [] };
    expect(shouldShowTodayPrep(ev)).toBe(false);
  });

  test("returns false for hold block", () => {
    const ev = { title: "Hold for call", attendees: [] };
    expect(shouldShowTodayPrep(ev)).toBe(false);
  });

  test("returns false for gym block", () => {
    const ev = { title: "Gym", attendees: [] };
    expect(shouldShowTodayPrep(ev)).toBe(false);
  });

  test("returns false for commute block", () => {
    const ev = { title: "Commute home", attendees: [] };
    expect(shouldShowTodayPrep(ev)).toBe(false);
  });

  test("returns false for null event", () => {
    expect(shouldShowTodayPrep(null)).toBe(false);
  });

  test("returns true for meeting with attendees and hangout link", () => {
    const ev = { title: "Donor call", attendees: [{ email: "donor@org.com" }], hangoutLink: "https://meet.google.com/xyz" };
    expect(shouldShowTodayPrep(ev)).toBe(true);
  });

  test("returns true for 1:1 with hangout link (solo in attendees array)", () => {
    // Solo attendees[] but hangoutLink present → real meeting
    const ev = { title: "ED check-in", attendees: [{ email: "me@ffc.org" }], hangoutLink: "https://meet.google.com/aaa" };
    expect(shouldShowTodayPrep(ev)).toBe(true);
  });
});

// ── prepActionForEvent ─────────────────────────────────────────────────────────

describe("prepActionForEvent", () => {
  test("returns null for non-real meeting", () => {
    const ev = { title: "Focus block", attendees: [] };
    expect(prepActionForEvent(ev)).toBeNull();
  });

  test("returns 'doc' when event has Google Doc attachment", () => {
    const docUrl = "https://docs.google.com/document/d/abc/edit";
    const ev = {
      title: "Board meeting",
      attendees: [{ email: "a@b.com" }, { email: "b@c.com" }],
      attachments: [{ fileUrl: docUrl, title: "Agenda" }],
    };
    expect(prepActionForEvent(ev)).toBe("doc");
  });

  test("returns 'doc' when event description contains Google Docs link", () => {
    const docUrl = "https://docs.google.com/document/d/xyz/edit";
    const ev = {
      title: "Finance meeting",
      attendees: [{ email: "a@b.com" }, { email: "b@c.com" }],
      description: `Agenda: ${docUrl}`,
    };
    expect(prepActionForEvent(ev)).toBe("doc");
  });

  test("returns 'doc' when event description contains Google Drive link", () => {
    const driveUrl = "https://drive.google.com/file/d/abc/view";
    const ev = {
      title: "Standup",
      hangoutLink: "https://meet.google.com/abc",
      description: `See ${driveUrl}`,
    };
    expect(prepActionForEvent(ev)).toBe("doc");
  });

  test("returns 'search' when real meeting but no doc link", () => {
    const ev = {
      title: "Partner meeting",
      attendees: [{ email: "a@b.com" }, { email: "b@c.com" }],
      description: "Discuss Q2 plans",
    };
    expect(prepActionForEvent(ev)).toBe("search");
  });

  test("returns 'search' for solo meeting with hangout link but no doc", () => {
    const ev = {
      title: "Weekly sync",
      hangoutLink: "https://meet.google.com/abc",
    };
    expect(prepActionForEvent(ev)).toBe("search");
  });

  test("returns 'search' for real meeting with no description", () => {
    const ev = {
      title: "Quarterly review",
      attendees: [{ email: "a@b.com" }, { email: "b@c.com" }],
    };
    expect(prepActionForEvent(ev)).toBe("search");
  });
});

// ── hasOthers vs isRealMeeting gating comparison ──────────────────────────────
// Documents the behavioral difference that issue #86 fixes.

describe("gating change: hasOthers vs shouldShowTodayPrep", () => {
  function hasOthers(ev) {
    return !!(ev.attendees && ev.attendees.length > 1);
  }

  test("solo hangout meeting: hasOthers=false but shouldShowTodayPrep=true", () => {
    const ev = { title: "Video call", attendees: [{ email: "me@ffc.org" }], hangoutLink: "https://meet.google.com/abc" };
    expect(hasOthers(ev)).toBe(false);          // old gate: NO prep
    expect(shouldShowTodayPrep(ev)).toBe(true); // new gate: YES prep
  });

  test("multi-attendee meeting: both gates agree", () => {
    const ev = { title: "Board sync", attendees: [{ email: "a@b.com" }, { email: "c@d.com" }] };
    expect(hasOthers(ev)).toBe(true);
    expect(shouldShowTodayPrep(ev)).toBe(true);
  });

  test("focus block: both gates agree (no prep)", () => {
    const ev = { title: "Focus time", attendees: [{ email: "a@b.com" }, { email: "c@d.com" }] };
    expect(hasOthers(ev)).toBe(true);           // old gate: would show prep (wrong!)
    expect(shouldShowTodayPrep(ev)).toBe(false); // new gate: no prep (correct)
  });

  test("empty event: both gates agree (no prep)", () => {
    const ev = { title: "Review", attendees: [] };
    expect(hasOthers(ev)).toBe(false);
    expect(shouldShowTodayPrep(ev)).toBe(false);
  });
});
