/**
 * GET  /api/payroll-review?messageId=<id>
 *   Fetches the current payroll PDF + up to 4 previous payroll PDFs from Gmail,
 *   parses each with pdf-parse, and returns parsed text for diff comparison.
 *
 * POST /api/payroll-review
 *   Body: { messageId, threadId, to, subject }
 *   Creates a Gmail draft reply: "I approve, thank you"
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
import pdfParseMod from 'pdf-parse';
const pdfParse = typeof pdfParseMod === 'function' ? pdfParseMod : pdfParseMod.default;

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

function getHeader(headers, name) {
  return (headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function findPdfAttachment(payload) {
  if (!payload) return null;
  const parts = payload.parts || [];
  for (const part of parts) {
    if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
      return { attachmentId: part.body.attachmentId, filename: part.filename || 'payroll.pdf' };
    }
    if (part.parts) {
      const nested = findPdfAttachment(part);
      if (nested) return nested;
    }
  }
  return null;
}

async function fetchMessage(token, messageId) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    console.error('payroll-review:fetchMessage', { messageId, status: res.status });
    throw new Error(`Failed to fetch message ${messageId}`);
  }
  return res.json();
}

async function fetchAndParsePdf(token, messageId, attachmentId) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    console.error('payroll-review:fetchAttachment', { messageId, attachmentId, status: res.status });
    throw new Error(`Failed to fetch attachment for message ${messageId}`);
  }
  const data = await res.json();
  // Gmail attachment data is base64url-encoded — decode to buffer for pdf-parse
  const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
  const buffer = Buffer.from(base64, 'base64');
  const parsed = await pdfParse(buffer);
  return parsed.text;
}

async function handleGet(token, messageId) {
  const currentMsg = await fetchMessage(token, messageId);
  const currentHeaders = currentMsg.payload?.headers || [];

  let currentAttachment = findPdfAttachment(currentMsg.payload);
  let attachmentMessageId = messageId;

  // The displayed message may be a reply (no PDF) — search the thread for the original with the PDF
  if (!currentAttachment && currentMsg.threadId) {
    const threadRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${currentMsg.threadId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!threadRes.ok) {
      console.error('payroll-review:fetchThread', { threadId: currentMsg.threadId, status: threadRes.status });
    } else {
      const threadData = await threadRes.json();
      for (const msg of (threadData.messages || [])) {
        const att = findPdfAttachment(msg.payload);
        if (att) { currentAttachment = att; attachmentMessageId = msg.id; break; }
      }
    }
  }

  if (!currentAttachment) {
    throw new Error('No PDF attachment found in current payroll email');
  }

  const currentText = await fetchAndParsePdf(token, attachmentMessageId, currentAttachment.attachmentId);

  // Find previous payroll approval emails (from same sender domain, same subject)
  const q = encodeURIComponent('from:@dnatsi.com subject:"Payroll Approval" has:attachment');
  const searchRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!searchRes.ok) {
    console.error('payroll-review:search', { status: searchRes.status });
    throw new Error('Failed to search for previous payroll emails');
  }
  const searchData = await searchRes.json();

  const previousIds = (searchData.messages || [])
    .map(m => m.id)
    .filter(id => id !== messageId)
    .slice(0, 4);

  const previous = [];
  for (const prevId of previousIds) {
    try {
      const msg = await fetchMessage(token, prevId);
      const headers = msg.payload?.headers || [];
      const date = getHeader(headers, 'Date');
      const attachment = findPdfAttachment(msg.payload);
      if (!attachment) continue;
      const text = await fetchAndParsePdf(token, prevId, attachment.attachmentId);
      previous.push({ messageId: prevId, date, filename: attachment.filename, text });
    } catch (e) {
      console.error('payroll-review:prevPayroll', { messageId: prevId, message: e.message });
      // skip unparseable attachments
    }
  }

  return {
    current: {
      messageId,
      date: getHeader(currentHeaders, 'Date'),
      filename: currentAttachment.filename,
      text: currentText,
    },
    previous,
  };
}

async function handlePost(token, { messageId, threadId, to, subject }) {
  const { buildRawEmail } = require('../../lib/email');
  const replySubject = (subject || '').startsWith('Re: ') ? subject : `Re: ${subject}`;
  const raw = buildRawEmail({
    to,
    subject: replySubject,
    body: 'I approve, thank you',
    inReplyTo: messageId,
    references: messageId,
  });

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { raw, threadId } }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('payroll-review:createDraft', { messageId, status: res.status, message: err.error?.message });
    throw new Error(err.error?.message || 'Failed to create approval draft');
  }
  const data = await res.json();
  return { success: true, draftId: data.id };
}

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const { messageId } = req.query;
      if (!messageId) return res.status(400).json({ error: 'Missing messageId' });
      return res.status(200).json(await handleGet(token, messageId));
    }
    if (req.method === 'POST') {
      const { messageId, threadId, to, subject } = req.body;
      if (!messageId || !to || !subject) return res.status(400).json({ error: 'Missing required fields: messageId, to, subject' });
      return res.status(200).json(await handlePost(token, { messageId, threadId, to, subject }));
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('payroll-review:handler', { method: req.method, message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
