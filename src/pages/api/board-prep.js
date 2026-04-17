/**
 * Board Meeting Prep Automation
 *
 * GET /api/board-prep
 *   Checks calendar (next 21 days) for upcoming FFC Board Meeting.
 *   Finds the most recent Board Report doc in Drive.
 *   Returns: { meeting, latestBoardReport, jack1on1, agendaDoc }
 *
 * POST /api/board-prep
 *   Body: { meetingLabel, year, boardMeetingDate, financialsQuery }
 *   1. Copy latest Board Report → rename → highlight text grey
 *   2. Read Jack 1:1 doc → return recent text
 *   3. Read agenda doc → extract rotation text
 *   4. Find financials file in shared Drive
 *   5. Create staff Gmail draft
 *   6. Create board Gmail draft (no links yet — added after review)
 *   Returns all results and URLs for Kayla to review.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

const { buildRawEmail } = require('../../lib/email');

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

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getBoardMeetingDeadline(boardMeetingDateStr) {
  const d = parseDateLocal(boardMeetingDateStr);
  const prev = new Date(d);
  prev.setDate(d.getDate() - 1);
  while (prev.getDay() !== 4) {
    prev.setDate(prev.getDate() - 1);
  }
  return prev;
}

function buildBoardDocName(meetingLabel, year) {
  return `${meetingLabel} ${year}- Board Report- FFC`;
}

function buildStaffEmailHtml(meetingLabel, docUrl, docName, deadlineStr) {
  return `<p>Hi team,</p>
<p>Here's the ${meetingLabel} Board Report — please update your section(s) by EOB ${deadlineStr}.</p>
<p>As always, the previous info is highlighted in grey — please remove the grey as you update, and let me know once your section is ready to go.</p>
<p>📄 <a href="${docUrl}">${docName}</a></p>
<p>Thank you!</p>`;
}

function buildStaffEmailPlainText(meetingLabel, docUrl, docName, deadlineStr) {
  return `Hi team,

Here's the ${meetingLabel} Board Report — please update your section(s) by EOB ${deadlineStr}.

As always, the previous info is highlighted in grey — please remove the grey as you update, and let me know once your section is ready to go.

📄 ${docName}
${docUrl}

Thank you!`;
}

// Extract board-meeting agenda bullets from 1:1 doc text.
// Scans for a "board meeting" subsection in the most recent meeting notes,
// returns the bullet items under it.
function extractBoardAgendaItems(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const items = [];
  let inBoardSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    const trimmed = line.trim();

    // Detect "Board Meeting" or "Board Agenda" or "For Board" heading
    if (/board\s*(meeting|agenda|items?|prep)/i.test(trimmed) && trimmed.length < 80) {
      inBoardSection = true;
      continue;
    }

    // A non-indented, non-bullet line that isn't empty ends the board section
    if (inBoardSection && trimmed && !trimmed.match(/^[-•*◦]/) && !/^\s/.test(line) && trimmed.length > 3) {
      inBoardSection = false;
    }

    // Collect bullets inside the board section
    if (inBoardSection && trimmed.match(/^[-•*◦]/)) {
      const content = trimmed.replace(/^[-•*◦]\s*/, '').trim();
      if (content) items.push(content);
    }
  }

  // Fallback: if nothing found, grab any bullet that mentions "board" or "agenda"
  if (items.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-•*◦]/) && /(board|agenda)/i.test(trimmed)) {
        const content = trimmed.replace(/^[-•*◦]\s*/, '').trim();
        if (content) items.push(content);
      }
    }
  }

  return items;
}

// Read the agenda doc's full text and determine who's next in both rotations.
// Rotation lists look like: "Note-taker rotation: Jack, Terrance, James, ..."
// Past meeting entries look like: "Note-taker: Jack Fritzinger   |   Intro: Terrance Grady"
// Since new sections are prepended, the most recent past meeting is the first match found.
function detectNextInRotation(fullText) {
  if (!fullText) return { noteTaker: null, introPerson: null };

  // Step 1: extract rotation lists (lines with commas after the colon, 2+ names)
  let noteTakerList = [];
  let introList = [];
  for (const line of fullText.split('\n')) {
    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1 || !trimmed.includes(',')) continue;
    const label = trimmed.slice(0, colonIdx).toLowerCase();
    const names = trimmed.slice(colonIdx + 1).split(',').map(s => s.trim()).filter(Boolean);
    if (names.length < 2) continue;
    if (/note.?taker|notetaker/.test(label)) noteTakerList = names;
    else if (/^intro/.test(label)) introList = names;
  }

  // Step 2: find the most recent single-name past entry (first match = most recent due to prepend order)
  let lastNoteTaker = null;
  let lastIntroPerson = null;
  for (const m of fullText.matchAll(/note-?taker:\s*([^,|\n\r]+)/gi)) {
    const val = m[1].trim();
    if (val && !val.includes(',')) { lastNoteTaker = val; break; }
  }
  for (const m of fullText.matchAll(/intro:\s*([^,|\n\r]+)/gi)) {
    const val = m[1].trim();
    if (val && !val.includes(',')) { lastIntroPerson = val; break; }
  }

  function nextAfter(list, last) {
    if (!list.length) return null;
    if (!last) return list[0];
    const lastFirst = last.split(' ')[0].toLowerCase();
    let idx = list.findIndex(n => n.toLowerCase() === last.toLowerCase());
    if (idx === -1) idx = list.findIndex(n => n.split(' ')[0].toLowerCase() === lastFirst);
    if (idx === -1) return null;
    return list[(idx + 1) % list.length];
  }

  return {
    noteTaker: nextAfter(noteTakerList, lastNoteTaker),
    introPerson: nextAfter(introList, lastIntroPerson),
  };
}

function buildBoardEmailHtml(meetingDateStr, meetingTimeStr, boardReportUrl, financialsUrl, agendaUrl, noteTaker, introPerson) {
  const d = parseDateLocal(meetingDateStr);
  const dayName = DAY_NAMES[d.getDay()];
  const month = MONTH_NAMES[d.getMonth()];
  const date = d.getDate();

  const reportLink = boardReportUrl
    ? `<a href="${boardReportUrl}">Board Report</a>`
    : 'Board Report (link to follow)';
  const financialsLink = financialsUrl
    ? `<a href="${financialsUrl}">Financial Statements</a>`
    : 'Financial Statements (link to follow)';
  const agendaLink = agendaUrl
    ? `<a href="${agendaUrl}">Meeting Agenda</a>`
    : 'Meeting Agenda (link to follow)';

  const noteFirst = noteTaker ? noteTaker.split(' ')[0] : null;
  const introFirst = introPerson ? introPerson.split(' ')[0] : null;
  const assignLine = (noteFirst && introFirst)
    ? `<p>${noteFirst}, can you take notes, and ${introFirst} can you lead our intro?</p>`
    : (noteFirst ? `<p>${noteFirst}, can you take notes?</p>` : '');

  return `<p>Dear board members,</p>
<p>I am looking forward to our meeting this ${dayName}, ${month} ${date} at ${meetingTimeStr}. Please review all materials in advance.</p>
<ul>
<li>📄 ${reportLink}</li>
<li>📊 ${financialsLink}</li>
<li>📋 ${agendaLink}</li>
</ul>
${assignLine}
<p>Thank you all for everything you do!</p>
<p>Kayla</p>`;
}

// Search Drive for a file by name (supports all drives including shared)
async function driveSearch(token, query, maxResults = 5) {
  const q = encodeURIComponent(`name contains '${query.replace(/'/g, "\\'")}' and trashed=false`);
  const fields = 'files(id,name,mimeType,modifiedTime,webViewLink)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime desc&pageSize=${maxResults}&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error('board-prep:driveSearch', { query, status: r.status, message: err.error?.message });
    throw new Error(`Drive search failed for "${query}": ${err.error?.message || r.status}`);
  }
  const data = await r.json();
  return data.files || [];
}

// Copy a Drive file and rename it
async function copyDriveFile(token, fileId, newName) {
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/copy?supportsAllDrives=true`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error('board-prep:copyDriveFile', { fileId, newName, status: r.status, message: err.error?.message });
    throw new Error(`Failed to copy file: ${err.error?.message || r.status}`);
  }
  return r.json();
}

// Read a Google Doc and return body content
async function readDoc(token, docId) {
  const r = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error('board-prep:readDoc', { docId, status: r.status, message: err.error?.message });
    throw new Error(`Failed to read doc ${docId}: ${err.error?.message || r.status}`);
  }
  return r.json();
}

// Highlight all text in a Google Doc with grey background
async function highlightDocGrey(token, docId) {
  // First read to find content end index
  const doc = await readDoc(token, docId);
  const content = doc.body?.content || [];
  if (!content.length) return;
  const lastEl = content[content.length - 1];
  const endIndex = (lastEl.endIndex || 2) - 1; // exclude final newline
  if (endIndex <= 1) return;

  await docsApiUpdate(token, docId, [{
    updateTextStyle: {
      range: { startIndex: 1, endIndex },
      textStyle: { backgroundColor: { color: { rgbColor: { red: 0.851, green: 0.851, blue: 0.851 } } } },
      fields: 'backgroundColor',
    },
  }]);
}

// Extract plain text from Google Docs body
function extractDocPlainText(body) {
  if (!body || !body.content) return '';
  const parts = [];
  function processEl(el) {
    if (el.paragraph) {
      (el.paragraph.elements || []).forEach(e => {
        if (e.textRun?.content) parts.push(e.textRun.content);
      });
    } else if (el.table) {
      (el.table.tableRows || []).forEach(row => {
        (row.tableCells || []).forEach(cell => {
          (cell.content || []).forEach(processEl);
        });
      });
    }
  }
  body.content.forEach(processEl);
  return parts.join('');
}

// Shared Docs batchUpdate helper
async function docsApiUpdate(token, docId, requests) {
  const r = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error('board-prep:docsApiUpdate', { docId, status: r.status, message: err.error?.message });
    throw new Error(`Docs batchUpdate failed: ${err.error?.message || r.status}`);
  }
}

// Find the last table element in a doc body content array
function findLastTable(bodyContent) {
  let last = null;
  for (const el of bodyContent || []) { if (el.table) last = el; }
  return last;
}

// Find the first table element in a doc body content array
function findFirstTable(bodyContent) {
  for (const el of bodyContent || []) { if (el.table) return el; }
  return null;
}

// Extract column count from a table element
function getTableColumnCount(tableEl) {
  return tableEl?.table?.tableRows?.[0]?.tableCells?.length || 3;
}

// Extract the header row strings from a table element's first row
function getTableHeaderRow(tableEl) {
  const firstRow = tableEl?.table?.tableRows?.[0];
  if (!firstRow) return ['Agenda Item', 'Time', 'Presenter'];
  return (firstRow.tableCells || []).map(cell => {
    const texts = [];
    (cell.content || []).forEach(el => {
      (el.paragraph?.elements || []).forEach(e => {
        if (e.textRun?.content) texts.push(e.textRun.content);
      });
    });
    return texts.join('').replace(/\n/g, '').trim();
  });
}

// Build cell-population batchUpdate requests in reverse doc order so index shifts don't collide.
// tableObj is the raw table element from the Docs API response.
// tableData is a 2D array of strings indexed [row][col].
function buildTablePopulateRequests(tableObj, tableData) {
  const requests = [];
  const rows = tableObj?.table?.tableRows || [];
  for (let r = rows.length - 1; r >= 0; r--) {
    const cells = rows[r]?.tableCells || [];
    for (let c = cells.length - 1; c >= 0; c--) {
      const text = tableData[r]?.[c] || '';
      if (!text) continue;
      const startIndex = cells[c]?.content?.[0]?.startIndex;
      if (startIndex == null) continue;
      requests.push({ insertText: { location: { index: startIndex }, text } });
    }
  }
  return requests;
}

// Insert text at the beginning of a Google Doc (index 1)
async function prependDocText(token, docId, text) {
  await docsApiUpdate(token, docId, [{ insertText: { location: { index: 1 }, text } }]);
}

// Create a Gmail draft (html overrides body for HTML emails)
async function createDraft(token, { to, subject, body, html }) {
  const raw = buildRawEmail({ to, subject, body, html });
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw } }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error('board-prep:createDraft', { to, subject, status: r.status, message: err.error?.message });
    throw new Error(`Failed to create draft: ${err.error?.message || r.status}`);
  }
  const data = await r.json();
  return data.id;
}

async function handleGet(token) {
  // Calendar: next 21 days
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString();
  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&q=board+meeting`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!calRes.ok) {
    const err = await calRes.json().catch(() => ({}));
    console.error('board-prep:calendar', { status: calRes.status, message: err.error?.message });
    throw new Error(`Calendar fetch failed: ${err.error?.message || calRes.status}`);
  }
  const calData = await calRes.json();
  const meeting = (calData.items || [])
    .filter(e => (e.summary || '').toLowerCase().includes('board meeting'))
    .sort((a, b) => new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date))[0] || null;

  // Drive: find docs (parallel)
  const [boardReports, jack1on1Files, agendaFiles] = await Promise.all([
    driveSearch(token, 'Board Report- FFC', 5),
    driveSearch(token, 'Jack & Kayla 1:1s 2026', 2),
    driveSearch(token, 'FFC National Board Meeting Agenda', 2),
  ]);

  const latestBoardReport = boardReports[0] || null;
  const jack1on1 = jack1on1Files[0] || null;
  const agendaDoc = agendaFiles[0] || null;

  // Also read 1:1 doc now so the panel can show items immediately
  let boardAgendaItems = [];
  if (jack1on1) {
    try {
      const doc = await readDoc(token, jack1on1.id);
      const fullText = extractDocPlainText(doc.body);
      const recentText = fullText.length > 3000 ? fullText.slice(-3000) : fullText;
      boardAgendaItems = extractBoardAgendaItems(recentText);
    } catch (e) {
      console.error('board-prep:get:read1on1', { message: e.message });
    }
  }

  return { meeting, latestBoardReport, jack1on1, agendaDoc, boardAgendaItems };
}

async function handlePost(token, { meetingLabel, year, boardMeetingDate, financialsQuery, noteTaker, introPerson, agendaItems }) {
  if (!meetingLabel || !year || !boardMeetingDate) {
    throw new Error('Missing required fields: meetingLabel, year, boardMeetingDate');
  }

  const deadline = getBoardMeetingDeadline(boardMeetingDate);
  const deadlineMonth = MONTH_NAMES[deadline.getMonth()];
  const deadlineDay = deadline.getDate();
  const deadlineStr = `Thursday, ${deadlineMonth} ${deadlineDay}`;
  const m = deadline.getMonth() + 1;
  const d2 = deadline.getDate();
  const staffSubject = `${meetingLabel} Board Report (Due ${m}/${d2})`;

  const results = {
    boardReportUrl: null,
    boardReportName: null,
    staffDraftId: null,
    boardDraftId: null,
    agendaDocUrl: null,
    agendaDocId: null,
    agendaRotationText: null,
    suggestedNoteTaker: null,
    suggestedIntroPerson: null,
    financialsUrl: null,
    errors: [],
  };

  // 1. Copy & rename board report, then highlight grey
  try {
    const reports = await driveSearch(token, 'Board Report- FFC', 5);
    if (!reports.length) throw new Error('No Board Report found in Drive');
    const sourceDoc = reports[0];
    const newName = buildBoardDocName(meetingLabel, year);
    const copied = await copyDriveFile(token, sourceDoc.id, newName);
    const newDocId = copied.id;
    results.boardReportUrl = `https://docs.google.com/document/d/${newDocId}/edit`;
    results.boardReportName = newName;
    await highlightDocGrey(token, newDocId);
  } catch (e) {
    console.error('board-prep:copyReport', { message: e.message });
    results.errors.push(`Board report copy failed: ${e.message}`);
  }

  // 2. Read agenda doc — detect rotation, return ID + rotation text for the "Add to Agenda Doc" step
  try {
    const files = await driveSearch(token, 'FFC National Board Meeting Agenda', 2);
    if (files.length) {
      results.agendaDocUrl = files[0].webViewLink;
      results.agendaDocId = files[0].id;
      const doc = await readDoc(token, files[0].id);
      const fullText = extractDocPlainText(doc.body);
      // Use full text for rotation detection; cap display text for the UI collapsible
      const rotation = detectNextInRotation(fullText);
      results.suggestedNoteTaker = rotation.noteTaker;
      results.suggestedIntroPerson = rotation.introPerson;
      results.agendaRotationText = fullText.length > 1500 ? fullText.slice(0, 1500) : fullText;
    }
  } catch (e) {
    console.error('board-prep:readAgenda', { message: e.message });
    results.errors.push(`Agenda doc read failed: ${e.message}`);
  }

  // 3. Find financials file
  try {
    const query = financialsQuery || 'Financials';
    const files = await driveSearch(token, query, 10);
    const match = files.find(f => !f.name.toLowerCase().includes('detail'));
    if (match) results.financialsUrl = match.webViewLink;
  } catch (e) {
    console.error('board-prep:findFinancials', { message: e.message });
    results.errors.push(`Financials search failed: ${e.message}`);
  }

  // 4. Create staff email draft
  if (results.boardReportUrl) {
    try {
      const staffTo = 'Laura Lavid <laura@freshfoodconnect.org>, Carmen Alcantara <carmen@freshfoodconnect.org>, Gretchen Roberts <gretchen@freshfoodconnect.org>, Adjoa Kittoe <adjoa@freshfoodconnect.org>';
      const docName = results.boardReportName || `${meetingLabel} ${year}- Board Report- FFC`;
      const staffHtml = buildStaffEmailHtml(meetingLabel, results.boardReportUrl, docName, deadlineStr);
      results.staffDraftId = await createDraft(token, { to: staffTo, subject: staffSubject, html: staffHtml });
    } catch (e) {
      console.error('board-prep:staffDraft', { message: e.message });
      results.errors.push(`Staff draft failed: ${e.message}`);
    }
  }

  // 5. Create board email draft (HTML with hyperlinks + note-taker/intro assignment)
  try {
    const boardTo = 'Jack Fritzinger <jackfritzinger@gmail.com>, Terrance Grady <tbgrady21@gmail.com>, Terrance Grady <tgrady@chfainfo.com>, James Iacino <James.iacino@gmail.com>, Bill Johnson <dubrie@gmail.com>, Benjamin Weinberg <bweinberg1222@gmail.com>, Kim-Ashleigh Mostert-Freiberg <kimash.mostert@gmail.com>, Jada Mclean <shanice.jada@gmail.com>, Jada McLean <jada@groflo.io>';
    const boardMeetingTime = '2:30 PM MT';
    const boardSubject = `Materials to Review- Board Meeting ${DAY_NAMES[parseDateLocal(boardMeetingDate).getDay()]}`;
    const boardHtml = buildBoardEmailHtml(
      boardMeetingDate,
      boardMeetingTime,
      results.boardReportUrl,
      results.financialsUrl,
      results.agendaDocUrl,
      noteTaker || '',
      introPerson || ''
    );
    results.boardDraftId = await createDraft(token, { to: boardTo, subject: boardSubject, html: boardHtml });
  } catch (e) {
    console.error('board-prep:boardDraft', { message: e.message });
    results.errors.push(`Board draft failed: ${e.message}`);
  }

  return results;
}

async function handleInsertAgendaSection(token, { agendaDocId, boardMeetingDate, noteTaker, introPerson, agendaItems }) {
  if (!agendaDocId || !boardMeetingDate) {
    throw new Error('Missing required fields: agendaDocId, boardMeetingDate');
  }
  const d = parseDateLocal(boardMeetingDate);
  const month = MONTH_NAMES[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const dayName = DAY_NAMES[d.getDay()];
  const confirmedItems = (agendaItems || []).filter(Boolean);

  // Step 1: Read doc to copy last table's column structure
  const doc = await readDoc(token, agendaDocId);
  const bodyContent = doc.body?.content || [];
  const lastTable = findLastTable(bodyContent);
  const numCols = getTableColumnCount(lastTable);
  const headerRow = lastTable ? getTableHeaderRow(lastTable) : ['Agenda Item', 'Time', 'Presenter'];

  // Build data rows: standard bookends + confirmed items (10 min each)
  const dataRows = [
    ['Welcome & Introductions', '5 min', introPerson || ''],
    ['Call to Order & Approval of Minutes', '5 min', ''],
    ...confirmedItems.map(item => [item, '10 min', '']),
    ['Financial Update', '10 min', ''],
    ['Other Business', '5 min', ''],
    ['Adjourn', '', ''],
  ].map(row => row.slice(0, numCols));

  const numRows = 1 + dataRows.length; // header + data
  const tableData = [headerRow.slice(0, numCols), ...dataRows];

  // Step 2: Build header text (separator + date + rotation line)
  const rotationLine = [
    noteTaker ? `Note-taker: ${noteTaker}` : '',
    introPerson ? `Intro: ${introPerson}` : '',
  ].filter(Boolean).join('   |   ');
  const separator = '─'.repeat(50);
  const headerText = `${separator}\n${month} ${year} FFC Board Meeting — ${dayName}, ${month} ${day}, ${year}\n${rotationLine}\n\n`;

  // Step 3: Insert table at index 1, then insert header text at index 1 (goes before table).
  // The Docs API applies requests in order — inserting text at 1 after the table pushes the table down.
  await docsApiUpdate(token, agendaDocId, [
    { insertTable: { rows: numRows, columns: numCols, location: { index: 1 } } },
    { insertText: { location: { index: 1 }, text: headerText } },
  ]);

  // Step 4: Re-read to get actual cell indices of the new table (now the first table in the doc)
  const doc2 = await readDoc(token, agendaDocId);
  const newTableEl = findFirstTable(doc2.body?.content || []);
  if (!newTableEl) {
    console.error('board-prep:insertAgendaSection', { message: 'New table not found after insert' });
    return { success: true, agendaDocUrl: `https://docs.google.com/document/d/${agendaDocId}/edit` };
  }

  // Step 5: Populate cells in reverse order to avoid index shifts
  const populateRequests = buildTablePopulateRequests(newTableEl, tableData);
  if (populateRequests.length) {
    await docsApiUpdate(token, agendaDocId, populateRequests);
  }

  return { success: true, agendaDocUrl: `https://docs.google.com/document/d/${agendaDocId}/edit` };
}

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await handleGet(token));
    }
    if (req.method === 'POST') {
      const { action } = req.body;
      if (action === 'insertAgendaSection') {
        const { agendaDocId, boardMeetingDate, noteTaker, introPerson, agendaItems } = req.body;
        return res.status(200).json(await handleInsertAgendaSection(token, { agendaDocId, boardMeetingDate, noteTaker, introPerson, agendaItems }));
      }
      const { meetingLabel, year, boardMeetingDate, financialsQuery, noteTaker, introPerson, agendaItems } = req.body;
      return res.status(200).json(await handlePost(token, { meetingLabel, year, boardMeetingDate, financialsQuery, noteTaker, introPerson, agendaItems }));
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('board-prep:handler', { method: req.method, message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
