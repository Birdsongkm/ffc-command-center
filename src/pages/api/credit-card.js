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

/**
 * Read the sheet, find KB rows with empty fields, and suggest fills
 * based on merchant patterns from other filled-in rows (any person).
 */
/**
 * Columns:
 *   A: Staff Credit Card (name/initials)
 *   B: Date of Purchase
 *   C: Vendor Name / Card Description
 *   D: Amount
 *   E: Official Category (Chart of Accounts)
 *   F: Description/Notes
 *   G: Where is receipt saved? (e.g. "Mar 2026 LL", "Mar 2026 - AK")
 *   H: Grant Source (if applicable) or DENVER GENERAL
 *   I: Grant detail if applicable
 *   J: Additional Details if needed
 */
async function reviewAllocations(token, spreadsheetId, sheetName) {
  try {
    // Fetch the main data sheet
    const range = `'${sheetName}'!A:J`;
    const resp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) {
      console.error('credit-card:reviewAllocations', { spreadsheetId, sheetName, status: resp.status });
      return { error: 'Failed to read sheet' };
    }
    const data = await resp.json();
    const rows = data.values || [];

    // Fetch valid category names from "Chart of Accounts Names" tab
    let validCategories = [];
    try {
      const catRange = encodeURIComponent("'Chart of Accounts Names'!A:A");
      const catResp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${catRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (catResp.ok) {
        const catData = await catResp.json();
        validCategories = (catData.values || []).map(r => (r[0] || '').trim()).filter(v => v && v.toLowerCase() !== 'category' && v.toLowerCase() !== 'chart of accounts');
      }
    } catch (e) {
      console.error('credit-card:fetchCategories', { message: e.message });
    }

    // Build a pattern map from filled-in rows: merchant keyword → all fields
    const patterns = {};
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const merchant = (row[2] || '').trim();
      const category = (row[4] || '').trim(); // E
      if (!merchant || !category) continue;
      const key = normalizeMerchant(merchant);
      if (key) {
        patterns[key] = {
          category,
          description: (row[5] || '').trim(),     // F
          receiptLoc: (row[6] || '').trim(),       // G — "Where is receipt saved?"
          grantSource: (row[7] || '').trim(),      // H
          grantDetail: (row[8] || '').trim(),      // I
          additionalDetails: (row[9] || '').trim(),// J
          source: `${row[0] || '?'} - row ${i + 1}`,
        };
      }
    }

    // Find the most recent month header row — only review that month
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const skipNames = new Set(['staff credit', 'staff credit card', 'naming:', ...monthNames]);
    let lastMonthIdx = -1;
    let lastMonthName = '';
    for (let i = 0; i < rows.length; i++) {
      const name = (rows[i][0] || '').trim().toLowerCase();
      if (monthNames.includes(name)) {
        lastMonthIdx = i;
        lastMonthName = rows[i][0].trim();
      }
    }
    // Start scanning from the last month header (or beginning if none found)
    const startIdx = lastMonthIdx >= 0 ? lastMonthIdx + 1 : 0;

    // Find rows with empty category or receipt location in the most recent month only
    const emptyRows = [];
    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      const name = (row[0] || '').trim();
      if (!name || skipNames.has(name.toLowerCase())) continue;
      const merchant = (row[2] || '').trim();
      if (!merchant) continue;
      const category = (row[4] || '').trim();     // E
      const description = (row[5] || '').trim();   // F
      const receiptLoc = (row[6] || '').trim();    // G
      const grantSource = (row[7] || '').trim();   // H
      const grantDetail = (row[8] || '').trim();   // I
      const additionalDetails = (row[9] || '').trim(); // J
      // Row needs attention if category OR receipt location is empty
      if (!category || !receiptLoc) {
        const amount = (row[3] || '').trim();
        const date = (row[1] || '').trim();
        const suggestion = suggestFromPatterns(merchant, patterns, validCategories);
        emptyRows.push({
          rowIndex: i,
          rowNumber: i + 1,
          staffName: name,
          date,
          merchant,
          amount,
          currentCategory: category,
          currentDescription: description,
          currentReceiptLoc: receiptLoc,
          currentGrantSource: grantSource,
          currentGrantDetail: grantDetail,
          currentAdditionalDetails: additionalDetails,
          suggestedCategory: suggestion.category || '',
          suggestedDescription: suggestion.description || '',
          suggestedReceiptLoc: suggestion.receiptLoc || '',
          suggestedGrantSource: suggestion.grantSource || '',
          suggestedGrantDetail: suggestion.grantDetail || '',
          confidence: suggestion.confidence || 'none',
          matchedFrom: suggestion.source || '',
        });
      }
    }

    return { emptyRows, totalRows: rows.length, patternCount: Object.keys(patterns).length, month: lastMonthName || 'Unknown' };
  } catch (e) {
    console.error('credit-card:reviewAllocations', { spreadsheetId, message: e.message });
    return { error: e.message };
  }
}

/**
 * Normalize a merchant string to a matchable key.
 * "SQ *HIGHLANDS CORK AND CADenver CO" → "highlands cork"
 * "AMAZON MKTPL*BD18G1RD0 Amzn.com/billWA" → "amazon"
 * "DASH PPC DASH-PPC.COM PA" → "dash ppc"
 */
function normalizeMerchant(merchant) {
  return merchant
    .toLowerCase()
    .replace(/sq \*|sq\*/g, '') // Strip Square prefix
    .replace(/amzn\.com\/\S+/g, '') // Strip Amazon bill URLs
    .replace(/mktpl\*\S+/g, '') // Strip Amazon marketplace IDs
    .replace(/\d{3,}/g, '') // Strip long numbers (phone, ID)
    .replace(/\b[a-z]{2}\b$/g, '') // Strip trailing state codes
    .replace(/[^a-z\s]/g, ' ') // Keep only letters
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3) // First 3 words
    .join(' ')
    .trim();
}

/**
 * Find the best matching category from the valid list based on keywords.
 */
function findBestCategory(keywords, validCategories) {
  if (!validCategories.length) return null;
  for (const cat of validCategories) {
    const cl = cat.toLowerCase();
    for (const kw of keywords) {
      if (cl.includes(kw)) return cat;
    }
  }
  return null;
}

function suggestFromPatterns(merchant, patterns, validCategories) {
  const key = normalizeMerchant(merchant);
  if (!key) return { confidence: 'none' };

  // Exact match
  if (patterns[key]) {
    return { ...patterns[key], confidence: 'high' };
  }

  // Partial match — check if any pattern key is contained in or contains this key
  for (const [pKey, pVal] of Object.entries(patterns)) {
    if (key.includes(pKey) || pKey.includes(key)) {
      return { ...pVal, confidence: 'medium' };
    }
    // Check first word match (e.g., "amazon" matches any amazon entry)
    const firstWord = key.split(' ')[0];
    const pFirstWord = pKey.split(' ')[0];
    if (firstWord.length > 3 && firstWord === pFirstWord) {
      return { ...pVal, confidence: 'low' };
    }
  }

  // Common merchant → category keyword heuristics
  // Map merchant keywords to likely category keywords, then find the best match in validCategories
  const lm = merchant.toLowerCase();
  const empty = { description: '', receiptLoc: '', grantSource: '', grantDetail: '' };
  const heuristics = [
    { test: () => lm.includes('restaurant') || lm.includes('grill') || lm.includes('creamery') || lm.includes('cafe') || lm.includes('coffee') || lm.includes('bar ') || lm.includes('kitchen') || lm.includes('pizza') || lm.includes('taco') || lm.includes('brew'), keywords: ['meal', 'entertainment', 'food', 'dining'] },
    { test: () => lm.includes('amazon') || lm.includes('amzn'), keywords: ['office', 'supplies', 'amazon'] },
    { test: () => lm.includes('usps') || lm.includes('ups') || lm.includes('fedex'), keywords: ['postage', 'shipping', 'mail'] },
    { test: () => lm.includes('google') || lm.includes('adobe') || lm.includes('microsoft') || lm.includes('zoom') || lm.includes('canva') || lm.includes('paddle'), keywords: ['software', 'subscription', 'cloud', 'promotion'] },
    { test: () => lm.includes('sticker') || lm.includes('print') || lm.includes('vista'), keywords: ['marketing', 'material', 'print'] },
  ];

  for (const h of heuristics) {
    if (h.test()) {
      // Find the best matching valid category
      const match = findBestCategory(h.keywords, validCategories);
      if (match) return { ...empty, category: match, confidence: 'heuristic', source: 'merchant name' };
    }
  }

  return { confidence: 'none' };
}

/**
 * Write approved allocations back to the sheet.
 * Body: { spreadsheetId, sheetName, updates: [{ rowNumber, category, description, allocation }] }
 */
async function writeAllocations(token, { spreadsheetId, sheetName, updates }) {
  try {
    // Write columns E through J for each row
    const data = updates.map(u => ({
      range: `'${sheetName}'!E${u.rowNumber}:J${u.rowNumber}`,
      values: [[u.category || '', u.description || '', u.receiptLoc || '', u.grantSource || '', u.grantDetail || '', u.additionalDetails || '']],
    }));

    const resp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data,
        }),
      }
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.error('credit-card:writeAllocations', { spreadsheetId, status: resp.status, message: err.error?.message });
      return { error: err.error?.message || 'Failed to write to sheet' };
    }
    return { success: true, updatedRows: updates.length };
  } catch (e) {
    console.error('credit-card:writeAllocations', { spreadsheetId, message: e.message });
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

      case 'reviewAllocations':
        if (!spreadsheetId || !sheetName) {
          return res.status(400).json({ error: 'spreadsheetId and sheetName required' });
        }
        return res.status(200).json(await reviewAllocations(token, spreadsheetId, sheetName));

      case 'writeAllocations': {
        const wBody = req.method === 'POST' ? req.body : {};
        if (!wBody.spreadsheetId || !wBody.updates) {
          return res.status(400).json({ error: 'spreadsheetId and updates required in POST body' });
        }
        return res.status(200).json(await writeAllocations(token, wBody));
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    console.error('credit-card:handler', { action, method: req.method, message: e.message });
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
