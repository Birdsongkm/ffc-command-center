/**
 * POST /api/person-research
 * Aggregates research for an external meeting attendee from Gmail, Drive, and Calendar.
 * Body: { email, name (optional), eventId (optional) }
 * Returns: { identity, whyThisMeeting, lastContact, orgOverview, relationship, connectionPoints, sourceStatus, stage }
 *
 * v1: Gmail/Drive/Calendar only — no external web sources.
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

const GENERIC_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com'];

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

// Search Gmail for threads with a specific person
async function searchGmailThreads(token, email, maxResults = 20) {
  const q = encodeURIComponent(`from:${email} OR to:${email}`);
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${maxResults}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error('person-research:searchGmail', { email, status: r.status, message: err.error?.message });
    return { status: 'failed', error: err.error?.message || r.status, threads: [] };
  }
  const data = await r.json();
  const messages = data.messages || [];

  // Fetch metadata for each message (batched)
  const threads = [];
  for (const msg of messages.slice(0, 15)) {
    try {
      const mRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!mRes.ok) continue;
      const mData = await mRes.json();
      const getH = name => (mData.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      const fromRaw = getH('From');
      const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
      threads.push({
        id: msg.id,
        subject: getH('Subject'),
        from: fromRaw,
        fromName: fromMatch ? fromMatch[1].replace(/["']/g, '').trim() : null,
        fromEmail: fromMatch ? fromMatch[2].toLowerCase() : fromRaw.toLowerCase(),
        to: getH('To'),
        cc: getH('Cc'),
        date: getH('Date'),
        snippet: mData.snippet || '',
      });
    } catch (e) {
      console.error('person-research:fetchMsg', { msgId: msg.id, message: e.message });
    }
  }

  return { status: threads.length > 0 ? 'loaded' : 'loaded', threads };
}

// Search Drive for shared docs with a specific person
async function searchDriveCollaborators(token, email) {
  // Search for files shared with this person
  const q = encodeURIComponent(`'${email}' in readers or '${email}' in writers`);
  const fields = 'files(id,name,mimeType,modifiedTime,webViewLink)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime desc&pageSize=10`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error('person-research:searchDrive', { email, status: r.status, message: err.error?.message });
    return { status: 'failed', error: err.error?.message || r.status, files: [] };
  }
  const data = await r.json();
  return { status: 'loaded', files: data.files || [] };
}

// Find donation-related emails (Classy notifications, etc.)
async function searchDonationSignals(token, email) {
  const q = encodeURIComponent(`(from:classy.org OR subject:donation OR subject:gift OR subject:contribution) (${email})`);
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=10`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return [];
  const data = await r.json();
  const messages = data.messages || [];

  const signals = [];
  for (const msg of messages.slice(0, 5)) {
    try {
      const mRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!mRes.ok) continue;
      const mData = await mRes.json();
      const getH = name => (mData.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      signals.push({ id: msg.id, subject: getH('Subject'), date: getH('Date'), snippet: mData.snippet || '' });
    } catch (e) {
      // Skip failed fetches
    }
  }
  return signals;
}

// Get calendar event details
async function getCalendarEvent(token, eventId) {
  if (!eventId) return null;
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return r.json();
}

// Find mutual contacts (people who appear in CC with both Kayla and this person)
function extractMutualContacts(threads, targetEmail) {
  const contactCounts = {};
  const normalized = normalizeEmail(targetEmail);
  for (const t of threads) {
    const allAddrs = [t.to, t.cc].filter(Boolean).join(', ')
      .split(',').map(s => s.trim().match(/<(.+?)>/)?.[1] || s.trim())
      .map(normalizeEmail)
      .filter(e => e && e !== normalized && !e.endsWith('@freshfoodconnect.org'));
    for (const addr of allAddrs) {
      contactCounts[addr] = (contactCounts[addr] || 0) + 1;
    }
  }
  return Object.entries(contactCounts)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([email, count]) => ({ email, threadCount: count }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { email, name, eventId } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing required field: email' });

  const normalized = normalizeEmail(email);
  const sourceStatus = { gmail: 'loading', drive: 'loading', calendar: 'loading' };

  try {
    // Parallel data fetches
    const [gmailResult, driveResult, donationSignals, calEvent] = await Promise.all([
      searchGmailThreads(token, normalized).catch(e => ({ status: 'failed', error: e.message, threads: [] })),
      searchDriveCollaborators(token, normalized).catch(e => ({ status: 'failed', error: e.message, files: [] })),
      searchDonationSignals(token, normalized).catch(() => []),
      getCalendarEvent(token, eventId).catch(() => null),
    ]);

    sourceStatus.gmail = gmailResult.status;
    sourceStatus.drive = driveResult.status;
    sourceStatus.calendar = calEvent ? 'loaded' : (eventId ? 'failed' : 'skipped');

    const threads = gmailResult.threads;
    const sharedDocs = driveResult.files;

    // Identity resolution
    const trail = [];
    let resolvedName = name || null;
    const domain = normalized.split('@')[1] || '';
    let org = null;

    trail.push(`${threads.length} Gmail threads found`);

    if (!resolvedName && threads.length > 0) {
      const fromThread = threads.find(t => normalizeEmail(t.fromEmail) === normalized);
      if (fromThread?.fromName) {
        resolvedName = fromThread.fromName;
        trail.push(`Name from Gmail: "${resolvedName}"`);
      }
    }

    if (domain && !GENERIC_DOMAINS.includes(domain)) {
      org = domain.replace(/\.(com|org|net|io|co)$/, '');
      trail.push(`Org inferred from domain: ${domain}`);
    }

    let confidence = 'low';
    if (threads.length >= 3 && resolvedName) confidence = 'high';
    else if (threads.length >= 1 || resolvedName) confidence = 'med';
    trail.push(`Confidence: ${confidence}`);

    const identity = { email: normalized, name: resolvedName, org, confidence, trail };

    // Stage inference
    const hasDonations = donationSignals.length > 0;
    let stage = 'unknown';
    if (hasDonations && threads.length >= 5) stage = 'active-major';
    else if (hasDonations) stage = 'active';
    else if (threads.length >= 3) stage = 'known';
    else if (threads.length >= 1) stage = 'new';

    // Why this meeting
    let whyThisMeeting = null;
    if (calEvent?.description) {
      whyThisMeeting = { text: calEvent.description.slice(0, 200), source: 'calendar-description', citation: `cal:${calEvent.id}` };
    } else if (threads.length > 0) {
      const sorted = [...threads].sort((a, b) => new Date(b.date) - new Date(a.date));
      whyThisMeeting = { text: `Booked from thread: "${sorted[0].subject}"`, source: 'gmail-thread', citation: `msg:${sorted[0].id}` };
    }

    // Last contact
    let lastContact = null;
    if (threads.length > 0) {
      const sorted = [...threads].sort((a, b) => new Date(b.date) - new Date(a.date));
      const last = sorted[0];
      lastContact = { text: `Last emailed on ${last.date} re: "${last.subject}"`, date: last.date, citation: `msg:${last.id}` };
    }

    // Org overview
    let orgOverview = null;
    if (org) {
      orgOverview = { text: `Organization: ${org} (inferred from email domain ${domain})`, citation: `email:${normalized}` };
    }

    // Relationship with FFC
    const relationship = {
      donations: donationSignals.map(s => ({ subject: s.subject, date: s.date, citation: `msg:${s.id}` })),
      threadCount: threads.length,
      stage,
    };

    // Connection points
    const mutualContacts = extractMutualContacts(threads, normalized);
    const connectionPoints = {
      sharedDocs: sharedDocs.map(f => ({ id: f.id, name: f.name, url: f.webViewLink, citation: `drive:${f.id}` })),
      mutualContacts,
      sharedThreadSubjects: threads.slice(0, 5).map(t => ({ subject: t.subject, date: t.date, citation: `msg:${t.id}` })),
    };

    // Sparse data check
    const isSparse = !lastContact && sharedDocs.length === 0 && donationSignals.length === 0;

    const complete = [sourceStatus.gmail, sourceStatus.drive, sourceStatus.calendar].filter(s => s === 'loaded' || s === 'partial').length;
    const sourceSummary = `${complete} of 3 sources complete`;

    return res.status(200).json({
      identity,
      whyThisMeeting,
      lastContact,
      orgOverview,
      relationship,
      connectionPoints,
      sourceStatus,
      sourceSummary,
      stage,
      isSparse,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('person-research:handler', { email: normalized, message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
