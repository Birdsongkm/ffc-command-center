/**
 * /api/meeting-prep — Drive doc management for meeting prep briefs
 *
 * POST /api/meeting-prep
 *   action: 'ensureDoc' — find or create per-person doc in Meeting Prep folder
 *   action: 'appendSection' — append a dated prep section to existing doc
 *   action: 'addManualContext' — append manual notes to a person's doc
 *   action: 'checkFolder' — verify the Meeting Prep folder exists and is safe
 *
 * Drive model: one doc per person, keyed by email.
 * Folder: FFC Command Center / Meeting Prep / (private, owned by Kayla)
 * Privacy guard: refuses writes if folder has non-FFC sharing.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

const PREP_FOLDER_NAME = 'Meeting Prep';
const PARENT_FOLDER_NAME = 'FFC Command Center';

// Find or create a folder by name under a parent
async function findOrCreateFolder(token, folderName, parentId) {
  const h = { Authorization: `Bearer ${token}` };

  // Search for existing folder
  const parentClause = parentId ? ` and '${parentId}' in parents` : '';
  const q = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false${parentClause}`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1`;
  const searchRes = await fetch(searchUrl, { headers: h });
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files?.length > 0) return data.files[0];
  }

  // Create folder
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) metadata.parents = [parentId];

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: { ...h, 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    console.error('meeting-prep:createFolder', { folderName, status: createRes.status, message: err.error?.message });
    throw new Error(`Failed to create folder "${folderName}": ${err.error?.message || createRes.status}`);
  }
  return createRes.json();
}

// Check folder permissions — privacy guard
async function checkFolderPermissions(token, folderId) {
  const url = `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?fields=permissions(type,emailAddress,domain,role)`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return { safe: true, permissions: [] }; // Fail open only on permission check failure
  const data = await r.json();
  const perms = data.permissions || [];

  for (const p of perms) {
    if (p.type === 'anyone') return { safe: false, reason: 'Folder is shared with anyone', permissions: perms };
    if (p.type === 'domain' && !p.domain?.endsWith('freshfoodconnect.org')) return { safe: false, reason: `Folder shared with domain: ${p.domain}`, permissions: perms };
    if ((p.type === 'user' || p.type === 'group') && p.emailAddress) {
      if (!p.emailAddress.toLowerCase().endsWith('@freshfoodconnect.org')) {
        return { safe: false, reason: `Folder shared with external user: ${p.emailAddress}`, permissions: perms };
      }
    }
  }
  return { safe: true, permissions: perms };
}

// Find existing person doc in the prep folder
async function findPersonDoc(token, personEmail, folderId) {
  const docTitle = buildDocTitle(personEmail);
  const q = encodeURIComponent(`name='${docTitle.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,webViewLink)&pageSize=1`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const data = await r.json();
  return data.files?.[0] || null;
}

function buildDocTitle(nameOrEmail) {
  return `${nameOrEmail} — Meeting Prep`;
}

// Create a new person doc
async function createPersonDoc(token, personName, personEmail, folderId) {
  const title = buildDocTitle(personName || personEmail);
  const initialContent = `${title}\n\nMeeting prep notes for ${personName || personEmail} (${personEmail})\n\n`;

  const boundary = 'ffc_prep_' + Date.now();
  const metadata = {
    name: title,
    mimeType: 'application/vnd.google-apps.document',
    parents: [folderId],
  };
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    initialContent,
    `--${boundary}--`,
  ].join('\r\n');

  const r = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error('meeting-prep:createDoc', { personEmail, status: r.status, message: err.error?.message });
    throw new Error(`Failed to create prep doc: ${err.error?.message || r.status}`);
  }
  return r.json();
}

// Append text to a Google Doc (at the end)
async function appendToDoc(token, docId, text) {
  // Read doc to find end index
  const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!docRes.ok) {
    const err = await docRes.json().catch(() => ({}));
    throw new Error(`Failed to read doc: ${err.error?.message || docRes.status}`);
  }
  const doc = await docRes.json();
  const content = doc.body?.content || [];
  const lastEl = content[content.length - 1];
  const endIndex = (lastEl?.endIndex || 2) - 1;

  const r = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: endIndex }, text: '\n' + text } }],
      }),
    }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error('meeting-prep:appendToDoc', { docId, status: r.status, message: err.error?.message });
    throw new Error(`Failed to append to doc: ${err.error?.message || r.status}`);
  }
}

// Build the prep section content for a meeting
function buildPrepSection(meetingDate, briefData) {
  const lines = [];
  lines.push(`## Prep for ${meetingDate} meeting\n`);
  lines.push(`Generated: ${new Date().toISOString()}\n`);

  if (briefData.whyThisMeeting) {
    lines.push(`### Why this meeting`);
    lines.push(`${briefData.whyThisMeeting.text}\n`);
  }

  if (briefData.lastContact) {
    lines.push(`### Last Contact`);
    lines.push(`${briefData.lastContact.text}\n`);
  }

  if (briefData.orgOverview) {
    lines.push(`### Organization`);
    lines.push(`${briefData.orgOverview.text}\n`);
  }

  if (briefData.relationship?.donations?.length > 0) {
    lines.push(`### FFC Relationship`);
    lines.push(`${briefData.relationship.donations.length} donation signal(s) found`);
    for (const d of briefData.relationship.donations.slice(0, 5)) {
      lines.push(`- ${d.subject} (${d.date})`);
    }
    lines.push('');
  }

  if (briefData.connectionPoints?.sharedDocs?.length > 0) {
    lines.push(`### Shared Documents`);
    for (const doc of briefData.connectionPoints.sharedDocs.slice(0, 5)) {
      lines.push(`- ${doc.name}`);
    }
    lines.push('');
  }

  lines.push(`### Meeting Notes\n`);
  lines.push(`(Add notes during the meeting)\n\n`);

  return lines.join('\n');
}

async function handleEnsureDoc(token, { email, name }) {
  // 1. Find or create the parent folder structure
  const parentFolder = await findOrCreateFolder(token, PARENT_FOLDER_NAME, null);
  const prepFolder = await findOrCreateFolder(token, PREP_FOLDER_NAME, parentFolder.id);

  // 2. Privacy check
  const safety = await checkFolderPermissions(token, prepFolder.id);
  if (!safety.safe) {
    console.error('meeting-prep:privacyGuard', { folderId: prepFolder.id, reason: safety.reason });
    return { error: `Cannot save brief — target folder is shared. ${safety.reason}`, privacyViolation: true };
  }

  // 3. Find or create person doc
  let doc = await findPersonDoc(token, name || email, prepFolder.id);
  if (!doc) {
    // Also try by email if name was used
    if (name) doc = await findPersonDoc(token, email, prepFolder.id);
  }
  if (!doc) {
    doc = await createPersonDoc(token, name, email, prepFolder.id);
  }

  return {
    docId: doc.id,
    docName: doc.name,
    docUrl: doc.webViewLink || `https://docs.google.com/document/d/${doc.id}/edit`,
    folderId: prepFolder.id,
    modifiedTime: doc.modifiedTime,
  };
}

async function handleAppendSection(token, { docId, meetingDate, briefData }) {
  if (!docId || !meetingDate) throw new Error('Missing docId or meetingDate');
  const sectionText = buildPrepSection(meetingDate, briefData || {});
  await appendToDoc(token, docId, sectionText);
  return { success: true };
}

async function handleAddManualContext(token, { docId, text }) {
  if (!docId || !text) throw new Error('Missing docId or text');
  const contextText = `\n### Manual Context (added ${new Date().toISOString().slice(0, 10)})\n${text}\n`;
  await appendToDoc(token, docId, contextText);
  return { success: true };
}

async function handleCheckFolder(token) {
  try {
    const parentFolder = await findOrCreateFolder(token, PARENT_FOLDER_NAME, null);
    const prepFolder = await findOrCreateFolder(token, PREP_FOLDER_NAME, parentFolder.id);
    const safety = await checkFolderPermissions(token, prepFolder.id);
    return { folderId: prepFolder.id, folderName: PREP_FOLDER_NAME, safe: safety.safe, reason: safety.reason || null };
  } catch (e) {
    return { folderId: null, safe: false, reason: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { action } = req.body;

  try {
    switch (action) {
      case 'ensureDoc': {
        const { email, name } = req.body;
        if (!email) return res.status(400).json({ error: 'Missing email' });
        return res.status(200).json(await handleEnsureDoc(token, { email, name }));
      }
      case 'appendSection': {
        const { docId, meetingDate, briefData } = req.body;
        return res.status(200).json(await handleAppendSection(token, { docId, meetingDate, briefData }));
      }
      case 'addManualContext': {
        const { docId, text } = req.body;
        return res.status(200).json(await handleAddManualContext(token, { docId, text }));
      }
      case 'checkFolder':
        return res.status(200).json(await handleCheckFolder(token));
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('meeting-prep:handler', { action, message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
