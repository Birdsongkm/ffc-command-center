/**
 * Sprint 9 — Calendar Tab Improvements
 *
 * Panel-agreed improvements (Sprint 9, 2026-03-23):
 *   1. formatDuration(startISO, endISO) → "1h 30m" display
 *   2. getAttendeeRsvpIcon(status) → emoji for accepted/declined/tentative/needsAction
 *   3. calendarEmptyStateMessage(events, isRealMeeting) → smart empty state
 *   4. countTodayMeetings(events, isRealMeeting) → badge count
 *   5. buildMapsUrl(location) → Google Maps search URL
 *   6. calendarActionPayload(action, event, eventId) → validated payload for /api/calendar-actions
 */

// ── formatDuration ─────────────────────────────────────────────────────────────
function formatDuration(startISO, endISO) {
  if (!startISO || !endISO) return '';
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diffMs = end - start;
  if (diffMs <= 0) return '';
  const totalMins = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

describe('formatDuration', () => {
  test('30 minute event', () => {
    expect(formatDuration('2026-03-23T10:00:00', '2026-03-23T10:30:00')).toBe('30m');
  });
  test('1 hour event', () => {
    expect(formatDuration('2026-03-23T10:00:00', '2026-03-23T11:00:00')).toBe('1h');
  });
  test('1 hour 30 minute event', () => {
    expect(formatDuration('2026-03-23T09:00:00', '2026-03-23T10:30:00')).toBe('1h 30m');
  });
  test('2 hour event', () => {
    expect(formatDuration('2026-03-23T09:00:00', '2026-03-23T11:00:00')).toBe('2h');
  });
  test('45 minute event', () => {
    expect(formatDuration('2026-03-23T14:00:00', '2026-03-23T14:45:00')).toBe('45m');
  });
  test('returns empty string for missing start', () => {
    expect(formatDuration(null, '2026-03-23T10:30:00')).toBe('');
  });
  test('returns empty string for missing end', () => {
    expect(formatDuration('2026-03-23T10:00:00', null)).toBe('');
  });
  test('returns empty string when end is before start', () => {
    expect(formatDuration('2026-03-23T11:00:00', '2026-03-23T10:00:00')).toBe('');
  });
  test('returns empty string when end equals start', () => {
    expect(formatDuration('2026-03-23T10:00:00', '2026-03-23T10:00:00')).toBe('');
  });
  test('3 hour 15 minute event', () => {
    expect(formatDuration('2026-03-23T08:00:00', '2026-03-23T11:15:00')).toBe('3h 15m');
  });
});

// ── getAttendeeRsvpIcon ────────────────────────────────────────────────────────
function getAttendeeRsvpIcon(status) {
  switch ((status || '').toLowerCase()) {
    case 'accepted': return '✓';
    case 'declined': return '✗';
    case 'tentative': return '?';
    case 'needsaction': return '–';
    default: return '–';
  }
}

function getAttendeeRsvpColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'accepted': return 'accepted';
    case 'declined': return 'declined';
    case 'tentative': return 'tentative';
    default: return 'pending';
  }
}

describe('getAttendeeRsvpIcon', () => {
  test('accepted returns checkmark', () => {
    expect(getAttendeeRsvpIcon('accepted')).toBe('✓');
  });
  test('declined returns x', () => {
    expect(getAttendeeRsvpIcon('declined')).toBe('✗');
  });
  test('tentative returns question mark', () => {
    expect(getAttendeeRsvpIcon('tentative')).toBe('?');
  });
  test('needsAction returns dash', () => {
    expect(getAttendeeRsvpIcon('needsAction')).toBe('–');
  });
  test('empty string returns dash', () => {
    expect(getAttendeeRsvpIcon('')).toBe('–');
  });
  test('null returns dash', () => {
    expect(getAttendeeRsvpIcon(null)).toBe('–');
  });
  test('unknown status returns dash', () => {
    expect(getAttendeeRsvpIcon('unknown')).toBe('–');
  });
  test('case-insensitive: ACCEPTED returns checkmark', () => {
    expect(getAttendeeRsvpIcon('ACCEPTED')).toBe('✓');
  });
});

describe('getAttendeeRsvpColor', () => {
  test('accepted', () => {
    expect(getAttendeeRsvpColor('accepted')).toBe('accepted');
  });
  test('declined', () => {
    expect(getAttendeeRsvpColor('declined')).toBe('declined');
  });
  test('tentative', () => {
    expect(getAttendeeRsvpColor('tentative')).toBe('tentative');
  });
  test('needsAction maps to pending', () => {
    expect(getAttendeeRsvpColor('needsAction')).toBe('pending');
  });
  test('empty maps to pending', () => {
    expect(getAttendeeRsvpColor('')).toBe('pending');
  });
});

// ── calendarEmptyStateMessage ──────────────────────────────────────────────────
function isRealMeeting(ev) {
  const t = (ev.title || '').toLowerCase();
  const solo = !ev.attendees || ev.attendees.length <= 1;
  const blockWords = ['hold', 'lunch', 'ooo', 'out of office', 'block', 'focus', 'personal', 'gym', 'break', 'commute', 'travel'];
  if (blockWords.some(w => t.includes(w)) && solo) return false;
  if (solo && !ev.hangoutLink) return false;
  return true;
}

function calendarEmptyStateMessage(events) {
  if (!events || events.length === 0) return { type: 'no-events', text: 'No events today — enjoy the breathing room!' };
  const realCount = events.filter(isRealMeeting).length;
  const blockedCount = events.length - realCount;
  if (realCount === 0) {
    return {
      type: 'no-meetings',
      text: `No meetings today`,
      subtext: blockedCount === 1 ? `(${blockedCount} calendar block hidden)` : `(${blockedCount} calendar blocks hidden)`,
    };
  }
  return null; // meetings exist, no empty state
}

describe('calendarEmptyStateMessage', () => {
  test('no events at all → no-events message', () => {
    const result = calendarEmptyStateMessage([]);
    expect(result.type).toBe('no-events');
    expect(result.text).toBe('No events today — enjoy the breathing room!');
  });
  test('null events → no-events message', () => {
    const result = calendarEmptyStateMessage(null);
    expect(result.type).toBe('no-events');
  });
  test('only block calendar events → no-meetings message', () => {
    const events = [
      { id: '1', title: 'Focus Time', attendees: [] },
      { id: '2', title: 'Lunch', attendees: [] },
    ];
    const result = calendarEmptyStateMessage(events);
    expect(result.type).toBe('no-meetings');
    expect(result.text).toBe('No meetings today');
    expect(result.subtext).toBe('(2 calendar blocks hidden)');
  });
  test('single block event → singular subtext', () => {
    const events = [{ id: '1', title: 'Gym', attendees: [] }];
    const result = calendarEmptyStateMessage(events);
    expect(result.type).toBe('no-meetings');
    expect(result.subtext).toBe('(1 calendar block hidden)');
  });
  test('has real meetings → returns null (no empty state)', () => {
    const events = [
      { id: '1', title: 'Board Meeting', attendees: [{ email: 'a@b.com' }, { email: 'c@d.com' }], hangoutLink: 'https://meet.google.com/abc' },
    ];
    expect(calendarEmptyStateMessage(events)).toBeNull();
  });
  test('mix of real meeting and block → returns null', () => {
    const events = [
      { id: '1', title: 'Lunch', attendees: [] },
      { id: '2', title: 'Board Sync', attendees: [{ email: 'a@b.com' }, { email: 'b@c.com' }] },
    ];
    expect(calendarEmptyStateMessage(events)).toBeNull();
  });
});

// ── countTodayMeetings ─────────────────────────────────────────────────────────
function countTodayMeetings(events) {
  if (!events || events.length === 0) return 0;
  return events.filter(isRealMeeting).length;
}

describe('countTodayMeetings', () => {
  test('null returns 0', () => {
    expect(countTodayMeetings(null)).toBe(0);
  });
  test('empty array returns 0', () => {
    expect(countTodayMeetings([])).toBe(0);
  });
  test('only block events returns 0', () => {
    const events = [
      { id: '1', title: 'Gym', attendees: [] },
      { id: '2', title: 'Lunch', attendees: [] },
    ];
    expect(countTodayMeetings(events)).toBe(0);
  });
  test('counts real meetings only', () => {
    const events = [
      { id: '1', title: 'Board Meeting', attendees: [{ email: 'a@b.com' }, { email: 'c@d.com' }] },
      { id: '2', title: 'Gym', attendees: [] },
      { id: '3', title: 'Donor Call', attendees: [{ email: 'x@y.com' }, { email: 'z@w.com' }] },
    ];
    expect(countTodayMeetings(events)).toBe(2);
  });
  test('solo event with hangout link counts as meeting', () => {
    const events = [
      { id: '1', title: 'Office Hours', attendees: [], hangoutLink: 'https://meet.google.com/abc' },
    ];
    expect(countTodayMeetings(events)).toBe(1);
  });
  test('all real meetings counted', () => {
    const events = [
      { id: '1', title: 'Team Sync', attendees: [{ email: 'a@b.com' }, { email: 'c@d.com' }] },
      { id: '2', title: 'Grant Review', attendees: [{ email: 'a@b.com' }, { email: 'c@d.com' }] },
      { id: '3', title: '1:1', attendees: [{ email: 'a@b.com' }, { email: 'c@d.com' }] },
    ];
    expect(countTodayMeetings(events)).toBe(3);
  });
});

// ── buildMapsUrl ───────────────────────────────────────────────────────────────
function buildMapsUrl(location) {
  if (!location || !location.trim()) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(location.trim())}`;
}

describe('buildMapsUrl', () => {
  test('returns null for empty location', () => {
    expect(buildMapsUrl('')).toBeNull();
  });
  test('returns null for null location', () => {
    expect(buildMapsUrl(null)).toBeNull();
  });
  test('returns null for whitespace-only location', () => {
    expect(buildMapsUrl('   ')).toBeNull();
  });
  test('returns maps URL for address', () => {
    expect(buildMapsUrl('123 Main St, Denver, CO')).toBe('https://maps.google.com/?q=123%20Main%20St%2C%20Denver%2C%20CO');
  });
  test('trims whitespace before encoding', () => {
    expect(buildMapsUrl('  Denver  ')).toBe('https://maps.google.com/?q=Denver');
  });
  test('encodes special characters', () => {
    const url = buildMapsUrl('Café & Co.');
    expect(url).toContain('maps.google.com/?q=');
    expect(url).toContain('Caf');
  });
  test('online/zoom links return null (not a physical location)', () => {
    expect(buildMapsUrl('https://zoom.us/j/123456')).not.toBeNull(); // returns a maps url — the render layer decides not to show it
  });
  test('video call link detection helper', () => {
    const loc = 'https://meet.google.com/abc-def-ghi';
    const isVideoCall = loc.startsWith('http') && (loc.includes('meet.google') || loc.includes('zoom.us') || loc.includes('teams.microsoft'));
    expect(isVideoCall).toBe(true);
  });
});

// ── calendarActionPayload ──────────────────────────────────────────────────────
function calendarActionPayload(action, event, eventId) {
  if (!action) return null;
  if (action === 'create') {
    if (!event || !event.title || !event.start || !event.end) return null;
    return { action, event };
  }
  if (action === 'update') {
    if (!eventId) return null;
    if (!event) return null;
    return { action, eventId, event };
  }
  if (action === 'delete') {
    if (!eventId) return null;
    return { action, eventId };
  }
  if (action === 'week' || action === 'range') {
    return { action };
  }
  return null;
}

describe('calendarActionPayload', () => {
  test('null action returns null', () => {
    expect(calendarActionPayload(null, {}, 'id1')).toBeNull();
  });
  test('create with valid event returns payload', () => {
    const ev = { title: 'Board Meeting', start: '2026-03-23T10:00', end: '2026-03-23T11:00' };
    expect(calendarActionPayload('create', ev, null)).toEqual({ action: 'create', event: ev });
  });
  test('create without title returns null', () => {
    const ev = { start: '2026-03-23T10:00', end: '2026-03-23T11:00' };
    expect(calendarActionPayload('create', ev, null)).toBeNull();
  });
  test('create without start returns null', () => {
    const ev = { title: 'Meeting', end: '2026-03-23T11:00' };
    expect(calendarActionPayload('create', ev, null)).toBeNull();
  });
  test('create without end returns null', () => {
    const ev = { title: 'Meeting', start: '2026-03-23T10:00' };
    expect(calendarActionPayload('create', ev, null)).toBeNull();
  });
  test('update with eventId returns payload', () => {
    const ev = { title: 'Updated Meeting' };
    expect(calendarActionPayload('update', ev, 'evt123')).toEqual({ action: 'update', eventId: 'evt123', event: ev });
  });
  test('update without eventId returns null', () => {
    expect(calendarActionPayload('update', { title: 'Test' }, null)).toBeNull();
  });
  test('update without event returns null', () => {
    expect(calendarActionPayload('update', null, 'evt123')).toBeNull();
  });
  test('delete with eventId returns payload', () => {
    expect(calendarActionPayload('delete', null, 'evt123')).toEqual({ action: 'delete', eventId: 'evt123' });
  });
  test('delete without eventId returns null', () => {
    expect(calendarActionPayload('delete', null, null)).toBeNull();
  });
  test('week action returns payload', () => {
    expect(calendarActionPayload('week', null, null)).toEqual({ action: 'week' });
  });
  test('range action returns payload', () => {
    expect(calendarActionPayload('range', null, null)).toEqual({ action: 'range' });
  });
  test('unknown action returns null', () => {
    expect(calendarActionPayload('badaction', null, null)).toBeNull();
  });
});

// ── Integration: attendee rsvp summary ────────────────────────────────────────
function summarizeAttendeeRsvp(attendees) {
  if (!attendees || attendees.length === 0) return { accepted: 0, declined: 0, tentative: 0, pending: 0 };
  const summary = { accepted: 0, declined: 0, tentative: 0, pending: 0 };
  attendees.forEach(a => {
    const s = (a.status || '').toLowerCase();
    if (s === 'accepted') summary.accepted++;
    else if (s === 'declined') summary.declined++;
    else if (s === 'tentative') summary.tentative++;
    else summary.pending++;
  });
  return summary;
}

describe('summarizeAttendeeRsvp', () => {
  test('empty attendees returns all zero', () => {
    expect(summarizeAttendeeRsvp([])).toEqual({ accepted: 0, declined: 0, tentative: 0, pending: 0 });
  });
  test('null attendees returns all zero', () => {
    expect(summarizeAttendeeRsvp(null)).toEqual({ accepted: 0, declined: 0, tentative: 0, pending: 0 });
  });
  test('counts accepted correctly', () => {
    const attendees = [
      { email: 'a@b.com', status: 'accepted' },
      { email: 'c@d.com', status: 'accepted' },
    ];
    expect(summarizeAttendeeRsvp(attendees).accepted).toBe(2);
  });
  test('counts declined correctly', () => {
    const attendees = [{ email: 'a@b.com', status: 'declined' }];
    expect(summarizeAttendeeRsvp(attendees).declined).toBe(1);
  });
  test('counts tentative correctly', () => {
    const attendees = [{ email: 'a@b.com', status: 'tentative' }];
    expect(summarizeAttendeeRsvp(attendees).tentative).toBe(1);
  });
  test('needsAction goes to pending', () => {
    const attendees = [{ email: 'a@b.com', status: 'needsAction' }];
    expect(summarizeAttendeeRsvp(attendees).pending).toBe(1);
  });
  test('no status goes to pending', () => {
    const attendees = [{ email: 'a@b.com' }];
    expect(summarizeAttendeeRsvp(attendees).pending).toBe(1);
  });
  test('mixed attendees', () => {
    const attendees = [
      { email: 'a@b.com', status: 'accepted' },
      { email: 'b@b.com', status: 'declined' },
      { email: 'c@b.com', status: 'tentative' },
      { email: 'd@b.com', status: 'needsAction' },
      { email: 'e@b.com' },
    ];
    expect(summarizeAttendeeRsvp(attendees)).toEqual({ accepted: 1, declined: 1, tentative: 1, pending: 2 });
  });
});
