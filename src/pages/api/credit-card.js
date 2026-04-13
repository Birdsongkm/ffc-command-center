/**
 * GET /api/credit-card
 * Supports credit card allocation workflows via Google Sheets and Gmail.
 * Actions (query param): checkSheet | checkTeamCompletion | findAllocationEmail | draftNudge | draftReplyToDebbie.
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
    if (!resp.ok) {
      console.error('credit-card:checkSheet', { spreadsheetId, range, status: resp.status });
      return { status: 'error', message: 'Failed to read sheet' };
    }
    const data = await resp.json();
    return { status: 'success', values: data.values || [] };
  } catch (e) {
    console.error('credit-card:checkSheet', { spreadsheetId, range, message: e.message });
    return { status: 'error', message: e.message };
  }
}

async function checkTeamCompletion(token, spreadsheetId, sheetName, staffInitials) {
  try {
    const range = `'${sheetName}'!A:Z`;
    const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) {
      console.error('credit-card:checkTeamCompletion', { spreadsheetId, sheetName, status: resp.status });
      return { error: 'Failed to read sheet' };
    }
    const data = await resp.json();
    const values = data.values || [];

    const completed = [];
    const pending = [];

    for (const initials of staffInitials) {
      let found = false;
      for (let row of values) {
        // Only check column A for initials/name to avoid false matches in data cells
        const firstCell = (row[0] || '').toLowerCase();
        if (firstCell.includes(initials.toLowerCase())) {
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
    console.error('credit-card:checkTeamCompletion', { spreadsheetId, sheetName, message: e.message });
    return { error: e.message };
  }
}

async function findAllocationEmail(token) {
  try {
    const q = 'from:dnatsi.com subject:("credit card" OR "cc transactions" OR "transactions ready" OR allocations OR allocation) newer_than:30d';
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!searchRes.ok) {
      console.error('credit-card:findAllocationEmail', { status: searchRes.status });
      return { found: false };
    }
    const searchData = await searchRes.json();
    const msgId = searchData.messages?.[0]?.id;
    if (!msgId) return { found: false };

    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!msgRes.ok) {
      console.error('credit-card:findAllocationEmail', { msgId, status: msgRes.status });
      return { found: false };
    }
    const msg = await msgRes.json();
    const getH = name => (msg.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract spreadsheet link from body
    let bodyText = '';
    function extractText(part) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText += Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.mimeType === 'text/html' && part.body?.data && !bodyText) {
        bodyText += Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) part.parts.forEach(extractText);
    }
    extractText(msg.payload);

    // Find Google Sheets URLs
    const sheetMatch = bodyText.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const spreadsheetUrl = sheetMatch ? `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}` : null;
    const spreadsheetId = sheetMatch ? sheetMatch[1] : null;

    return {
      found: true,
      messageId: msgId,
      threadId: msg.threadId,
      subject: getH('Subject'),
      from: getH('From'),
      to: getH('To'),
      cc: getH('Cc'),
      date: getH('Date'),
      spreadsheetUrl,
      spreadsheetId,
      snippet: msg.snippet || '',
    };
  } catch (e) {
    console.error('credit-card:findAllocationEmail', { message: e.message });
    return { found: false, error: e.message };
  }
}

function buildRawEmail({ to, cc, subject, body, threadId, inReplyTo, references }) {
  const lines = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
    references ? `References: ${references}` : null,
    '',
    body,
  ].filter(l => l !== null);
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
    if (!resp.ok) {
      console.error('credit-card:draftNudge', { to, staffName, status: resp.status });
      return { error: 'Failed to create draft' };
    }
    const data = await resp.json();
    return { draftId: data.id, success: true };
  } catch (e) {
    console.error('credit-card:draftNudge', { to, staffName, message: e.message });
    return { error: e.message };
  }
}

async function draftReplyToDebbie(token, { threadId, messageId, to, cc, subject, month }) {
  try {
    // Fetch original message for In-Reply-To header
    let inReplyTo = '';
    let references = '';
    if (messageId) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Message-ID`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (msgRes.ok) {
        const msg = await msgRes.json();
        const origMsgId = (msg.payload?.headers || []).find(h => h.name.toLowerCase() === 'message-id')?.value || '';
        inReplyTo = origMsgId;
        references = origMsgId;
      }
    }

    const replySubject = subject?.startsWith('Re:') ? subject : `Re: ${subject || 'Credit Card Allocations'}`;
    const body = `Hey Debbie, the credit card allocations are all done for ${month || 'this month'}. Let me know if you need anything else!\n\nThanks,\nKayla`;
    const raw = buildRawEmail({ to, cc, subject: replySubject, body, threadId, inReplyTo, references });
    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { raw, threadId } }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.error('credit-card:draftReplyToDebbie', { threadId, status: resp.status, message: err.error?.message });
      return { error: err.error?.message || 'Failed to create reply draft' };
    }
    const data = await resp.json();
    return { draftId: data.id, success: true };
  } catch (e) {
    console.error('credit-card:draftReplyToDebbie', { threadId, message: e.message });
    return { error: e.message };
  }
}

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action, spreadsheetId, range, sheetName, staffInitials, to, staffName } = req.query;

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

      case 'findAllocationEmail':
        return res.status(200).json(await findAllocationEmail(token));

      case 'draftNudge':
        if (!to || !staffName) {
          return res.status(400).json({ error: 'to and staffName required' });
        }
        return res.status(200).json(await draftNudge(token, to, staffName));

      case 'draftReplyToDebbie': {
        const body = req.method === 'POST' ? req.body : {};
        if (!body.threadId) {
          return res.status(400).json({ error: 'threadId required in POST body' });
        }
        return res.status(200).json(await draftReplyToDebbie(token, body));
      }

      default:
        return res.status(400).json({ error: 'Unknown action. Valid: checkSheet, checkTeamCompletion, findAllocationEmail, draftNudge, draftReplyToDebbie' });
    }
  } catch (e) {
    console.error('credit-card:handler', { action, method: req.method, message: e.message });
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
