/**
 * Email section editing — issue #84
 * Tests: getBucketLabel, moveable email sections, label persistence logic.
 */

// Duplicated inline per project pattern
function getBucketLabel(key, customLabels, defaultLabel) {
  if (customLabels && customLabels[key] && customLabels[key].trim()) {
    return customLabels[key].trim();
  }
  return defaultLabel;
}

function getEmailSection(emailId, overrides, classifiedBucket) {
  return (overrides && overrides[emailId]) || classifiedBucket;
}

function setBucketLabel(customLabels, key, newLabel) {
  if (!newLabel || !newLabel.trim()) {
    // Empty label — remove override, revert to default
    const updated = { ...customLabels };
    delete updated[key];
    return updated;
  }
  return { ...customLabels, [key]: newLabel.trim() };
}

function moveEmailToSection(overrides, emailId, targetBucket) {
  return { ...overrides, [emailId]: targetBucket };
}

function removeEmailSectionOverride(overrides, emailId) {
  const updated = { ...overrides };
  delete updated[emailId];
  return updated;
}

// ── getBucketLabel ────────────────────────────────────────────────────────────

describe("getBucketLabel", () => {
  test("returns default when no custom labels defined", () => {
    expect(getBucketLabel("team", {}, "Team / Internal")).toBe("Team / Internal");
  });

  test("returns default when custom labels is null", () => {
    expect(getBucketLabel("team", null, "Team / Internal")).toBe("Team / Internal");
  });

  test("returns custom label when set", () => {
    expect(getBucketLabel("team", { team: "Staff" }, "Team / Internal")).toBe("Staff");
  });

  test("returns default when custom label for key is empty string", () => {
    expect(getBucketLabel("team", { team: "" }, "Team / Internal")).toBe("Team / Internal");
  });

  test("returns default when custom label for key is whitespace", () => {
    expect(getBucketLabel("team", { team: "   " }, "Team / Internal")).toBe("Team / Internal");
  });

  test("trims whitespace from custom label", () => {
    expect(getBucketLabel("team", { team: "  Staff  " }, "Team / Internal")).toBe("Staff");
  });

  test("custom label for one key does not affect another", () => {
    const labels = { team: "Staff" };
    expect(getBucketLabel("newsletter", labels, "Newsletters")).toBe("Newsletters");
  });

  test("returns default when key not present in custom labels", () => {
    const labels = { team: "Staff" };
    expect(getBucketLabel("needs-response", labels, "Important")).toBe("Important");
  });
});

// ── getEmailSection ───────────────────────────────────────────────────────────

describe("getEmailSection", () => {
  test("returns classified bucket when no override", () => {
    expect(getEmailSection("email1", {}, "newsletter")).toBe("newsletter");
  });

  test("returns override bucket when set", () => {
    expect(getEmailSection("email1", { email1: "team" }, "newsletter")).toBe("team");
  });

  test("returns classified bucket when override is for different email", () => {
    expect(getEmailSection("email1", { email2: "team" }, "newsletter")).toBe("newsletter");
  });

  test("handles null overrides", () => {
    expect(getEmailSection("email1", null, "newsletter")).toBe("newsletter");
  });
});

// ── setBucketLabel ────────────────────────────────────────────────────────────

describe("setBucketLabel", () => {
  test("adds new custom label", () => {
    const result = setBucketLabel({}, "team", "Staff");
    expect(result).toEqual({ team: "Staff" });
  });

  test("updates existing custom label", () => {
    const result = setBucketLabel({ team: "Staff" }, "team", "Team Updates");
    expect(result).toEqual({ team: "Team Updates" });
  });

  test("removes label when empty string passed", () => {
    const result = setBucketLabel({ team: "Staff" }, "team", "");
    expect(result).not.toHaveProperty("team");
  });

  test("removes label when whitespace passed", () => {
    const result = setBucketLabel({ team: "Staff" }, "team", "   ");
    expect(result).not.toHaveProperty("team");
  });

  test("trims label before saving", () => {
    const result = setBucketLabel({}, "team", "  Staff  ");
    expect(result.team).toBe("Staff");
  });

  test("does not mutate original object", () => {
    const original = { team: "Staff" };
    setBucketLabel(original, "newsletter", "Lists");
    expect(original).not.toHaveProperty("newsletter");
  });
});

// ── moveEmailToSection ────────────────────────────────────────────────────────

describe("moveEmailToSection", () => {
  test("adds override for email", () => {
    const result = moveEmailToSection({}, "email1", "team");
    expect(result).toEqual({ email1: "team" });
  });

  test("updates existing override", () => {
    const result = moveEmailToSection({ email1: "newsletter" }, "email1", "team");
    expect(result).toEqual({ email1: "team" });
  });

  test("preserves other overrides", () => {
    const result = moveEmailToSection({ email2: "fyi-mass" }, "email1", "team");
    expect(result).toEqual({ email1: "team", email2: "fyi-mass" });
  });

  test("does not mutate original overrides", () => {
    const original = {};
    moveEmailToSection(original, "email1", "team");
    expect(original).toEqual({});
  });
});

// ── removeEmailSectionOverride ────────────────────────────────────────────────

describe("removeEmailSectionOverride", () => {
  test("removes the specified override", () => {
    const result = removeEmailSectionOverride({ email1: "team" }, "email1");
    expect(result).not.toHaveProperty("email1");
  });

  test("preserves other overrides when removing one", () => {
    const result = removeEmailSectionOverride({ email1: "team", email2: "newsletter" }, "email1");
    expect(result).toEqual({ email2: "newsletter" });
  });

  test("handles removing a key that does not exist", () => {
    const result = removeEmailSectionOverride({ email2: "newsletter" }, "email1");
    expect(result).toEqual({ email2: "newsletter" });
  });

  test("does not mutate original", () => {
    const original = { email1: "team" };
    removeEmailSectionOverride(original, "email1");
    expect(original).toHaveProperty("email1");
  });
});

// ── reorderBucketList — move a bucket to a new position (#108) ───────────────

function reorderBucketList(order, fromKey, toKey) {
  const arr = [...order];
  const fromIdx = arr.indexOf(fromKey);
  const toIdx = arr.indexOf(toKey);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return arr;
  const [moved] = arr.splice(fromIdx, 1);
  arr.splice(toIdx, 0, moved);
  return arr;
}

function sortBucketsByCustomOrder(bucketEntries, customOrder, defaultOrder) {
  const order = customOrder && customOrder.length > 0 ? customOrder : defaultOrder;
  return [...bucketEntries].sort(([a], [b]) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

describe("reorderBucketList", () => {
  const DEFAULT = ['needs-response', 'to-do', 'team', 'financial', 'fyi-mass', 'newsletter', 'sales'];

  test("moves a bucket forward in the list", () => {
    const result = reorderBucketList(DEFAULT, 'fyi-mass', 'to-do');
    expect(result.indexOf('fyi-mass')).toBe(1);
    expect(result.indexOf('to-do')).toBe(2);
  });

  test("moves a bucket backward in the list", () => {
    const result = reorderBucketList(DEFAULT, 'to-do', 'newsletter');
    expect(result.indexOf('to-do')).toBe(5);
  });

  test("no-op when from and to are the same", () => {
    const result = reorderBucketList(DEFAULT, 'team', 'team');
    expect(result).toEqual(DEFAULT);
  });

  test("no-op when from key does not exist", () => {
    const result = reorderBucketList(DEFAULT, 'nonexistent', 'team');
    expect(result).toEqual(DEFAULT);
  });

  test("no-op when to key does not exist", () => {
    const result = reorderBucketList(DEFAULT, 'team', 'nonexistent');
    expect(result).toEqual(DEFAULT);
  });

  test("does not mutate original array", () => {
    const original = [...DEFAULT];
    reorderBucketList(original, 'fyi-mass', 'to-do');
    expect(original).toEqual(DEFAULT);
  });

  test("preserves all items after reorder", () => {
    const result = reorderBucketList(DEFAULT, 'sales', 'needs-response');
    expect(result.sort()).toEqual([...DEFAULT].sort());
  });
});

// ── bucket descriptions (#99) ────────────────────────────────────────────────

function setBucketDescription(descriptions, key, text) {
  const updated = { ...descriptions };
  if (!text || !text.trim()) {
    delete updated[key];
  } else {
    updated[key] = text.trim();
  }
  return updated;
}

function getBucketDescription(descriptions, key) {
  return (descriptions && descriptions[key]) || null;
}

describe("setBucketDescription", () => {
  test("adds a new description", () => {
    const r = setBucketDescription({}, "team", "Internal staff emails");
    expect(r.team).toBe("Internal staff emails");
  });

  test("updates existing description", () => {
    const r = setBucketDescription({ team: "Old" }, "team", "New desc");
    expect(r.team).toBe("New desc");
  });

  test("removes description when empty", () => {
    const r = setBucketDescription({ team: "Something" }, "team", "");
    expect(r).not.toHaveProperty("team");
  });

  test("removes description when whitespace only", () => {
    const r = setBucketDescription({ team: "Something" }, "team", "   ");
    expect(r).not.toHaveProperty("team");
  });

  test("trims description", () => {
    const r = setBucketDescription({}, "team", "  some text  ");
    expect(r.team).toBe("some text");
  });

  test("does not mutate original", () => {
    const original = { team: "Old" };
    setBucketDescription(original, "newsletter", "News");
    expect(original).not.toHaveProperty("newsletter");
  });
});

describe("getBucketDescription", () => {
  test("returns description when set", () => {
    expect(getBucketDescription({ team: "Staff emails" }, "team")).toBe("Staff emails");
  });

  test("returns null when not set", () => {
    expect(getBucketDescription({}, "team")).toBeNull();
  });

  test("returns null when descriptions is null", () => {
    expect(getBucketDescription(null, "team")).toBeNull();
  });
});

describe("sortBucketsByCustomOrder", () => {
  const DEFAULT_ORDER = ['needs-response', 'to-do', 'team', 'newsletter', 'sales'];

  test("sorts by default order when no custom order", () => {
    const entries = [['sales', []], ['needs-response', []], ['team', []]];
    const result = sortBucketsByCustomOrder(entries, null, DEFAULT_ORDER);
    expect(result.map(([k]) => k)).toEqual(['needs-response', 'team', 'sales']);
  });

  test("sorts by default order when custom order is empty", () => {
    const entries = [['sales', []], ['needs-response', []], ['team', []]];
    const result = sortBucketsByCustomOrder(entries, [], DEFAULT_ORDER);
    expect(result.map(([k]) => k)).toEqual(['needs-response', 'team', 'sales']);
  });

  test("sorts by custom order when provided", () => {
    const customOrder = ['sales', 'team', 'needs-response', 'newsletter', 'to-do'];
    const entries = [['needs-response', []], ['team', []], ['sales', []]];
    const result = sortBucketsByCustomOrder(entries, customOrder, DEFAULT_ORDER);
    expect(result.map(([k]) => k)).toEqual(['sales', 'team', 'needs-response']);
  });

  test("unknown buckets sort to the end", () => {
    const entries = [['unknown-bucket', []], ['needs-response', []]];
    const result = sortBucketsByCustomOrder(entries, null, DEFAULT_ORDER);
    expect(result.map(([k]) => k)).toEqual(['needs-response', 'unknown-bucket']);
  });

  test("does not mutate original entries", () => {
    const entries = [['sales', []], ['needs-response', []]];
    const original = [...entries];
    sortBucketsByCustomOrder(entries, null, DEFAULT_ORDER);
    expect(entries).toEqual(original);
  });
});
