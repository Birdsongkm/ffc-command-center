/**
 * Builds a base64url-encoded raw email for the Gmail send API.
 */
function buildRawEmail({ to, cc, subject, body, html, inReplyTo, references, signature, forward, originalBody }) {
  let finalBody = html || body;
  const contentType = html ? 'text/html' : 'text/plain';

  if (!html && signature) {
    finalBody += '\n--\n' + signature;
  }

  if (!html && forward && originalBody) {
    finalBody += '\n\n---------- Forwarded message ---------\n' + originalBody;
  }

  const lines = [`To: ${to}`];
  if (cc) lines.push(`Cc: ${cc}`);
  lines.push(
    `Subject: ${subject}`,
    `Content-Type: ${contentType}; charset=utf-8`,
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

module.exports = { buildRawEmail };
