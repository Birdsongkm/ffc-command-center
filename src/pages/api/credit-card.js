/**
 * GET /api/credit-card
 * Supports credit card allocation workflows via Google Sheets and Gmail.
 * Actions (query param): checkSheet | checkTeamCompletion | findAllocationEmail | draftNudge | draftReplyToDebbie.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

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
    // Search for Debbie's CC allocation email — only from the current month
    // to prevent last month's email from re-triggering
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/01`;
    const q = `from:dnatsi.com subject:("credit card" OR "cc transactions" OR "transactions ready" OR allocations OR allocation) after:${firstOfMonth}`;
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!searchRes.ok) {
      console.error('credit-card:findAllocationEmail', { status: searchRes.status });
      return { found: false };
    }
    const searchData = await searchRes.json();
    if (!searchData.messages?.length) return { found: false };

    // Find the most recent message that Kayla hasn't replied to yet
    let msgId = null;
    for (const candidate of searchData.messages) {
      // Check the thread — if Kayla sent a reply, skip this one
      const threadRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${candidate.threadId}?format=metadata&metadataHeaders=From`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!threadRes.ok) { msgId = candidate.id; break; } // Can't check thread, show it
      const threadData = await threadRes.json();
      const kaylaReplied = (threadData.messages || []).some(m => {
        const from = (m.payload?.headers || []).find(h => h.name.toLowerCase() === 'from')?.value || '';
        return from.toLowerCase().includes('freshfoodconnect.org') || from.toLowerCase().includes('kayla');
      });
      if (!kaylaReplied) { msgId = candidate.id; break; }
    }
    if (!msgId) return { found: false }; // All threads have replies

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
        validCategories = (catData.values || [])
          .map(r => (r[0] || '').trim())
          .filter(v => v
            && !v.toLowerCase().startsWith('total')
            && !v.toLowerCase().startsWith('net ')
            && !v.toLowerCase().startsWith('gross ')
            && v.toLowerCase() !== 'category'
            && v.toLowerCase() !== 'chart of accounts'
            && v.toLowerCase() !== 'revenue'
            && v.toLowerCase() !== 'expenditures'
            && v.toLowerCase() !== 'other income'
            && v.toLowerCase() !== 'other expenditures'
            && v.toLowerCase() !== 'operational revenue'
          );
      }
    } catch (e) {
      console.error('credit-card:fetchCategories', { message: e.message });
    }

    // Build a pattern map from filled-in rows: merchant keyword → all fields
    // Include historical data from previous year's sheet for better matching
    const allRows = [...rows];
    try {
      const histRange = encodeURIComponent("'2025 CC Purchases'!A:J");
      const histResp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${histRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (histResp.ok) {
        const histData = await histResp.json();
        allRows.push(...(histData.values || []));
      }
    } catch (e) {
      console.error('credit-card:fetchHistory', { message: e.message });
    }

    const patterns = {};
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const merchant = (row[2] || '').trim();
      const category = (row[4] || '').trim(); // E
      if (!merchant || !category) continue;
      const key = normalizeMerchant(merchant);
      if (key) {
        patterns[key] = {
          category,
          description: (row[5] || '').trim(),     // F
          receiptLoc: (row[6] || '').trim(),       // G
          grantSource: (row[7] || '').trim(),      // H
          grantDetail: (row[8] || '').trim(),      // I
          additionalDetails: (row[9] || '').trim(),// J
          source: `${row[0] || '?'}`,
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
      // Row needs attention if category (E), receipt location (G), or grant source (H) is empty
      if (!category || !receiptLoc || !grantSource) {
        const amount = (row[3] || '').trim();
        const date = (row[1] || '').trim();
        const suggestion = suggestFromPatterns(merchant, patterns, validCategories);

        // Auto-generate receipt location (G) from the pattern: "Mon YYYY Initials"
        // e.g., "Mar 2026 KB", "Mar 2026 - AK"
        let autoReceiptLoc = '';
        if (!receiptLoc && date) {
          const parsed = new Date(date);
          if (!isNaN(parsed.getTime())) {
            const mon = parsed.toLocaleDateString('en-US', { month: 'short' });
            const yr = parsed.getFullYear();
            // Check if this person uses "Mon YYYY XX" or "Mon YYYY - XX" format
            // by looking at other filled rows for the same person
            const initials = name.length <= 3 ? name : name.split(/\s+/).map(w => w[0]).join('').toUpperCase();
            const separator = rows.some(r => (r[6] || '').includes(' - ')) ? ' - ' : ' ';
            autoReceiptLoc = `${mon} ${yr}${separator}${initials}`;
          }
        }

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
          suggestedReceiptLoc: autoReceiptLoc || suggestion.receiptLoc || '',
          suggestedGrantSource: suggestion.grantSource || '',
          suggestedGrantDetail: suggestion.grantDetail || '',
          confidence: suggestion.confidence || 'none',
          matchedFrom: suggestion.source || '',
        });
      }
    }

    // Calendar lookup for meal/restaurant transactions — find what meeting it was for
    const mealCategories = new Set(['travel, conference, meetings', 'employee gifts / meals', 'donor cultivation', 'employee gifts/ meals']);
    const mealRows = emptyRows.filter(r => {
      const cat = (r.currentCategory || r.suggestedCategory || '').toLowerCase();
      return !r.currentDescription && mealCategories.has(cat);
    });
    if (mealRows.length > 0) {
      try {
        // Batch calendar lookups — group by date range
        for (const row of mealRows) {
          const txDate = new Date(row.date);
          if (isNaN(txDate.getTime())) continue;
          // Search from 4 days before through the transaction date
          const startDate = new Date(txDate);
          startDate.setDate(startDate.getDate() - 4);
          const endDate = new Date(txDate);
          endDate.setDate(endDate.getDate() + 1); // include the full day
          const timeMin = startDate.toISOString();
          const timeMax = endDate.toISOString();

          const calResp = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=20`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!calResp.ok) continue;
          const calData = await calResp.json();
          const events = (calData.items || []).filter(ev => {
            const title = (ev.summary || '').toLowerCase();
            // Look for meetings with people — skip solo blocks, focus time, etc.
            if (title.includes('focus') || title.includes('ooo') || title.includes('hold') || title.includes('gym') || title.includes('commute') || title.includes('lunch block')) return false;
            // Prefer events with attendees or meeting-like titles
            return (ev.attendees && ev.attendees.length > 0) || title.includes('meeting') || title.includes('1:1') || title.includes('call') || title.includes('coffee') || title.includes('lunch') || title.includes('dinner') || title.includes('happy hour');
          });

          if (events.length > 0) {
            // Pick the most likely meeting — prefer events on the same day, with attendees
            const sameDayEvents = events.filter(ev => {
              const evDate = (ev.start?.date || ev.start?.dateTime || '').slice(0, 10);
              return evDate === row.date?.slice(0, 10) || evDate === txDate.toISOString().slice(0, 10);
            });
            const best = sameDayEvents.length > 0 ? sameDayEvents[0] : events[events.length - 1];
            const attendeeNames = (best.attendees || [])
              .filter(a => !a.self)
              .map(a => a.displayName || a.email?.split('@')[0] || '')
              .filter(Boolean)
              .slice(0, 3);
            const desc = attendeeNames.length > 0
              ? `${best.summary || 'Meeting'} w/ ${attendeeNames.join(', ')}`
              : best.summary || '';
            if (desc) row.suggestedDescription = desc;
          }
        }
      } catch (e) {
        console.error('credit-card:calendarLookup', { message: e.message });
      }
    }

    // Second pass: for rows still missing grant source, look up by category
    // Build a map of category → most common grant source from all filled rows
    const categoryGrants = {};
    for (const row of allRows) {
      const cat = (row[4] || '').trim();
      const gs = (row[7] || '').trim();
      const gd = (row[8] || '').trim();
      if (!cat || !gs) continue;
      if (!categoryGrants[cat]) categoryGrants[cat] = {};
      const key = `${gs}|||${gd}`;
      categoryGrants[cat][key] = (categoryGrants[cat][key] || 0) + 1;
    }
    // For each category, find the most frequent grant source
    const categoryTopGrant = {};
    for (const [cat, counts] of Object.entries(categoryGrants)) {
      let best = null, bestCount = 0;
      for (const [key, count] of Object.entries(counts)) {
        if (count > bestCount) { best = key; bestCount = count; }
      }
      if (best) {
        const [gs, gd] = best.split('|||');
        categoryTopGrant[cat] = { grantSource: gs, grantDetail: gd, count: bestCount };
      }
    }

    // Fill in missing grant source from category patterns
    for (const row of emptyRows) {
      if (!row.suggestedGrantSource) {
        const cat = row.currentCategory || row.suggestedCategory;
        if (cat && categoryTopGrant[cat]) {
          row.suggestedGrantSource = categoryTopGrant[cat].grantSource;
          row.suggestedGrantDetail = row.suggestedGrantDetail || categoryTopGrant[cat].grantDetail;
        }
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
 * Keywords are tried in priority order — first match wins.
 */
function findBestCategory(keywords, validCategories) {
  if (!validCategories.length) return null;
  // Try each keyword in priority order
  for (const kw of keywords) {
    const kwl = kw.toLowerCase();
    // Exact match first
    for (const cat of validCategories) {
      if (cat.toLowerCase() === kwl) return cat;
    }
    // Contains match
    for (const cat of validCategories) {
      if (cat.toLowerCase().includes(kwl)) return cat;
    }
    // Partial word match — any word in the keyword appears in the category
    const kwWords = kwl.split(/[\s,]+/).filter(w => w.length > 3);
    for (const cat of validCategories) {
      const cl = cat.toLowerCase();
      if (kwWords.some(w => cl.includes(w))) return cat;
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
  }
  // First word match (e.g., "amazon" matches any amazon entry, "highlands" matches)
  const firstWord = key.split(' ')[0];
  if (firstWord.length > 3) {
    for (const [pKey, pVal] of Object.entries(patterns)) {
      const pFirstWord = pKey.split(' ')[0];
      if (firstWord === pFirstWord) {
        return { ...pVal, confidence: 'low' };
      }
    }
  }
  // Any significant word overlap (e.g., "creamery" in one matches "creamery" in another)
  const keyWords = key.split(' ').filter(w => w.length > 4);
  for (const [pKey, pVal] of Object.entries(patterns)) {
    const pWords = pKey.split(' ').filter(w => w.length > 4);
    if (keyWords.some(w => pWords.includes(w))) {
      return { ...pVal, confidence: 'low' };
    }
  }

  // Common merchant → category heuristics using actual Chart of Accounts names
  const lm = merchant.toLowerCase();
  const empty = { description: '', receiptLoc: '', grantSource: '', grantDetail: '' };

  // Direct category name mapping based on merchant type
  // Uses broad pattern recognition — not just exact merchant names but
  // characteristics like "SQ *" prefix (Square POS = food/retail),
  // location words, industry patterns, etc.
  const heuristics = [
    // Restaurants, bars, cafes, food — SQ * prefix is usually food/retail
    { test: () => lm.includes('restaurant') || lm.includes('grill') || lm.includes('creamery') || lm.includes('cafe') || lm.includes('coffee') || lm.includes('bar ') || lm.includes('cork') || lm.includes('kitchen') || lm.includes('pizza') || lm.includes('taco') || lm.includes('brew') || lm.includes('bistro') || lm.includes('diner') || lm.includes('bakery') || lm.includes('tavern') || lm.includes('pub ') || lm.includes('eatery') || lm.includes('sushi') || lm.includes('thai') || lm.includes('burrito') || lm.includes('wing') || lm.includes('bbq') || lm.includes('steakhouse') || lm.includes('seafood') || lm.includes('brunch') || lm.includes('deli') || lm.includes('food') || lm.includes('catering') || lm.includes('doordash') || lm.includes('grubhub') || lm.includes('uber eats') || lm.includes('mattison'),
      keywords: ['travel, conference, meetings', 'employee gifts', 'donor cultivation'] },
    // SQ * (Square POS) that didn't match above — likely food/retail
    { test: () => lm.startsWith('sq *') || lm.startsWith('sq*'),
      keywords: ['travel, conference, meetings', 'employee gifts', 'supplies'] },
    // Amazon, office supplies
    { test: () => lm.includes('amazon') || lm.includes('amzn') || lm.includes('staples') || lm.includes('office depot'),
      keywords: ['supplies & equipment', 'office'] },
    // Shipping, postage, mail
    { test: () => lm.includes('usps') || lm.includes('ups store') || lm.includes('fedex') || lm.includes('po box') || lm.includes('stamps.com') || lm.includes('pirate ship'),
      keywords: ['memberships, dues & subscriptions', 'supplies & equipment', 'office'] },
    // Software, cloud services, subscriptions
    { test: () => lm.includes('google') || lm.includes('adobe') || lm.includes('microsoft') || lm.includes('zoom') || lm.includes('canva') || lm.includes('paddle') || lm.includes('mailchimp') || lm.includes('slack') || lm.includes('dropbox') || lm.includes('notion') || lm.includes('asana') || lm.includes('monday.com') || lm.includes('hubspot') || lm.includes('salesforce') || lm.includes('.com') && (lm.includes('net') || lm.includes('app') || lm.includes('cloud')),
      keywords: ['cloud, promotion, software', 'marketing subscriptions', 'memberships'] },
    // Marketing materials, printing
    { test: () => lm.includes('sticker') || lm.includes('print') || lm.includes('vista') || lm.includes('ace ') || lm.includes('banner') || lm.includes('sign ') || lm.includes('promo'),
      keywords: ['marketing materials'] },
    // PPC / digital ads
    { test: () => lm.includes('ppc') || lm.includes('dash-ppc') || lm.includes('facebook ads') || lm.includes('google ads') || lm.includes('meta ads'),
      keywords: ['contract marketing', 'online marketing'] },
    // PDF, documents, tools
    { test: () => lm.includes('pdf') || lm.includes('files-editor') || lm.includes('docusign') || lm.includes('hellosign'),
      keywords: ['cloud, promotion, software', 'supplies & equipment'] },
    // Travel, hotels, airlines, car rental
    { test: () => lm.includes('airline') || lm.includes('united') || lm.includes('delta') || lm.includes('southwest') || lm.includes('frontier') || lm.includes('hotel') || lm.includes('marriott') || lm.includes('hilton') || lm.includes('airbnb') || lm.includes('hertz') || lm.includes('enterprise') || lm.includes('lyft') || lm.includes('uber') || lm.includes('parking') || lm.includes('toll'),
      keywords: ['travel, conference, meetings', 'mileage'] },
    // Gas stations
    { test: () => lm.includes('shell') || lm.includes('chevron') || lm.includes('exxon') || lm.includes('bp ') || lm.includes('gas') || lm.includes('fuel') || lm.includes('circle k') || lm.includes('7-eleven') || lm.includes('kum & go'),
      keywords: ['mileage reimbursement', 'travel'] },
    // Insurance
    { test: () => lm.includes('insurance') || lm.includes('geico') || lm.includes('state farm'),
      keywords: ['insurance'] },
  ];

  for (const h of heuristics) {
    if (h.test()) {
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
