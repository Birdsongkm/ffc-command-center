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
