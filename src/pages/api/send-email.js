/**
 * POST /api/send-email
 * Sends a Gmail message (new, reply, or forward) using the Gmail messages/send endpoint.
 * Supports threadId, In-Reply-To, Cc, signature append, and forwarded body inclusion.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

function buildMultipartRaw({ to, cc, bcc, subject, body, inReplyTo, references, signature, forward, originalBody, attachments }) {
  const boundary = 'ffc_fwd_boundary';
  let finalBody = body;
  if (signature) finalBody += '\n--\n' + signature;
  if (forward && originalBody) finalBody += '\n\n---------- Forwarded message ---------\n' + originalBody;

  const lines = [`To: ${to}`];
  if (cc) lines.push(`Cc: ${cc}`);
  if (bcc) lines.push(`Bcc: ${bcc}`);
  lines.push(
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  );
  if (inReplyTo) {
    lines.push(`In-Reply-To: ${inReplyTo}`);
    lines.push(`References: ${references || inReplyTo}`);
  }
  lines.push('', `--${boundary}`);
  lines.push('Content-Type: text/plain; charset=utf-8', '');
  lines.push(finalBody);

  for (const att of attachments) {
    const b64 = att.data.replace(/-/g, '+').replace(/_/g, '/');
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
    lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    lines.push('Content-Transfer-Encoding: base64', '');
    lines.push(b64);
  }
  lines.push(`--${boundary}--`);

  return Buffer.from(lines.join('\r\n')).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildRawEmail({ to, cc, bcc, subject, body, inReplyTo, references, signature, forward, originalBody, attachments }) {
  if (attachments && attachments.length > 0) {
    return buildMultipartRaw({ to, cc, bcc, subject, body, inReplyTo, references, signature, forward, originalBody, attachments });
  }
  let finalBody = body;

  // Append signature if provided
  if (signature) {
    finalBody += '\n--\n' + signature;
  }

  // For forwarded messages, add the forwarded message header and original body
  if (forward && originalBody) {
    finalBody += '\n\n---------- Forwarded message ---------\n' + originalBody;
  }

  const lines = [
    `To: ${to}`,
  ];
  if (cc) lines.push(`Cc: ${cc}`);
  if (bcc) lines.push(`Bcc: ${bcc}`);
  lines.push(
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
  );
  if (inReplyTo) {
    lines.push(`In-Reply-To: ${inReplyTo}`);
    lines.push(`References: ${references || inReplyTo}`);
  }
  lines.push('', finalBody);
  const raw = Buffer.from(lines.join('\r\n')).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return raw;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { to, cc, bcc, subject, body, threadId, inReplyTo, references, signature, forward, originalBody, forwardAttachments, originalMessageId } = req.body;

  if (!to || !body) return res.status(400).json({ error: 'Missing to or body' });

  try {
    let attachmentData = [];
    if (forwardAttachments && forwardAttachments.length > 0 && originalMessageId) {
      for (const att of forwardAttachments) {
        const ar = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${originalMessageId}/attachments/${att.attachmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (ar.ok) {
          const ad = await ar.json();
          attachmentData.push({ filename: att.filename, mimeType: att.mimeType, data: ad.data });
        } else {
          console.error('send-email:fetchAttachment', { originalMessageId, attachmentId: att.attachmentId, status: ar.status });
        }
      }
    }

    const raw = buildRawEmail({ to, cc: cc || '', bcc: bcc || '', subject: subject || '(no subject)', body, inReplyTo, references, signature, forward, originalBody, attachments: attachmentData });

    const payload = { raw };
    if (threadId) payload.threadId = threadId;

    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message || data.error });

    res.json({ success: true, messageId: data.id });
  } catch (e) {
    console.error('send-email:send', { to, subject, message: e.message });
    res.status(500).json({ error: e.message });
  }
}
