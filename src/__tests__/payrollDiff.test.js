/**
 * Payroll diff tests — side-by-side per-employee comparison
 * Tests: parsePayrollRows, diffPayrollRows, formatPayrollDelta
 */

// Parse PDF text lines into employee rows with name + numeric values
function parsePayrollRows(lines) {
  const rows = [];
  for (const line of (lines || [])) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Look for lines with a name followed by numbers (dollars, hours, etc.)
    // Payroll PDFs typically have: Name  $amount  hours  $amount ...
    const numbers = trimmed.match(/[\$]?[\d,]+\.?\d*/g) || [];
    if (numbers.length === 0) continue;
    // Extract the name part (everything before the first number)
    const firstNumIdx = trimmed.search(/[\$\d]/);
    if (firstNumIdx <= 0) continue;
    const name = trimmed.slice(0, firstNumIdx).trim();
    if (name.length < 2) continue;
    // Filter out header/total rows
    const lowerName = name.toLowerCase();
    if (/^(total|sub.?total|grand|net|gross|employee|name|date|period|check|pay\s|deduction|earning|tax|federal|state|social|medicare|fica)/.test(lowerName)) continue;
    const values = numbers.map(n => parseFloat(n.replace(/[$,]/g, '')));
    rows.push({ name, values, raw: trimmed });
  }
  return rows;
}

// Match employees between current and previous payroll by name similarity
function matchEmployees(currentRows, prevRows) {
  const matched = [];
  const unmatchedCurrent = [...currentRows];
  const unmatchedPrev = [...prevRows];

  for (let i = unmatchedCurrent.length - 1; i >= 0; i--) {
    const curr = unmatchedCurrent[i];
    const prevIdx = unmatchedPrev.findIndex(p => normalizeName(p.name) === normalizeName(curr.name));
    if (prevIdx !== -1) {
      matched.push({ current: curr, previous: unmatchedPrev[prevIdx] });
      unmatchedCurrent.splice(i, 1);
      unmatchedPrev.splice(prevIdx, 1);
    }
  }

  return { matched, addedEmployees: unmatchedCurrent, removedEmployees: unmatchedPrev };
}

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z]/g, '').trim();
}

// Diff matched employee rows — find which values changed
function diffPayrollRows(currentRows, prevRows) {
  const { matched, addedEmployees, removedEmployees } = matchEmployees(currentRows, prevRows);

  const changes = [];
  const unchanged = [];

  for (const { current, previous } of matched) {
    const diffs = [];
    const maxLen = Math.max(current.values.length, previous.values.length);
    for (let i = 0; i < maxLen; i++) {
      const curr = current.values[i] ?? null;
      const prev = previous.values[i] ?? null;
      if (curr !== prev) {
        diffs.push({ index: i, prev, curr, delta: curr !== null && prev !== null ? curr - prev : null });
      }
    }
    if (diffs.length > 0) {
      changes.push({ name: current.name, diffs, currentRaw: current.raw, previousRaw: previous.raw });
    } else {
      unchanged.push(current.name);
    }
  }

  return { changes, unchanged, addedEmployees, removedEmployees };
}

// Format a numeric delta for display
function formatPayrollDelta(prev, curr) {
  if (prev === null) return { display: formatPayrollValue(curr), delta: 'new' };
  if (curr === null) return { display: '—', delta: 'removed' };
  const diff = curr - prev;
  if (diff === 0) return { display: formatPayrollValue(curr), delta: null };
  const sign = diff > 0 ? '+' : '';
  const pct = prev !== 0 ? Math.round((diff / prev) * 1000) / 10 : null;
  const pctStr = pct !== null ? ` / ${sign}${pct}%` : '';
  return {
    display: formatPayrollValue(curr),
    delta: `${sign}${formatPayrollValue(diff)}${pctStr}`,
    increased: diff > 0,
  };
}

function formatPayrollValue(val) {
  if (val === null || val === undefined) return '—';
  if (Math.abs(val) >= 100) return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return val.toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("parsePayrollRows", () => {
  test("parses employee line with dollar amounts", () => {
    const rows = parsePayrollRows(["Laura Lavid  $3,500.00  40.00  $3,500.00"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Laura Lavid");
    expect(rows[0].values).toContain(3500.00);
    expect(rows[0].values).toContain(40.00);
  });

  test("parses multiple employees", () => {
    const rows = parsePayrollRows([
      "Laura Lavid  $3,500.00  40.00",
      "Carmen Alcantara  $2,800.00  38.00",
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Laura Lavid");
    expect(rows[1].name).toBe("Carmen Alcantara");
  });

  test("skips header rows", () => {
    const rows = parsePayrollRows([
      "Employee Name  Amount  Hours",
      "Total  $15,000.00  200.00",
      "Laura Lavid  $3,500.00  40.00",
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Laura Lavid");
  });

  test("skips empty lines", () => {
    expect(parsePayrollRows(["", "  ", "\n"])).toHaveLength(0);
  });

  test("skips lines without numbers", () => {
    expect(parsePayrollRows(["Some text without numbers"])).toHaveLength(0);
  });

  test("skips lines where name is too short", () => {
    expect(parsePayrollRows(["A  $100.00"])).toHaveLength(0);
  });

  test("handles null input", () => {
    expect(parsePayrollRows(null)).toEqual([]);
  });

  test("skips tax/deduction rows", () => {
    const rows = parsePayrollRows([
      "Federal Tax  $500.00",
      "Social Security  $250.00",
      "Medicare  $100.00",
      "Laura Lavid  $3,500.00",
    ]);
    expect(rows).toHaveLength(1);
  });

  test("skips subtotal and net rows", () => {
    const rows = parsePayrollRows([
      "Laura Lavid  $3,500.00",
      "Subtotal  $3,500.00",
      "Net Pay  $2,800.00",
      "Gross Pay  $3,500.00",
    ]);
    expect(rows).toHaveLength(1);
  });
});

describe("normalizeName", () => {
  test("lowercases", () => { expect(normalizeName("Laura Lavid")).toBe("lauralavid"); });
  test("strips non-alpha", () => { expect(normalizeName("O'Brien, Jr.")).toBe("obrienjr"); });
  test("handles null", () => { expect(normalizeName(null)).toBe(""); });
});

describe("matchEmployees", () => {
  test("matches by name", () => {
    const curr = [{ name: "Laura Lavid", values: [3500] }];
    const prev = [{ name: "Laura Lavid", values: [3400] }];
    const r = matchEmployees(curr, prev);
    expect(r.matched).toHaveLength(1);
    expect(r.addedEmployees).toHaveLength(0);
    expect(r.removedEmployees).toHaveLength(0);
  });

  test("detects new employee", () => {
    const curr = [{ name: "Laura Lavid", values: [3500] }, { name: "New Person", values: [2000] }];
    const prev = [{ name: "Laura Lavid", values: [3500] }];
    const r = matchEmployees(curr, prev);
    expect(r.matched).toHaveLength(1);
    expect(r.addedEmployees).toHaveLength(1);
    expect(r.addedEmployees[0].name).toBe("New Person");
  });

  test("detects removed employee", () => {
    const curr = [{ name: "Laura Lavid", values: [3500] }];
    const prev = [{ name: "Laura Lavid", values: [3500] }, { name: "Old Person", values: [2000] }];
    const r = matchEmployees(curr, prev);
    expect(r.removedEmployees).toHaveLength(1);
    expect(r.removedEmployees[0].name).toBe("Old Person");
  });

  test("handles empty inputs", () => {
    const r = matchEmployees([], []);
    expect(r.matched).toHaveLength(0);
  });
});

describe("diffPayrollRows", () => {
  test("identifies changed values", () => {
    const curr = [{ name: "Laura", values: [3600, 40] }];
    const prev = [{ name: "Laura", values: [3500, 40] }];
    const r = diffPayrollRows(curr, prev);
    expect(r.changes).toHaveLength(1);
    expect(r.changes[0].name).toBe("Laura");
    expect(r.changes[0].diffs[0].prev).toBe(3500);
    expect(r.changes[0].diffs[0].curr).toBe(3600);
    expect(r.changes[0].diffs[0].delta).toBe(100);
  });

  test("identifies unchanged employees", () => {
    const curr = [{ name: "Laura", values: [3500, 40] }];
    const prev = [{ name: "Laura", values: [3500, 40] }];
    const r = diffPayrollRows(curr, prev);
    expect(r.changes).toHaveLength(0);
    expect(r.unchanged).toContain("Laura");
  });

  test("handles multiple changes per employee", () => {
    const curr = [{ name: "Laura", values: [3600, 42] }];
    const prev = [{ name: "Laura", values: [3500, 40] }];
    const r = diffPayrollRows(curr, prev);
    expect(r.changes[0].diffs).toHaveLength(2);
  });

  test("handles new employee", () => {
    const r = diffPayrollRows([{ name: "New Person", values: [2000] }], []);
    expect(r.addedEmployees).toHaveLength(1);
  });

  test("handles removed employee", () => {
    const r = diffPayrollRows([], [{ name: "Old Person", values: [2000] }]);
    expect(r.removedEmployees).toHaveLength(1);
  });

  test("empty inputs", () => {
    const r = diffPayrollRows([], []);
    expect(r.changes).toHaveLength(0);
    expect(r.unchanged).toHaveLength(0);
  });
});

describe("formatPayrollDelta", () => {
  test("formats increase", () => {
    const r = formatPayrollDelta(3500, 3650);
    expect(r.display).toContain("3,650");
    expect(r.delta).toContain("+");
    expect(r.delta).toContain("150");
    expect(r.increased).toBe(true);
  });

  test("formats decrease", () => {
    const r = formatPayrollDelta(3500, 3400);
    expect(r.delta).not.toContain("+$");
    expect(r.increased).toBe(false);
  });

  test("no change returns null delta", () => {
    const r = formatPayrollDelta(3500, 3500);
    expect(r.delta).toBeNull();
  });

  test("new value", () => {
    const r = formatPayrollDelta(null, 3500);
    expect(r.delta).toBe("new");
  });

  test("removed value", () => {
    const r = formatPayrollDelta(3500, null);
    expect(r.display).toBe("—");
    expect(r.delta).toBe("removed");
  });

  test("includes percentage", () => {
    const r = formatPayrollDelta(100, 110);
    expect(r.delta).toContain("10%");
  });

  test("handles zero previous (no pct)", () => {
    const r = formatPayrollDelta(0, 100);
    expect(r.delta).not.toContain("%");
  });
});

describe("formatPayrollValue", () => {
  test("formats large numbers as dollars", () => {
    expect(formatPayrollValue(3500)).toContain("$3,500.00");
  });

  test("formats small numbers without dollar sign", () => {
    expect(formatPayrollValue(40)).toBe("40.00");
  });

  test("null returns dash", () => {
    expect(formatPayrollValue(null)).toBe("—");
  });

  test("undefined returns dash", () => {
    expect(formatPayrollValue(undefined)).toBe("—");
  });
});
