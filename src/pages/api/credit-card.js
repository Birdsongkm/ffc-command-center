/**
 * GET /api/credit-card
 * Supports credit card allocation workflows via Google Sheets and Calendar.
 * Actions (query param): checkSheet | checkTeamCompletion | getCalendarForMonth | draftNudge.
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

async function checkSheet(token, spreadsheetId, range) {
  try {
    const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) return { status: 'error', message: 'Failed to read sheet' };
    const data = await resp.json();
    return {
      status: 'success',
      values: data.values || [],
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function checkTeamCompletion(token, spreadsheetId, sheetName, staffInitials) {
  try {
    const completed = [];
    const pending = [];

    for (const initials of staffInitials) {
      const range = `'${sheetName}'!A:Z`;
      const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const values = data.values || [];

      let found = false;
      for (let row of values) {
        const rowText = row.join(' ').toLowerCase();
        if (rowText.includes(initials.toLowerCase())) {
          const allocationCells = row.slice(1).filter(cell => cell && cell.trim().length > 0);
          if (allocationCells.length > 0) {
            completed.push(initials);
            found = true;
            break;
          }
        }
      }
      if (!found) {
        pending.push(initials);
      }
    }

    return { completed, pending };
  } catch (e) {
    return { error: e.message };
  }
}

async function getCalendarForMonth(token, year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const timeMin = startDate.toISOString();
    const timeMax = new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) return { status: 'error', message: 'Failed to fetch calendar' };
    const data = await resp.json();

    const events = (data.items || []).map(item => ({
      title: item.summary || '(no title)',
      date: item.start.dateTime || item.start.date || 'Unknown',
      location: item.location || '',
      attendees: (item.attendees || []).map(a => a.email),
    }));

    return { status: 'success', events };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function buildRawEmail({ to, subject, body }) {
  const lines = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', 'MIME-Version: 1.0', '', body];
  return Buffer.from(lines.join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function draftNudge(token, to, staffName) {
  try {
    const subject = `Credit Card Allocation Reminder`;
    const body = `Hey ${staffName}, no rush but just a heads up — I'm waiting on your section of the credit card allocation before I can do my review. When you're done, can you ping me so I can jump in? Thanks!`;
    const raw = buildRawEmail({ to, subject, body });
    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { raw } }),
    });
    if (!resp.ok) return { error: 'Failed to create draft' };
    const data = await resp.json();
    return { draftId: data.id, success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action, spreadsheetId, range, sheetName, staffInitials, year, month, to, staffName } = req.query;

  try {
    switch (action) {
      case 'checkSheet':
        if (!spreadsheetId || !range) {
          return res.status(400).json({ error: 'spreadsheetId and range required' });
        }
        return res.status(200).json(await checkSheet(token, spreadsheetId, range));

      case 'checkTeamCompletion':
        if (!spreadsheetId || !sheetName || !staffInitials) {
          return res.status(400).json({ error: 'spreadsheetId, sheetName, staffInitials required' });
        }
        const initials = Array.isArray(staffInitials) ? staffInitials : [staffInitials];
        return res.status(200).json(await checkTeamCompletion(token, spreadsheetId, sheetName, initials));

      case 'getCalendarForMonth':
        if (!year || !month) {
          return res.status(400).json({ error: 'year and month required' });
        }
        return res.status(200).json(await getCalendarForMonth(token, parseInt(year), parseInt(month)));

      case 'draftNudge':
        if (!to || !staffName) {
          return res.status(400).json({ error: 'to and staffName required' });
        }
        return res.status(200).json(await draftNudge(token, to, staffName));

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
