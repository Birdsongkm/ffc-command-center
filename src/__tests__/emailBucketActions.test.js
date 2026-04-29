/**
 * Email bucket action targeting — ensures selection is respected.
 * Tests for getActionTargetIds: determines which emails to act on
 * based on selection state and bucket context.
 */

// Pure function: determine which email IDs to act on
function getActionTargetIds(selectedIds, bucketEmailIds, fallbackIds) {
  // If emails are selected AND some are in this bucket, act on the intersection
  if (selectedIds && selectedIds.size > 0) {
    const bucketSet = new Set(bucketEmailIds);
    const intersection = [...selectedIds].filter(id => bucketSet.has(id));
    // If any selected emails are in this bucket, use those
    if (intersection.length > 0) return intersection;
    // If no selected emails are in this bucket, fall back to all
  }
  return fallbackIds;
}

// Pure function: get the label for a bucket action button based on selection
function getBucketActionLabel(action, selectedCount, totalCount, hasPages) {
  if (selectedCount > 0) return `${action} ${selectedCount} selected`;
  if (action === 'Delete' && hasPages) return 'Delete page';
  return `${action} all`;
}

describe("getActionTargetIds", () => {
  test("returns selected IDs when they intersect with bucket", () => {
    const selected = new Set(["a", "b", "c"]);
    const bucketIds = ["a", "b", "d", "e"];
    const fallback = ["a", "b", "d", "e"];
    const result = getActionTargetIds(selected, bucketIds, fallback);
    expect(result).toEqual(["a", "b"]);
  });

  test("returns fallback when no emails selected", () => {
    const selected = new Set();
    const bucketIds = ["a", "b"];
    const fallback = ["a", "b"];
    expect(getActionTargetIds(selected, bucketIds, fallback)).toEqual(["a", "b"]);
  });

  test("returns fallback when selected is null", () => {
    expect(getActionTargetIds(null, ["a"], ["a"])).toEqual(["a"]);
  });

  test("returns fallback when selected emails are not in this bucket", () => {
    const selected = new Set(["x", "y"]);
    const bucketIds = ["a", "b"];
    const fallback = ["a", "b"];
    expect(getActionTargetIds(selected, bucketIds, fallback)).toEqual(["a", "b"]);
  });

  test("returns only the intersection, not all selected", () => {
    const selected = new Set(["a", "b", "c", "d"]);
    const bucketIds = ["b", "d"];
    const fallback = ["b", "d"];
    const result = getActionTargetIds(selected, bucketIds, fallback);
    expect(result).toEqual(["b", "d"]);
  });

  test("empty bucket returns empty array", () => {
    const selected = new Set(["a"]);
    expect(getActionTargetIds(selected, [], [])).toEqual([]);
  });

  test("single selected email in bucket", () => {
    const selected = new Set(["b"]);
    const bucketIds = ["a", "b", "c"];
    const result = getActionTargetIds(selected, bucketIds, bucketIds);
    expect(result).toEqual(["b"]);
  });
});

describe("getBucketActionLabel", () => {
  test("shows selected count when emails selected", () => {
    expect(getBucketActionLabel("Read", 3, 10, false)).toBe("Read 3 selected");
  });

  test("shows 'Delete page' when paginated and nothing selected", () => {
    expect(getBucketActionLabel("Delete", 0, 10, true)).toBe("Delete page");
  });

  test("shows 'Delete all' when not paginated and nothing selected", () => {
    expect(getBucketActionLabel("Delete", 0, 10, false)).toBe("Delete all");
  });

  test("shows 'Read all' when nothing selected", () => {
    expect(getBucketActionLabel("Read", 0, 5, false)).toBe("Read all");
  });

  test("selected overrides page label for delete", () => {
    expect(getBucketActionLabel("Delete", 2, 10, true)).toBe("Delete 2 selected");
  });
});
