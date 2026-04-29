/**
 * POST /api/drive-note
 * Finds a staff member's 1:1 Google Doc in Drive and adds a bullet to the
 * next upcoming meeting section. If no future-dated section exists, creates one
 * following the doc's existing formatting.
 * Body: personName (required), note (required), docName (optional).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

// Common date formats found in meeting docs
const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH_SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

/**
 * Try to parse a date from a heading/line like:
 *   "April 14, 2026", "4/14/2026", "Apr 14", "Monday, April 14, 2026"
 * Returns a Date object or null.
 */
function parseDateFromText(text) {
  const clean = text.replace(/^[•\-–—*#\s]+/, '').trim();

  // "Month Day, Year" or "Month Day Year"
  const longMatch = clean.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})?/i);
  if (longMatch) {
    const mIdx = MONTH_NAMES.indexOf(longMatch[1].toLowerCase());
    const mShort = MONTH_SHORT.indexOf(longMatch[1].toLowerCase().slice(0, 3));
    const mi = mIdx !== -1 ? mIdx : mShort;
    if (mi !== -1) {
      const year = longMatch[3] ? parseInt(longMatch[3]) : new Date().getFullYear();
      const d = new Date(year, mi, parseInt(longMatch[2]));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // "M/D/YYYY" or "M/D/YY" or "M-D-YYYY"
  const slashMatch = clean.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashMatch) {
    let year = parseInt(slashMatch[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Scan doc content for a section with a future date.
 * Returns { found: true, insertIndex, sectionHeading } or { found: false }.
 *
 * Logic: walk through paragraphs looking for headings or bold lines that contain
 * a parseable date. If that date is today or in the future, that's where we add bullets.
 */
function findFutureSection(doc) {
  const body = doc.body?.content || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const elem of body) {
    if (!elem.paragraph) continue;
    const para = elem.paragraph;
    const text = (para.elements || []).map(e => e.textRun?.content || '').join('').trim();
    if (!text) continue;

    const date = parseDateFromText(text);
    if (!date) continue;

    // Check if this date is today or in the future
    if (date >= today) {
      // Find the end of this section's content — insert before the next heading or at end of bullets
      const endIndex = elem.endIndex;

      // Walk forward to find the last bullet/line in this section
      let insertAt = endIndex;
      const elemIdx = body.indexOf(elem);
      for (let i = elemIdx + 1; i < body.length; i++) {
        const next = body[i];
        if (!next.paragraph) break;
        const nextText = (next.paragraph.elements || []).map(e => e.textRun?.content || '').join('').trim();
        // If we hit another date heading or an empty line followed by a date, stop
        if (nextText && parseDateFromText(nextText)) break;
        // If this is a bullet or content line, extend our insert point past it
        if (nextText) {
          insertAt = next.endIndex;
        } else {
          // Empty line — this might be the section break
          insertAt = next.startIndex;
          break;
        }
      }

      return { found: true, insertIndex: insertAt - 1, sectionHeading: text, date };
    }
  }

  return { found: false };
}

/**
 * Detect the bullet style used in the doc (looking at existing bullets).
 */
function detectBulletPrefix(doc) {
  const body = doc.body?.content || [];
  for (const elem of body) {
    if (!elem.paragraph) continue;
    const text = (elem.paragraph.elements || []).map(e => e.textRun?.content || '').join('');
    // Check for common bullet patterns
    if (text.match(/^\s*[•]\s/)) return '• ';
    if (text.match(/^\s*[-]\s/)) return '- ';
    if (text.match(/^\s*[*]\s/)) return '* ';
    if (elem.paragraph.bullet) return ''; // Native Google Docs bullets — we'll use the list
  }
  return '• '; // default
}

/**
 * Look at existing date-containing paragraphs and return their named style
 * (e.g. HEADING_2, HEADING_3) so new sections match.
 */
function findExistingDateStyle(doc) {
  const body = doc.body?.content || [];
  for (const elem of body) {
    if (!elem.paragraph) continue;
    const text = (elem.paragraph.elements || []).map(e => e.textRun?.content || '').join('').trim();
    if (!text) continue;
    const date = parseDateFromText(text);
    if (date) {
      return elem.paragraph.paragraphStyle?.namedStyleType || 'NORMAL_TEXT';
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { personName, note, docName, docId } = req.body;
  if (!personName || !note) return res.status(400).json({ error: 'Missing personName or note' });

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const firstName = personName.split(' ')[0];

  try {
    let file;
    if (docId) {
      // Direct doc ID — no search needed
      file = { id: docId, name: docName || 'Linked Doc' };
    } else {
      // Search Drive for 1:1 doc — use flexible contains search for each word
      const searchTerm = docName || `1:1 ${firstName}`;
      let nameFilter;
      if (docName) {
        const words = docName.split(/[\s&,\-:]+/).filter(w => w.length > 1);
        nameFilter = words.map(w => `name contains "${w}"`).join(' and ');
      } else {
        nameFilter = `name contains "1:1" and name contains "${firstName}"`;
      }
      const query = encodeURIComponent(`${nameFilter} and mimeType='application/vnd.google-apps.document' and trashed=false`);
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=5`,
        { headers: h }
      );
      if (!searchRes.ok) {
        const err = await searchRes.json().catch(() => ({}));
        const msg = err.error?.message || err.message || 'Drive search failed';
        console.error('drive-note:search', { firstName, status: searchRes.status, message: msg });
        return res.status(502).json({ error: msg });
      }
      const searchData = await searchRes.json();
      file = searchData.files?.[0];
      if (!file) return res.status(404).json({ error: `No 1:1 doc found for "${firstName}" — looked for "${searchTerm}" in your Drive` });
    }

    // Read the document content
    const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${file.id}`, { headers: h });
    if (!docRes.ok) {
      const err = await docRes.json().catch(() => ({}));
      console.error('drive-note:readDoc', { fileId: file.id, status: docRes.status, message: err.error?.message });
      return res.status(502).json({ error: err.error?.message || 'Failed to read document' });
    }
    const doc = await docRes.json();

    const futureSection = findFutureSection(doc);
    const bulletPrefix = detectBulletPrefix(doc);
    let requests;

    // Find the style of an existing date heading in the doc to replicate it
    const existingDateStyle = findExistingDateStyle(doc);

    if (futureSection.found) {
      // Append bullet to existing future section
      const bulletText = `\n${bulletPrefix}${note}`;
      requests = [{
        insertText: {
          location: { index: futureSection.insertIndex },
          text: bulletText,
        },
      }];
    } else {
      // No future section — create a new section matching existing format
      // Insert after the doc title: find the first content paragraph's start
      const body = doc.body?.content || [];
      let insertIdx = 1;
      // Skip past the title (first paragraph) to insert after it
      for (const elem of body) {
        if (elem.paragraph) {
          insertIdx = elem.endIndex;
          break;
        }
      }

      const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const headingText = `${dateStr}\n`;
      const bulletText = `${bulletPrefix}${note}\n\n`;

      requests = [
        {
          insertText: {
            location: { index: insertIdx },
            text: `\n${headingText}${bulletText}`,
          },
        },
      ];

      // If existing date headings use a specific named style (e.g. HEADING_3), apply it
      if (existingDateStyle && existingDateStyle !== 'NORMAL_TEXT') {
        requests.push({
          updateParagraphStyle: {
            range: { startIndex: insertIdx + 1, endIndex: insertIdx + 1 + headingText.length },
            paragraphStyle: { namedStyleType: existingDateStyle },
            fields: 'namedStyleType',
          },
        });
      }
    }

    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${file.id}:batchUpdate`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ requests }),
    });
    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      const msg = err.error?.message || err.message || 'Failed to update document';
      console.error('drive-note:update', { fileId: file.id, docName: file.name, status: updateRes.status, message: msg });
      return res.status(502).json({ error: msg });
    }

    const action = futureSection.found
      ? `Added to "${futureSection.sectionHeading}" in ${file.name}`
      : `Created new section in ${file.name}`;

    return res.status(200).json({ ok: true, docName: file.name, docId: file.id, action });
  } catch (error) {
    console.error('drive-note:error', { personName, message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
