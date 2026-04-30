/**
 * localStorage registry — centralized, validated, schema-aware storage.
 *
 * All localStorage access in the app should go through this module.
 * Unknown keys are rejected. Corrupt data returns the fallback and logs.
 * This prevents the class of bug where bad JSON silently breaks features.
 */

const SCHEMA = {
  ffc_tasks:              { type: 'array',  fallback: [] },
  ffc_tasks_backup:       { type: 'array',  fallback: [] },
  ffc_prepped:            { type: 'object', fallback: {} },
  ffc_stickies:           { type: 'array',  fallback: [] },
  ffc_custom_cats:        { type: 'array',  fallback: [] },
  ffc_team_order:         { type: 'array',  fallback: [] },
  ffc_drive_layout:       { type: 'string', fallback: 'list' },
  ffc_email_density:      { type: 'string', fallback: 'comfortable' },
  ffc_user_settings:      { type: 'object', fallback: null },
  ffc_dark_mode:          { type: 'string', fallback: 'false' },
  ffc_bucket_labels:      { type: 'object', fallback: {} },
  ffc_bucket_descriptions:{ type: 'object', fallback: {} },
  ffc_learned_buckets:    { type: 'object', fallback: {} },
  ffc_action_history:     { type: 'object', fallback: {} },
  ffc_follow_ups:         { type: 'array',  fallback: [] },
  ffc_dashboard_layout:   { type: 'object', fallback: null },
  ffc_todo_emails:        { type: 'array',  fallback: [] },
  ffc_grants:             { type: 'array',  fallback: [] },
  ffc_team_docs:          { type: 'object', fallback: {} },
  ffc_scheduled_emails:   { type: 'array',  fallback: [] },
  ffc_agenda_items:       { type: 'array',  fallback: [] },
  ffc_email_action_config:{ type: 'object', fallback: null },
  ffc_prep_opened:        { type: 'object', fallback: {} },
  ffc_dismissed_payroll:  { type: 'array',  fallback: [] },
  ffc_dismissed_finance:  { type: 'array',  fallback: [] },
  ffc_fwd_suggest:        { type: 'object', fallback: {} },
};

/**
 * Read a value from localStorage with validation.
 * Returns the parsed value, or the schema fallback if corrupt/missing.
 */
function readStorage(key) {
  const schema = SCHEMA[key];
  if (!schema) {
    console.warn('storage:unknownKey', { key });
    return undefined;
  }

  if (typeof window === 'undefined') return schema.fallback;

  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return schema.fallback;

    if (schema.type === 'string') return raw;

    const parsed = JSON.parse(raw);

    // Type validation
    if (schema.type === 'array' && !Array.isArray(parsed)) {
      console.warn('storage:typeMismatch', { key, expected: 'array', got: typeof parsed });
      return schema.fallback;
    }
    if (schema.type === 'object' && (typeof parsed !== 'object' || Array.isArray(parsed))) {
      if (parsed !== null) {
        console.warn('storage:typeMismatch', { key, expected: 'object', got: typeof parsed });
        return schema.fallback;
      }
    }

    return parsed;
  } catch (e) {
    console.warn('storage:corrupt', { key, message: e.message });
    return schema.fallback;
  }
}

/**
 * Write a value to localStorage with validation.
 * Refuses unknown keys. Logs on write failure.
 */
function writeStorage(key, value) {
  const schema = SCHEMA[key];
  if (!schema) {
    console.warn('storage:unknownKey', { key, action: 'write' });
    return false;
  }

  if (typeof window === 'undefined') return false;

  try {
    if (schema.type === 'string') {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
    return true;
  } catch (e) {
    console.error('storage:writeFailed', { key, message: e.message });
    return false;
  }
}

/**
 * Remove a key from localStorage.
 */
function removeStorage(key) {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch {}
}

/**
 * Get the schema definition for a key (for documentation/debugging).
 */
function getSchema(key) {
  return SCHEMA[key] || null;
}

/**
 * List all registered storage keys.
 */
function listStorageKeys() {
  return Object.keys(SCHEMA);
}

module.exports = { readStorage, writeStorage, removeStorage, getSchema, listStorageKeys, SCHEMA };
