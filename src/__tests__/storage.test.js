/**
 * localStorage registry tests — src/lib/storage.js
 * Validates schema enforcement, corruption handling, type checking.
 */

const { readStorage, writeStorage, removeStorage, getSchema, listStorageKeys, SCHEMA } = require('../lib/storage');

// Mock localStorage for Node test environment
const mockStorage = {};
beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  global.window = {
    localStorage: undefined, // replaced below
  };
  global.localStorage = {
    getItem: jest.fn(key => mockStorage[key] !== undefined ? mockStorage[key] : null),
    setItem: jest.fn((key, value) => { mockStorage[key] = String(value); }),
    removeItem: jest.fn(key => { delete mockStorage[key]; }),
  };
  // Make window.localStorage available
  global.window = global;
});

afterEach(() => {
  delete global.window;
  delete global.localStorage;
});

// ── Schema validation ────────────────────────────────────────────────────────

describe("SCHEMA", () => {
  test("has entries for all known keys", () => {
    const expectedKeys = [
      'ffc_tasks', 'ffc_tasks_backup', 'ffc_prepped', 'ffc_stickies',
      'ffc_custom_cats', 'ffc_team_order', 'ffc_drive_layout', 'ffc_email_density',
      'ffc_user_settings', 'ffc_dark_mode', 'ffc_bucket_labels', 'ffc_bucket_descriptions',
      'ffc_learned_buckets', 'ffc_action_history', 'ffc_follow_ups', 'ffc_dashboard_layout',
      'ffc_todo_emails', 'ffc_grants', 'ffc_team_docs', 'ffc_scheduled_emails',
      'ffc_agenda_items', 'ffc_email_action_config', 'ffc_prep_opened',
      'ffc_dismissed_payroll', 'ffc_dismissed_finance', 'ffc_fwd_suggest',
    ];
    for (const key of expectedKeys) {
      expect(SCHEMA[key]).toBeDefined();
      expect(SCHEMA[key].type).toBeDefined();
      expect(SCHEMA[key]).toHaveProperty('fallback');
    }
  });

  test("every schema entry has a valid type", () => {
    const validTypes = ['array', 'object', 'string'];
    for (const [key, schema] of Object.entries(SCHEMA)) {
      expect(validTypes).toContain(schema.type);
    }
  });

  test("array types have array fallbacks", () => {
    for (const [key, schema] of Object.entries(SCHEMA)) {
      if (schema.type === 'array') {
        expect(Array.isArray(schema.fallback)).toBe(true);
      }
    }
  });

  test("object types have object or null fallbacks", () => {
    for (const [key, schema] of Object.entries(SCHEMA)) {
      if (schema.type === 'object') {
        expect(schema.fallback === null || typeof schema.fallback === 'object').toBe(true);
      }
    }
  });

  test("string types have string fallbacks", () => {
    for (const [key, schema] of Object.entries(SCHEMA)) {
      if (schema.type === 'string') {
        expect(typeof schema.fallback).toBe('string');
      }
    }
  });
});

// ── readStorage ──────────────────────────────────────────────────────────────

describe("readStorage", () => {
  test("returns fallback for missing key", () => {
    expect(readStorage('ffc_tasks')).toEqual([]);
  });

  test("returns fallback for null value", () => {
    mockStorage['ffc_tasks'] = null;
    expect(readStorage('ffc_tasks')).toEqual([]);
  });

  test("parses valid JSON array", () => {
    mockStorage['ffc_tasks'] = JSON.stringify([{ id: 1, title: "Test" }]);
    const result = readStorage('ffc_tasks');
    expect(result).toEqual([{ id: 1, title: "Test" }]);
  });

  test("parses valid JSON object", () => {
    mockStorage['ffc_bucket_labels'] = JSON.stringify({ team: "Staff" });
    expect(readStorage('ffc_bucket_labels')).toEqual({ team: "Staff" });
  });

  test("returns raw string for string-type keys", () => {
    mockStorage['ffc_drive_layout'] = 'grid';
    expect(readStorage('ffc_drive_layout')).toBe('grid');
  });

  test("returns fallback for corrupt JSON", () => {
    mockStorage['ffc_tasks'] = '{broken json[[[';
    expect(readStorage('ffc_tasks')).toEqual([]);
  });

  test("returns fallback when array expected but object found", () => {
    mockStorage['ffc_tasks'] = JSON.stringify({ not: "an array" });
    expect(readStorage('ffc_tasks')).toEqual([]);
  });

  test("returns fallback when object expected but array found", () => {
    mockStorage['ffc_bucket_labels'] = JSON.stringify(["not", "an", "object"]);
    expect(readStorage('ffc_bucket_labels')).toEqual({});
  });

  test("returns undefined for unknown keys", () => {
    expect(readStorage('ffc_nonexistent_key')).toBeUndefined();
  });

  test("handles null object value (allowed for nullable schemas)", () => {
    mockStorage['ffc_user_settings'] = JSON.stringify(null);
    expect(readStorage('ffc_user_settings')).toBeNull();
  });

  test("handles empty array", () => {
    mockStorage['ffc_tasks'] = JSON.stringify([]);
    expect(readStorage('ffc_tasks')).toEqual([]);
  });

  test("handles empty object", () => {
    mockStorage['ffc_bucket_labels'] = JSON.stringify({});
    expect(readStorage('ffc_bucket_labels')).toEqual({});
  });

  test("handles nested objects", () => {
    const data = { "email-team": { width: 400, height: 200 } };
    mockStorage['ffc_dashboard_layout'] = JSON.stringify(data);
    expect(readStorage('ffc_dashboard_layout')).toEqual(data);
  });

  test("ffc_dark_mode returns raw string", () => {
    mockStorage['ffc_dark_mode'] = 'true';
    expect(readStorage('ffc_dark_mode')).toBe('true');
  });

  test("ffc_email_density returns raw string", () => {
    mockStorage['ffc_email_density'] = 'compact';
    expect(readStorage('ffc_email_density')).toBe('compact');
  });

  test("handles very large arrays", () => {
    const bigArray = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    mockStorage['ffc_tasks'] = JSON.stringify(bigArray);
    expect(readStorage('ffc_tasks')).toHaveLength(1000);
  });
});

// ── writeStorage ─────────────────────────────────────────────────────────────

describe("writeStorage", () => {
  test("writes array value as JSON", () => {
    writeStorage('ffc_tasks', [{ id: 1 }]);
    expect(mockStorage['ffc_tasks']).toBe('[{"id":1}]');
  });

  test("writes object value as JSON", () => {
    writeStorage('ffc_bucket_labels', { team: "Staff" });
    expect(mockStorage['ffc_bucket_labels']).toBe('{"team":"Staff"}');
  });

  test("writes string value directly (not JSON-encoded)", () => {
    writeStorage('ffc_drive_layout', 'grid');
    expect(mockStorage['ffc_drive_layout']).toBe('grid');
  });

  test("returns true on success", () => {
    expect(writeStorage('ffc_tasks', [])).toBe(true);
  });

  test("returns false for unknown key", () => {
    expect(writeStorage('ffc_nonexistent', "value")).toBe(false);
  });

  test("does not write unknown keys to localStorage", () => {
    writeStorage('ffc_nonexistent', "value");
    expect(mockStorage['ffc_nonexistent']).toBeUndefined();
  });

  test("handles null value for nullable keys", () => {
    writeStorage('ffc_user_settings', null);
    expect(mockStorage['ffc_user_settings']).toBe('null');
  });

  test("handles empty array", () => {
    writeStorage('ffc_tasks', []);
    expect(mockStorage['ffc_tasks']).toBe('[]');
  });

  test("handles empty object", () => {
    writeStorage('ffc_bucket_labels', {});
    expect(mockStorage['ffc_bucket_labels']).toBe('{}');
  });

  test("overwrites existing value", () => {
    writeStorage('ffc_tasks', [{ id: 1 }]);
    writeStorage('ffc_tasks', [{ id: 2 }]);
    expect(JSON.parse(mockStorage['ffc_tasks'])).toEqual([{ id: 2 }]);
  });

  test("returns false when localStorage throws (quota exceeded)", () => {
    localStorage.setItem = jest.fn(() => { throw new Error('QuotaExceededError'); });
    expect(writeStorage('ffc_tasks', [])).toBe(false);
  });
});

// ── removeStorage ────────────────────────────────────────────────────────────

describe("removeStorage", () => {
  test("removes a key", () => {
    mockStorage['ffc_tasks'] = '[]';
    removeStorage('ffc_tasks');
    expect(localStorage.removeItem).toHaveBeenCalledWith('ffc_tasks');
  });

  test("does not throw for missing key", () => {
    expect(() => removeStorage('ffc_nonexistent')).not.toThrow();
  });
});

// ── getSchema ────────────────────────────────────────────────────────────────

describe("getSchema", () => {
  test("returns schema for known key", () => {
    const s = getSchema('ffc_tasks');
    expect(s.type).toBe('array');
    expect(s.fallback).toEqual([]);
  });

  test("returns null for unknown key", () => {
    expect(getSchema('ffc_nonexistent')).toBeNull();
  });
});

// ── listStorageKeys ──────────────────────────────────────────────────────────

describe("listStorageKeys", () => {
  test("returns all registered keys", () => {
    const keys = listStorageKeys();
    expect(keys).toContain('ffc_tasks');
    expect(keys).toContain('ffc_bucket_labels');
    expect(keys).toContain('ffc_dark_mode');
    expect(keys.length).toBe(Object.keys(SCHEMA).length);
  });
});

// ── Round-trip tests ─────────────────────────────────────────────────────────

describe("round-trip read/write", () => {
  test("array round-trip preserves data", () => {
    const data = [{ id: "a", title: "Test", done: false }];
    writeStorage('ffc_tasks', data);
    expect(readStorage('ffc_tasks')).toEqual(data);
  });

  test("object round-trip preserves data", () => {
    const data = { team: "Staff", newsletter: "News" };
    writeStorage('ffc_bucket_labels', data);
    expect(readStorage('ffc_bucket_labels')).toEqual(data);
  });

  test("string round-trip preserves data", () => {
    writeStorage('ffc_drive_layout', 'grid');
    expect(readStorage('ffc_drive_layout')).toBe('grid');
  });

  test("null round-trip for nullable schema", () => {
    writeStorage('ffc_user_settings', null);
    expect(readStorage('ffc_user_settings')).toBeNull();
  });

  test("complex nested data round-trip", () => {
    const data = {
      todaySections: [{ id: 'a', label: 'Test', width: 'full' }],
      teamMembers: [{ name: 'Alice', email: 'a@b.com' }],
      emailBucketWidths: { team: 'full' },
      panelSizes: { 'email-team': { width: 400, height: 200 } },
    };
    writeStorage('ffc_dashboard_layout', data);
    expect(readStorage('ffc_dashboard_layout')).toEqual(data);
  });

  test("Set serialized as array round-trips correctly", () => {
    // Sets are stored as arrays in localStorage
    const ids = ['id1', 'id2', 'id3'];
    writeStorage('ffc_todo_emails', ids);
    expect(readStorage('ffc_todo_emails')).toEqual(ids);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  test("handles emoji in values", () => {
    writeStorage('ffc_bucket_labels', { team: "👥 Staff" });
    expect(readStorage('ffc_bucket_labels')).toEqual({ team: "👥 Staff" });
  });

  test("handles special characters in values", () => {
    writeStorage('ffc_bucket_labels', { team: 'Team "Internal" & <External>' });
    expect(readStorage('ffc_bucket_labels')).toEqual({ team: 'Team "Internal" & <External>' });
  });

  test("handles boolean-like strings", () => {
    writeStorage('ffc_dark_mode', 'true');
    expect(readStorage('ffc_dark_mode')).toBe('true');
    writeStorage('ffc_dark_mode', 'false');
    expect(readStorage('ffc_dark_mode')).toBe('false');
  });

  test("corrupt data doesn't crash, returns fallback", () => {
    mockStorage['ffc_grants'] = 'not json at all!!!';
    expect(() => readStorage('ffc_grants')).not.toThrow();
    expect(readStorage('ffc_grants')).toEqual([]);
  });

  test("number stored as JSON in object field", () => {
    mockStorage['ffc_bucket_labels'] = '42';
    expect(readStorage('ffc_bucket_labels')).toEqual({});
  });

  test("string stored in array field", () => {
    mockStorage['ffc_tasks'] = '"just a string"';
    expect(readStorage('ffc_tasks')).toEqual([]);
  });
});
