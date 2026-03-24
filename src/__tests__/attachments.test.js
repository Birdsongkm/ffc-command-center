/**
 * Forward with attachments — issue #85
 * Tests: extractAttachments, getDefaultSelectedAttachmentIds,
 *        filterSelectedAttachments, buildMultipartRaw MIME structure.
 */

// Duplicated inline per project pattern

function extractAttachments(payload) {
  if (!payload || !payload.parts) return [];
  const result = [];
  function walk(parts) {
    for (const part of parts) {
      if (part.parts) { walk(part.parts); continue; }
      if (part.filename && part.body && part.body.attachmentId) {
        result.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          attachmentId: part.body.attachmentId,
          size: part.body.size || 0,
        });
      }
    }
  }
  walk(payload.parts);
  return result;
}

function getDefaultSelectedAttachmentIds(attachments) {
  return attachments.map(a => a.attachmentId);
}

function filterSelectedAttachments(attachments, selectedIds) {
  return attachments.filter(a => selectedIds.includes(a.attachmentId));
}

const BOUNDARY = 'ffc_fwd_boundary';

function buildMultipartRaw({ to, cc, bcc, subject, body, inReplyTo, references, signature, forward, originalBody, attachments }) {
  let finalBody = body;
  if (signature) finalBody += '\n--\n' + signature;
  if (forward && originalBody) finalBody += '\n\n---------- Forwarded message ---------\n' + originalBody;

  const lines = [`To: ${to}`];
  if (cc) lines.push(`Cc: ${cc}`);
  if (bcc) lines.push(`Bcc: ${bcc}`);
  lines.push(
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${BOUNDARY}"`,
  );
  if (inReplyTo) {
    lines.push(`In-Reply-To: ${inReplyTo}`);
    lines.push(`References: ${references || inReplyTo}`);
  }
  lines.push('', `--${BOUNDARY}`);
  lines.push('Content-Type: text/plain; charset=utf-8', '');
  lines.push(finalBody);

  for (const att of attachments) {
    const b64 = att.data.replace(/-/g, '+').replace(/_/g, '/');
    lines.push(`--${BOUNDARY}`);
    lines.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
    lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    lines.push('Content-Transfer-Encoding: base64', '');
    lines.push(b64);
  }
  lines.push(`--${BOUNDARY}--`);

  return Buffer.from(lines.join('\r\n')).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeRaw(raw) {
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (raw.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

// ── extractAttachments ────────────────────────────────────────────────────────

describe('extractAttachments', () => {
  test('returns [] when payload has no parts', () => {
    expect(extractAttachments({ body: { data: 'abc' } })).toEqual([]);
  });

  test('returns [] for null payload', () => {
    expect(extractAttachments(null)).toEqual([]);
  });

  test('returns [] when all parts are text/plain or text/html', () => {
    const payload = {
      parts: [
        { mimeType: 'text/plain', body: { data: 'abc' } },
        { mimeType: 'text/html', body: { data: '<p>abc</p>' } },
      ],
    };
    expect(extractAttachments(payload)).toEqual([]);
  });

  test('extracts a single attachment', () => {
    const payload = {
      parts: [
        { mimeType: 'text/plain', body: { data: 'abc' } },
        { mimeType: 'application/pdf', filename: 'report.pdf', body: { attachmentId: 'attach_123', size: 5000 } },
      ],
    };
    const result = extractAttachments(payload);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ filename: 'report.pdf', mimeType: 'application/pdf', attachmentId: 'attach_123', size: 5000 });
  });

  test('extracts multiple attachments', () => {
    const payload = {
      parts: [
        { mimeType: 'text/plain', body: { data: 'abc' } },
        { mimeType: 'application/pdf', filename: 'a.pdf', body: { attachmentId: 'id1', size: 100 } },
        { mimeType: 'image/jpeg', filename: 'photo.jpg', body: { attachmentId: 'id2', size: 200 } },
      ],
    };
    const result = extractAttachments(payload);
    expect(result).toHaveLength(2);
    expect(result.map(a => a.filename)).toEqual(['a.pdf', 'photo.jpg']);
  });

  test('handles nested multipart parts', () => {
    const payload = {
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: 'abc' } },
            { mimeType: 'text/html', body: { data: '<p>abc</p>' } },
          ],
        },
        { mimeType: 'application/pdf', filename: 'nested.pdf', body: { attachmentId: 'nested_id', size: 300 } },
      ],
    };
    const result = extractAttachments(payload);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('nested.pdf');
    expect(result[0].attachmentId).toBe('nested_id');
  });

  test('ignores parts without filename', () => {
    const payload = {
      parts: [
        { mimeType: 'application/pdf', body: { attachmentId: 'id1', size: 100 } },
      ],
    };
    expect(extractAttachments(payload)).toEqual([]);
  });

  test('ignores parts without attachmentId', () => {
    const payload = {
      parts: [
        { mimeType: 'application/pdf', filename: 'doc.pdf', body: { data: 'abc' } },
      ],
    };
    expect(extractAttachments(payload)).toEqual([]);
  });

  test('uses fallback mimeType when not provided', () => {
    const payload = {
      parts: [
        { filename: 'doc.bin', body: { attachmentId: 'bin_id', size: 50 } },
      ],
    };
    const result = extractAttachments(payload);
    expect(result[0].mimeType).toBe('application/octet-stream');
  });

  test('size defaults to 0 when not provided', () => {
    const payload = {
      parts: [
        { mimeType: 'application/pdf', filename: 'doc.pdf', body: { attachmentId: 'id1' } },
      ],
    };
    expect(extractAttachments(payload)[0].size).toBe(0);
  });
});

// ── getDefaultSelectedAttachmentIds ──────────────────────────────────────────

describe('getDefaultSelectedAttachmentIds', () => {
  test('returns all attachment IDs — all pre-selected by default', () => {
    const attachments = [
      { filename: 'a.pdf', attachmentId: 'id1', mimeType: 'application/pdf', size: 100 },
      { filename: 'b.docx', attachmentId: 'id2', mimeType: 'application/docx', size: 200 },
    ];
    expect(getDefaultSelectedAttachmentIds(attachments)).toEqual(['id1', 'id2']);
  });

  test('returns [] for empty attachments', () => {
    expect(getDefaultSelectedAttachmentIds([])).toEqual([]);
  });

  test('works with a single attachment', () => {
    const attachments = [{ filename: 'x.png', attachmentId: 'solo_id', mimeType: 'image/png', size: 50 }];
    expect(getDefaultSelectedAttachmentIds(attachments)).toEqual(['solo_id']);
  });
});

// ── filterSelectedAttachments ─────────────────────────────────────────────────

describe('filterSelectedAttachments', () => {
  const attachments = [
    { attachmentId: 'id1', filename: 'a.pdf', mimeType: 'application/pdf', size: 100 },
    { attachmentId: 'id2', filename: 'b.jpg', mimeType: 'image/jpeg', size: 200 },
    { attachmentId: 'id3', filename: 'c.docx', mimeType: 'application/docx', size: 300 },
  ];

  test('returns all when all are selected', () => {
    expect(filterSelectedAttachments(attachments, ['id1', 'id2', 'id3'])).toHaveLength(3);
  });

  test('excludes deselected attachment', () => {
    const result = filterSelectedAttachments(attachments, ['id1', 'id3']);
    expect(result).toHaveLength(2);
    expect(result.map(a => a.filename)).toEqual(['a.pdf', 'c.docx']);
  });

  test('returns [] when none selected', () => {
    expect(filterSelectedAttachments(attachments, [])).toEqual([]);
  });

  test('returns single attachment when only one selected', () => {
    const result = filterSelectedAttachments(attachments, ['id2']);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('b.jpg');
  });

  test('does not mutate original array', () => {
    const copy = [...attachments];
    filterSelectedAttachments(attachments, ['id1']);
    expect(attachments).toEqual(copy);
  });
});

// ── buildMultipartRaw ─────────────────────────────────────────────────────────

describe('buildMultipartRaw', () => {
  const pdfData = Buffer.from('fake pdf content').toString('base64');

  test('output decodes to multipart/mixed content type', () => {
    const raw = buildMultipartRaw({
      to: 'recipient@example.com', subject: 'Fwd: Test', body: 'Hello',
      attachments: [{ filename: 'doc.pdf', mimeType: 'application/pdf', data: pdfData }],
    });
    expect(decodeRaw(raw)).toContain('Content-Type: multipart/mixed');
  });

  test('output contains boundary declaration', () => {
    const raw = buildMultipartRaw({
      to: 'recipient@example.com', subject: 'Fwd: Test', body: 'Hello',
      attachments: [{ filename: 'doc.pdf', mimeType: 'application/pdf', data: pdfData }],
    });
    expect(decodeRaw(raw)).toContain(`boundary="${BOUNDARY}"`);
  });

  test('output contains text/plain part', () => {
    const raw = buildMultipartRaw({
      to: 'recipient@example.com', subject: 'Fwd: Test', body: 'My forward body',
      attachments: [{ filename: 'doc.pdf', mimeType: 'application/pdf', data: pdfData }],
    });
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('Content-Type: text/plain; charset=utf-8');
    expect(decoded).toContain('My forward body');
  });

  test('output contains attachment Content-Disposition', () => {
    const raw = buildMultipartRaw({
      to: 'recipient@example.com', subject: 'Fwd: Test', body: 'Hello',
      attachments: [{ filename: 'report.pdf', mimeType: 'application/pdf', data: pdfData }],
    });
    expect(decodeRaw(raw)).toContain('Content-Disposition: attachment; filename="report.pdf"');
  });

  test('output contains attachment Content-Type with filename', () => {
    const raw = buildMultipartRaw({
      to: 'a@b.com', subject: 'Fwd', body: 'Body',
      attachments: [{ filename: 'photo.jpg', mimeType: 'image/jpeg', data: pdfData }],
    });
    expect(decodeRaw(raw)).toContain('Content-Type: image/jpeg; name="photo.jpg"');
  });

  test('output contains terminating boundary', () => {
    const raw = buildMultipartRaw({
      to: 'a@b.com', subject: 'Fwd', body: 'Body',
      attachments: [{ filename: 'doc.pdf', mimeType: 'application/pdf', data: pdfData }],
    });
    expect(decodeRaw(raw)).toContain(`--${BOUNDARY}--`);
  });

  test('includes forwarded message body when forward=true', () => {
    const raw = buildMultipartRaw({
      to: 'a@b.com', subject: 'Fwd', body: 'My reply',
      forward: true, originalBody: 'Original snippet',
      attachments: [{ filename: 'doc.pdf', mimeType: 'application/pdf', data: pdfData }],
    });
    expect(decodeRaw(raw)).toContain('Forwarded message');
    expect(decodeRaw(raw)).toContain('Original snippet');
  });

  test('includes multiple attachments', () => {
    const raw = buildMultipartRaw({
      to: 'a@b.com', subject: 'Fwd', body: 'Body',
      attachments: [
        { filename: 'a.pdf', mimeType: 'application/pdf', data: pdfData },
        { filename: 'b.jpg', mimeType: 'image/jpeg', data: pdfData },
      ],
    });
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('filename="a.pdf"');
    expect(decoded).toContain('filename="b.jpg"');
  });

  test('converts base64url attachment data to standard base64', () => {
    // base64url uses - and _ instead of + and /
    const b64url = 'abc-def_ghi';
    const raw = buildMultipartRaw({
      to: 'a@b.com', subject: 'Fwd', body: 'Body',
      attachments: [{ filename: 'f.bin', mimeType: 'application/octet-stream', data: b64url }],
    });
    const decoded = decodeRaw(raw);
    // After conversion, - → + and _ → /
    expect(decoded).toContain('abc+def/ghi');
  });

  test('includes To header', () => {
    const raw = buildMultipartRaw({
      to: 'target@example.com', subject: 'Fwd', body: 'Body',
      attachments: [{ filename: 'f.pdf', mimeType: 'application/pdf', data: pdfData }],
    });
    expect(decodeRaw(raw)).toContain('To: target@example.com');
  });

  test('includes Cc header when provided', () => {
    const raw = buildMultipartRaw({
      to: 'a@b.com', cc: 'c@d.com', subject: 'Fwd', body: 'Body',
      attachments: [{ filename: 'f.pdf', mimeType: 'application/pdf', data: pdfData }],
    });
    expect(decodeRaw(raw)).toContain('Cc: c@d.com');
  });

  test('includes In-Reply-To header when provided', () => {
    const raw = buildMultipartRaw({
      to: 'a@b.com', subject: 'Fwd', body: 'Body',
      inReplyTo: '<msg123@mail.example.com>',
      attachments: [{ filename: 'f.pdf', mimeType: 'application/pdf', data: pdfData }],
    });
    expect(decodeRaw(raw)).toContain('In-Reply-To: <msg123@mail.example.com>');
  });
});
