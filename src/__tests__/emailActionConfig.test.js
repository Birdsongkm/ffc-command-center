/**
 * Email action button configuration — issue #90
 * Tests: isEmailActionVisible, getEmailActionConfig, EMAIL_ACTION_BUTTONS shape
 *
 * Users can toggle which action buttons appear in the email card row.
 * Config is stored in localStorage as ffc_email_action_config.
 * Absent keys default to the button's defaultOn value (true for all standard buttons).
 */

// ── Pure helpers (duplicated inline — project pattern) ────────────────────────

const EMAIL_ACTION_BUTTONS = [
  { id: "reply",     label: "↩ Reply",        defaultOn: true },
  { id: "aiDraft",   label: "✨ Draft Reply",  defaultOn: true },
  { id: "trash",     label: "🗑 Delete",       defaultOn: true },
  { id: "markRead",  label: "✓ Mark Read",    defaultOn: true },
  { id: "star",      label: "⭐ Star",         defaultOn: true },
  { id: "makeTask",  label: "📋 Make Task",    defaultOn: true },
  { id: "toDo",      label: "📌 To Do",        defaultOn: true },
  { id: "moveTo",    label: "📂 Move to…",     defaultOn: true },
  { id: "forward",   label: "↗ Forward",       defaultOn: true },
  { id: "snooze",    label: "⏰ Snooze",        defaultOn: true },
  { id: "makeEvent", label: "📅 Make Event",   defaultOn: true },
];

// Returns true when a button should be shown.
// If the button id is absent from config, falls back to the defaultOn value.
function isEmailActionVisible(id, config) {
  if (!config || !(id in config)) {
    const btn = EMAIL_ACTION_BUTTONS.find(b => b.id === id);
    return btn ? btn.defaultOn : false;
  }
  return !!config[id];
}

// Merges stored config (partial) with defaults. Unknown keys are preserved.
function getEmailActionConfig(stored) {
  const defaults = {};
  EMAIL_ACTION_BUTTONS.forEach(b => { defaults[b.id] = b.defaultOn; });
  return { ...defaults, ...(stored || {}) };
}

// ── EMAIL_ACTION_BUTTONS shape ────────────────────────────────────────────────

describe('EMAIL_ACTION_BUTTONS shape', () => {
  test('has at least 8 buttons', () => {
    expect(EMAIL_ACTION_BUTTONS.length).toBeGreaterThanOrEqual(8);
  });

  test('every button has id, label, and defaultOn', () => {
    EMAIL_ACTION_BUTTONS.forEach(btn => {
      expect(typeof btn.id).toBe('string');
      expect(btn.id.length).toBeGreaterThan(0);
      expect(typeof btn.label).toBe('string');
      expect(btn.label.length).toBeGreaterThan(0);
      expect(typeof btn.defaultOn).toBe('boolean');
    });
  });

  test('all button ids are unique', () => {
    const ids = EMAIL_ACTION_BUTTONS.map(b => b.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('includes reply button', () => {
    expect(EMAIL_ACTION_BUTTONS.find(b => b.id === 'reply')).toBeDefined();
  });

  test('includes trash button', () => {
    expect(EMAIL_ACTION_BUTTONS.find(b => b.id === 'trash')).toBeDefined();
  });

  test('includes aiDraft button', () => {
    expect(EMAIL_ACTION_BUTTONS.find(b => b.id === 'aiDraft')).toBeDefined();
  });

  test('all buttons default to on', () => {
    EMAIL_ACTION_BUTTONS.forEach(b => {
      expect(b.defaultOn).toBe(true);
    });
  });
});

// ── isEmailActionVisible ──────────────────────────────────────────────────────

describe('isEmailActionVisible', () => {
  test('returns true when config has button set to true', () => {
    expect(isEmailActionVisible('reply', { reply: true })).toBe(true);
  });

  test('returns false when config has button set to false', () => {
    expect(isEmailActionVisible('reply', { reply: false })).toBe(false);
  });

  test('returns defaultOn (true) when button absent from config', () => {
    expect(isEmailActionVisible('reply', {})).toBe(true);
  });

  test('returns defaultOn (true) when config is null', () => {
    expect(isEmailActionVisible('reply', null)).toBe(true);
  });

  test('returns defaultOn (true) when config is undefined', () => {
    expect(isEmailActionVisible('star', undefined)).toBe(true);
  });

  test('returns false for unknown button id with no config', () => {
    expect(isEmailActionVisible('nonExistentBtn', {})).toBe(false);
  });

  test('trash hidden when config sets it false', () => {
    expect(isEmailActionVisible('trash', { trash: false })).toBe(false);
  });

  test('markRead visible when other buttons are hidden', () => {
    const config = { reply: false, trash: false, star: false };
    expect(isEmailActionVisible('markRead', config)).toBe(true);
  });

  test('all buttons visible with empty config (all default to on)', () => {
    const config = {};
    const allVisible = EMAIL_ACTION_BUTTONS.every(b => isEmailActionVisible(b.id, config));
    expect(allVisible).toBe(true);
  });

  test('button explicitly set to true overrides default', () => {
    expect(isEmailActionVisible('forward', { forward: true })).toBe(true);
  });
});

// ── getEmailActionConfig ──────────────────────────────────────────────────────

describe('getEmailActionConfig', () => {
  test('returns all button ids with true values for null input', () => {
    const config = getEmailActionConfig(null);
    EMAIL_ACTION_BUTTONS.forEach(b => {
      expect(config).toHaveProperty(b.id);
      expect(config[b.id]).toBe(true);
    });
  });

  test('merges stored partial config with defaults', () => {
    const stored = { reply: false };
    const config = getEmailActionConfig(stored);
    expect(config.reply).toBe(false);
    expect(config.trash).toBe(true); // default
    expect(config.star).toBe(true); // default
  });

  test('stored values override defaults', () => {
    const stored = { trash: false, star: false, makeTask: false };
    const config = getEmailActionConfig(stored);
    expect(config.trash).toBe(false);
    expect(config.star).toBe(false);
    expect(config.makeTask).toBe(false);
    expect(config.reply).toBe(true); // still default
  });

  test('unknown keys in stored config are preserved', () => {
    const stored = { futureButton: true };
    const config = getEmailActionConfig(stored);
    expect(config.futureButton).toBe(true);
  });

  test('all default keys present even when stored is empty', () => {
    const config = getEmailActionConfig({});
    const allPresent = EMAIL_ACTION_BUTTONS.every(b => b.id in config);
    expect(allPresent).toBe(true);
  });

  test('returns a new object each call (no mutation)', () => {
    const stored = { reply: false };
    const a = getEmailActionConfig(stored);
    const b = getEmailActionConfig(stored);
    expect(a).not.toBe(b); // different object references
    expect(a).toEqual(b);  // same content
  });

  test('handles undefined input same as null', () => {
    const config = getEmailActionConfig(undefined);
    EMAIL_ACTION_BUTTONS.forEach(b => {
      expect(config[b.id]).toBe(true);
    });
  });
});

// ── integration: toggle sequence ──────────────────────────────────────────────

describe('toggle sequence', () => {
  test('user can hide and re-show a button via config updates', () => {
    let config = getEmailActionConfig(null);
    expect(isEmailActionVisible('reply', config)).toBe(true);

    // User hides reply
    config = { ...config, reply: false };
    expect(isEmailActionVisible('reply', config)).toBe(false);

    // User re-enables reply
    config = { ...config, reply: true };
    expect(isEmailActionVisible('reply', config)).toBe(true);
  });

  test('hiding one button does not affect others', () => {
    const config = getEmailActionConfig({ trash: false });
    expect(isEmailActionVisible('trash', config)).toBe(false);
    expect(isEmailActionVisible('reply', config)).toBe(true);
    expect(isEmailActionVisible('star', config)).toBe(true);
    expect(isEmailActionVisible('forward', config)).toBe(true);
  });

  test('user can hide all buttons simultaneously', () => {
    const allOff = {};
    EMAIL_ACTION_BUTTONS.forEach(b => { allOff[b.id] = false; });
    const allHidden = EMAIL_ACTION_BUTTONS.every(b => !isEmailActionVisible(b.id, allOff));
    expect(allHidden).toBe(true);
  });

  test('reset to defaults: all buttons visible again', () => {
    const allOff = {};
    EMAIL_ACTION_BUTTONS.forEach(b => { allOff[b.id] = false; });
    const reset = getEmailActionConfig(null); // null = use all defaults
    const allVisible = EMAIL_ACTION_BUTTONS.every(b => isEmailActionVisible(b.id, reset));
    expect(allVisible).toBe(true);
  });
});
