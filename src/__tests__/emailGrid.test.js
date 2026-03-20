/**
 * Tests for inbox grid layout logic:
 * - applyEmailBucketOverrides: override classifier with user drag-drop
 * - sortByMostRecent: most recent email first within a bucket
 * - bucketDisplayOrder: needs-response always first, team second
 */

// Applies user drag-drop overrides on top of classifier output
function applyEmailBucketOverrides(emailsByBucket, overrides) {
  if (!overrides || Object.keys(overrides).length === 0) return emailsByBucket;
  const result = {};
  // Copy existing buckets, removing overridden emails
  for (const [bucket, emails] of Object.entries(emailsByBucket)) {
    result[bucket] = emails.filter(e => !overrides[e.id] || overrides[e.id] === bucket);
  }
  // Place overridden emails into their target bucket
  for (const [emailId, targetBucket] of Object.entries(overrides)) {
    if (!result[targetBucket]) result[targetBucket] = [];
    // Find the email in the original buckets
    for (const emails of Object.values(emailsByBucket)) {
      const found = emails.find(e => e.id === emailId);
      if (found && !result[targetBucket].find(e => e.id === emailId)) {
        result[targetBucket].push(found);
        break;
      }
    }
  }
  return result;
}

function sortByMostRecent(emails) {
  return [...emails].sort((a, b) => {
    const ta = a.internalDate ? parseInt(a.internalDate) : new Date(a.date || 0).getTime();
    const tb = b.internalDate ? parseInt(b.internalDate) : new Date(b.date || 0).getTime();
    return tb - ta;
  });
}

const BUCKET_ORDER = [
  'needs-response', 'team', 'classy-onetime', 'fyi-mass',
  'classy-recurring', 'calendar-notif', 'docs-activity', 'automated', 'newsletter',
];

function bucketDisplayOrder(bucketKeys) {
  return [...bucketKeys].sort((a, b) => {
    const ia = BUCKET_ORDER.indexOf(a);
    const ib = BUCKET_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

// ── applyEmailBucketOverrides ──────────────────────────────────────────────────
describe('applyEmailBucketOverrides', () => {
  const emailsByBucket = {
    'needs-response': [{ id: 'a', subject: 'Grant question' }],
    'team': [{ id: 'b', subject: 'Team update' }],
    'automated': [{ id: 'c', subject: 'System alert' }],
  };

  test('returns same structure when no overrides', () => {
    const result = applyEmailBucketOverrides(emailsByBucket, {});
    expect(result['needs-response']).toHaveLength(1);
    expect(result['team']).toHaveLength(1);
  });

  test('moves email to target bucket', () => {
    const result = applyEmailBucketOverrides(emailsByBucket, { a: 'team' });
    expect(result['needs-response']).toHaveLength(0);
    expect(result['team'].map(e => e.id)).toContain('a');
  });

  test('moved email appears only in target bucket, not source', () => {
    const result = applyEmailBucketOverrides(emailsByBucket, { c: 'needs-response' });
    const allIds = Object.values(result).flat().map(e => e.id);
    const cCount = allIds.filter(id => id === 'c').length;
    expect(cCount).toBe(1);
    expect(result['needs-response'].map(e => e.id)).toContain('c');
    expect(result['automated'].map(e => e.id)).not.toContain('c');
  });

  test('multiple overrides applied correctly', () => {
    const result = applyEmailBucketOverrides(emailsByBucket, { a: 'automated', c: 'team' });
    expect(result['needs-response']).toHaveLength(0);
    expect(result['automated'].map(e => e.id)).toContain('a');
    expect(result['team'].map(e => e.id)).toContain('c');
  });

  test('returns original when overrides is null', () => {
    const result = applyEmailBucketOverrides(emailsByBucket, null);
    expect(result['needs-response']).toHaveLength(1);
  });
});

// ── sortByMostRecent ──────────────────────────────────────────────────────────
describe('sortByMostRecent', () => {
  test('most recent first by internalDate', () => {
    const emails = [
      { id: 'old', internalDate: '1000000000000' },
      { id: 'new', internalDate: '2000000000000' },
    ];
    expect(sortByMostRecent(emails)[0].id).toBe('new');
  });

  test('most recent first by date string', () => {
    const emails = [
      { id: 'old', date: '2026-01-01T00:00:00Z' },
      { id: 'new', date: '2026-03-01T00:00:00Z' },
    ];
    expect(sortByMostRecent(emails)[0].id).toBe('new');
  });

  test('does not mutate original array', () => {
    const emails = [{ id: 'a', internalDate: '1' }, { id: 'b', internalDate: '2' }];
    const original = [...emails];
    sortByMostRecent(emails);
    expect(emails[0].id).toBe(original[0].id);
  });

  test('handles single email', () => {
    expect(sortByMostRecent([{ id: 'x', internalDate: '123' }])).toHaveLength(1);
  });

  test('handles empty array', () => {
    expect(sortByMostRecent([])).toEqual([]);
  });
});

// ── bucketDisplayOrder ────────────────────────────────────────────────────────
describe('bucketDisplayOrder', () => {
  test('needs-response always first', () => {
    const keys = ['automated', 'needs-response', 'team'];
    expect(bucketDisplayOrder(keys)[0]).toBe('needs-response');
  });

  test('team always second when present', () => {
    const keys = ['newsletter', 'automated', 'needs-response', 'team'];
    const ordered = bucketDisplayOrder(keys);
    expect(ordered[0]).toBe('needs-response');
    expect(ordered[1]).toBe('team');
  });

  test('unknown buckets go last', () => {
    const keys = ['unknown-bucket', 'needs-response'];
    const ordered = bucketDisplayOrder(keys);
    expect(ordered[0]).toBe('needs-response');
    expect(ordered[ordered.length - 1]).toBe('unknown-bucket');
  });

  test('does not mutate input array', () => {
    const keys = ['team', 'needs-response'];
    bucketDisplayOrder(keys);
    expect(keys[0]).toBe('team');
  });
});
