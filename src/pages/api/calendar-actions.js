/**
 * POST /api/calendar-actions
 * Create, update, delete, or query Google Calendar events.
 * Actions: create | update | delete | week | range (passed in request body).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
function parseCookies(req) {
  const c = {};
  (req.headers.cookie || '').split(';').forEach(s => {
    const [k, ...v] = s.trim().split('=');
    if (k) c[k] = v.join('=');
  });
  return c;
}

async function refreshToken(rt) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: rt,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  return r.json();
}

async function getToken(req, res) {
  const cookies = parseCookies(req);
  let token = cookies.ffc_at;
  const exp = parseInt(cookies.ffc_exp || '0');
  const rt = cookies.ffc_rt;
  if (!token) return null;
  if (Date.now() > exp && rt) {
    try {
      const n = await refreshToken(rt);
      if (n.access_token) {
        token = n.access_token;
        const o = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000';
        res.setHeader('Set-Cookie', [
          `ffc_at=${token}; ${o}`,
          `ffc_exp=${Date.now() + n.expires_in * 1000}; ${o}`,
        ]);
      } else { return null; }
    } catch (e) { return null; }
  }
  return token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const { action, eventId, event } = req.body;

  try {
    if (action === 'create') {
      // Create a new event
      const r = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST', headers: h,
          body: JSON.stringify({
            summary: event.title,
            description: event.description || '',
            location: event.location || '',
            start: { dateTime: event.start, timeZone: 'America/Denver' },
            end: { dateTime: event.end, timeZone: 'America/Denver' },
            attendees: (event.attendees || []).map(e => ({ email: e })),
          }),
        }
      );
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.json({ success: true, event: data });
    }

    if (action === 'update' && eventId) {
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PATCH', headers: h,
          body: JSON.stringify({
            ...(event.title && { summary: event.title }),
            ...(event.description !== undefined && { description: event.description }),
            ...(event.location !== undefined && { location: event.location }),
            ...(event.start && { start: { dateTime: event.start, timeZone: 'America/Denver' } }),
            ...(event.end && { end: { dateTime: event.end, timeZone: 'America/Denver' } }),
          }),
        }
      );
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.json({ success: true, event: data });
    }

    if (action === 'delete' && eventId) {
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        { method: 'DELETE', headers: h }
      );
      if (r.status === 204) return res.json({ success: true });
      const data = await r.json();
      return res.status(400).json({ error: data.error?.message || 'Failed to delete' });
    }

    if (action === 'rsvp' && eventId) {
      const { status } = req.body; // 'accepted' | 'declined' | 'tentative'
      if (!['accepted', 'declined', 'tentative'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      // Fetch the event to get current attendees list
      const evRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!evRes.ok) {
        console.error('calendar-actions:rsvp:fetchEvent', { eventId, status: evRes.status });
        throw new Error('Failed to fetch event for RSVP');
      }
      const evData = await evRes.json();
      const attendees = (evData.attendees || []).map(a =>
        a.self ? { ...a, responseStatus: status } : a
      );
      const patchRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
        { method: 'PATCH', headers: h, body: JSON.stringify({ attendees }) }
      );
      const patchData = await patchRes.json();
      if (patchData.error) {
        console.error('calendar-actions:rsvp:patch', { eventId, status, message: patchData.error.message });
        return res.status(400).json({ error: patchData.error.message });
      }
      return res.json({ success: true, selfRsvp: status });
    }

    // Helper function to format events
    const formatEvents = (items) => (items || []).map(e => ({
      id: e.id,
      title: e.summary || '(No title)',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location || '',
      description: e.description || '',
      attendees: (e.attendees || []).map(a => ({ email: a.email, name: a.displayName || '', self: a.self || false, status: a.responseStatus || '' })),
      hangoutLink: e.hangoutLink || '',
      htmlLink: e.htmlLink || '',
      recurringEventId: e.recurringEventId || null,
      selfRsvp: (e.attendees || []).find(a => a.self)?.responseStatus || null,
    }));

    // Get week's events (for proactive weekly view)
    if (action === 'week') {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfWeek.toISOString()}&timeMax=${endOfWeek.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await r.json();
      const events = formatEvents(data.items);
      return res.json({ success: true, events });
    }

    // Get events in a custom date range
    if (action === 'range') {
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate}&timeMax=${endDate}&singleEvents=true&orderBy=startTime&maxResults=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await r.json();
      const events = formatEvents(data.items);
      return res.json({ success: true, events });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
