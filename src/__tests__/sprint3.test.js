/**
 * Sprint 3 — Fundraising & Development Dashboard
 *
 * Tests for:
 * - grantDeadlineUrgency(deadline) → 'red' | 'amber' | 'green' | 'none'
 * - grantDaysUntil(deadline) → number (negative = overdue)
 * - formatGrantCountdown(deadline) → human string
 * - parsePipelineStages(deals) → { stageName: count }[]
 * - topPipelineStage(deals) → stageName or null
 */

// ── grantDaysUntil ────────────────────────────────────────────────────────────
function grantDaysUntil(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

describe("grantDaysUntil", () => {
  test("future date returns positive number", () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(grantDaysUntil(future)).toBe(10);
  });

  test("past date returns negative number (overdue)", () => {
    const past = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(grantDaysUntil(past)).toBe(-5);
  });

  test("null returns null", () => {
    expect(grantDaysUntil(null)).toBeNull();
  });

  test("invalid date string returns null", () => {
    expect(grantDaysUntil("not-a-date")).toBeNull();
  });

  test("today returns 0 or 1 (boundary)", () => {
    const today = new Date(Date.now() + 12 * 3600000).toISOString(); // 12 hours from now
    expect(grantDaysUntil(today)).toBe(1);
  });
});

// ── grantDeadlineUrgency ──────────────────────────────────────────────────────
function grantDeadlineUrgency(deadline) {
  const days = grantDaysUntil(deadline);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= 7) return "red";
  if (days <= 30) return "amber";
  return "green";
}

describe("grantDeadlineUrgency", () => {
  const daysFrom = (n) => new Date(Date.now() + n * 86400000).toISOString();

  test("null deadline → none", () => {
    expect(grantDeadlineUrgency(null)).toBe("none");
  });

  test("overdue → overdue", () => {
    expect(grantDeadlineUrgency(daysFrom(-1))).toBe("overdue");
  });

  test("1 day away → red", () => {
    expect(grantDeadlineUrgency(daysFrom(1))).toBe("red");
  });

  test("7 days away → red", () => {
    expect(grantDeadlineUrgency(daysFrom(7))).toBe("red");
  });

  test("8 days away → amber", () => {
    expect(grantDeadlineUrgency(daysFrom(8))).toBe("amber");
  });

  test("30 days away → amber", () => {
    expect(grantDeadlineUrgency(daysFrom(30))).toBe("amber");
  });

  test("31 days away → green", () => {
    expect(grantDeadlineUrgency(daysFrom(31))).toBe("green");
  });

  test("60 days away → green", () => {
    expect(grantDeadlineUrgency(daysFrom(60))).toBe("green");
  });
});

// ── formatGrantCountdown ──────────────────────────────────────────────────────
function formatGrantCountdown(deadline) {
  const days = grantDaysUntil(deadline);
  if (days === null) return "";
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days`;
}

describe("formatGrantCountdown", () => {
  const daysFrom = (n) => new Date(Date.now() + n * 86400000).toISOString();

  test("null → empty string", () => {
    expect(formatGrantCountdown(null)).toBe("");
  });

  test("overdue by 3 days", () => {
    expect(formatGrantCountdown(daysFrom(-3))).toBe("Overdue by 3d");
  });

  test("due tomorrow → 'Due tomorrow'", () => {
    expect(formatGrantCountdown(daysFrom(1))).toBe("Due tomorrow");
  });

  test("10 days → '10 days'", () => {
    expect(formatGrantCountdown(daysFrom(10))).toBe("10 days");
  });
});

// ── parsePipelineStages ───────────────────────────────────────────────────────
const PIPELINE_STAGE_ORDER = [
  "Prospect", "Cultivating", "Ask Made", "Pledge", "Received"
];

function parsePipelineStages(deals) {
  if (!deals || !deals.length) return [];
  const counts = {};
  for (const deal of deals) {
    const stage = deal.stage || "Unknown";
    counts[stage] = (counts[stage] || 0) + 1;
  }
  // Return in pipeline order, unknown stages at end
  const ordered = PIPELINE_STAGE_ORDER.filter(s => counts[s]);
  const unknown = Object.keys(counts).filter(s => !PIPELINE_STAGE_ORDER.includes(s));
  return [...ordered, ...unknown].map(stage => ({ stage, count: counts[stage] }));
}

describe("parsePipelineStages", () => {
  test("empty deals → empty array", () => {
    expect(parsePipelineStages([])).toEqual([]);
  });

  test("null deals → empty array", () => {
    expect(parsePipelineStages(null)).toEqual([]);
  });

  test("counts deals per stage", () => {
    const deals = [
      { stage: "Prospect" },
      { stage: "Prospect" },
      { stage: "Cultivating" },
    ];
    const result = parsePipelineStages(deals);
    const prospectEntry = result.find(r => r.stage === "Prospect");
    expect(prospectEntry?.count).toBe(2);
  });

  test("stages returned in pipeline order", () => {
    const deals = [
      { stage: "Pledge" },
      { stage: "Prospect" },
      { stage: "Ask Made" },
    ];
    const result = parsePipelineStages(deals);
    expect(result[0].stage).toBe("Prospect");
    expect(result[1].stage).toBe("Ask Made");
    expect(result[2].stage).toBe("Pledge");
  });

  test("unknown stages appended after known", () => {
    const deals = [{ stage: "NewCustomStage" }, { stage: "Prospect" }];
    const result = parsePipelineStages(deals);
    expect(result[0].stage).toBe("Prospect");
    expect(result[result.length - 1].stage).toBe("NewCustomStage");
  });

  test("missing stage field → 'Unknown'", () => {
    const deals = [{ name: "Deal without stage" }];
    const result = parsePipelineStages(deals);
    expect(result[0].stage).toBe("Unknown");
  });
});

// ── topPipelineStage ──────────────────────────────────────────────────────────
function topPipelineStage(deals) {
  const stages = parsePipelineStages(deals);
  if (!stages.length) return null;
  return stages.reduce((a, b) => b.count > a.count ? b : a).stage;
}

describe("topPipelineStage", () => {
  test("null → null", () => {
    expect(topPipelineStage(null)).toBeNull();
  });

  test("empty → null", () => {
    expect(topPipelineStage([])).toBeNull();
  });

  test("returns stage with highest count", () => {
    const deals = [
      { stage: "Prospect" }, { stage: "Prospect" }, { stage: "Prospect" },
      { stage: "Cultivating" }, { stage: "Cultivating" },
    ];
    expect(topPipelineStage(deals)).toBe("Prospect");
  });

  test("single stage → that stage", () => {
    expect(topPipelineStage([{ stage: "Ask Made" }])).toBe("Ask Made");
  });
});
