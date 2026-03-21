/**
 * GET /api/finance-review
 * Supports finance review workflows via Gmail and Google Sheets.
 * Actions (query param): checkDebbie | checkBudgetSheet | draftNudge | draftCommitteeReminder.
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

async function checkDebbie(token) {
  try {
    const query = encodeURIComponent('from:(debbie OR nash OR accounting@) AND (subject:(financials OR details OR review OR statement) OR financials OR details OR review OR statement)');
    const resp = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=5`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) return { found: false, error: 'Failed to search Gmail' };
    const data = await resp.json();
    if (!data.messages || data.messages.length === 0) return { found: false };

    const msgId = data.messages[0].id;
    const msgResp = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msgId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const msg = await msgResp.json();
    const headers = msg.payload.headers;
    return {
      found: true,
      from: headers.find(h => h.name === 'From')?.value || 'Unknown',
      subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
      date: headers.find(h => h.name === 'Date')?.value || 'Unknown',
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function checkBudgetSheet(token, spreadsheetId, range) {
  try {
    const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) return { status: 'error', message: 'Failed to read sheet' };
    const data = await resp.json();
    const values = data.values || [];
    if (values.length === 0) return { status: 'empty' };

    const headerRow = values[0];
    const hasBudget = headerRow.some(cell => cell && cell.toLowerCase().includes('budget'));
    const hasActuals = headerRow.some(cell => cell && cell.toLowerCase().includes('actuals'));

    return {
      status: 'found',
      hasBudget,
      hasActuals,
      headerRow,
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function buildRawEmail({ to, subject, body }) {
  const lines = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', 'MIME-Version: 1.0', '', body];
  return Buffer.from(lines.join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function draftNudge(token, to, subject, body) {
  try {
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

async function draftCommitteeReminder(token, to, agendaLink, meetingDate) {
  try {
    const subject = `Finance Committee Meeting Reminder - ${meetingDate}`;
    const body = `Hi team,\n\nJust a heads up about our upcoming finance committee meeting on ${meetingDate}.\n\nAgenda: ${agendaLink}\n\nLooking forward to seeing you there!\n\nBest regards`;
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

  const { action, spreadsheetId, range, to, subject, body, agendaLink, meetingDate } = req.query;

  try {
    switch (action) {
      case 'checkDebbie':
        return res.status(200).json(await checkDebbie(token));

      case 'checkBudgetSheet':
        if (!spreadsheetId || !range) {
          return res.status(400).json({ error: 'spreadsheetId and range required' });
        }
        return res.status(200).json(await checkBudgetSheet(token, spreadsheetId, range));

      case 'draftNudge':
        if (!to || !subject || !body) {
          return res.status(400).json({ error: 'to, subject, body required' });
        }
        return res.status(200).json(await draftNudge(token, to, subject, body));

      case 'draftCommitteeReminder':
        if (!to || !agendaLink || !meetingDate) {
          return res.status(400).json({ error: 'to, agendaLink, meetingDate required' });
        }
        return res.status(200).json(await draftCommitteeReminder(token, to, agendaLink, meetingDate));

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
