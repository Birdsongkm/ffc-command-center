/**
 * Gmail Improvements — BCC field + Reply/Reply-All toggle
 *
 * Tests for:
 * - buildRawEmail({ to, cc, bcc, subject, body, ... }) → includes Bcc header when provided
 * - buildComposeInitialCc(mode, email) → returns empty string (reply = sender only by default)
 * - buildReplyAllCc(email) → returns To + CC recipients for reply-all
 * - stripOwnAddress(ccStr, ownEmail) → removes own email from CC
 */

// ── buildRawEmail (BCC support) ────────────────────────────────────────────────
// Mirrors the logic in src/pages/api/send-email.js
function buildRawEmail({ to, cc, bcc, subject, body, inReplyTo, references, signature, forward, originalBody }) {
  let finalBody = body;

  if (signature) {
    finalBody += '\n--\n' + signature;
  }

  if (forward && originalBody) {
    finalBody += '\n\n---------- Forwarded message ---------\n' + originalBody;
  }

  const lines = [`To: ${to}`];
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

function decodeRaw(raw) {
  // Reverse the base64url encoding to get the raw email string
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf-8');
}

describe("buildRawEmail — BCC header", () => {
  test("no BCC provided — Bcc header absent", () => {
    const raw = buildRawEmail({ to: "a@b.com", cc: "", bcc: "", subject: "Hi", body: "Hello" });
    const decoded = decodeRaw(raw);
    expect(decoded).not.toMatch(/^Bcc:/m);
  });

  test("BCC provided — Bcc header present", () => {
    const raw = buildRawEmail({ to: "a@b.com", cc: "", bcc: "boss@org.com", subject: "Hi", body: "Hello" });
    const decoded = decodeRaw(raw);
    expect(decoded).toMatch(/^Bcc: boss@org\.com/m);
  });

  test("BCC after CC in header order", () => {
    const raw = buildRawEmail({ to: "a@b.com", cc: "c@d.com", bcc: "boss@org.com", subject: "Hi", body: "Hello" });
    const decoded = decodeRaw(raw);
    const ccIdx = decoded.indexOf('Cc:');
    const bccIdx = decoded.indexOf('Bcc:');
    expect(ccIdx).toBeGreaterThan(-1);
    expect(bccIdx).toBeGreaterThan(ccIdx);
  });

  test("BCC with multiple addresses", () => {
    const raw = buildRawEmail({ to: "a@b.com", bcc: "boss@org.com, board@org.com", subject: "Hi", body: "Hello" });
    const decoded = decodeRaw(raw);
    expect(decoded).toMatch(/^Bcc: boss@org\.com, board@org\.com/m);
  });

  test("To header always present", () => {
    const raw = buildRawEmail({ to: "recipient@example.com", subject: "Test", body: "Body" });
    const decoded = decodeRaw(raw);
    expect(decoded).toMatch(/^To: recipient@example\.com/m);
  });

  test("signature appended to body", () => {
    const raw = buildRawEmail({ to: "a@b.com", subject: "Hi", body: "Hello", signature: "Kayla" });
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('--\nKayla');
  });

  test("forward appends original body", () => {
    const raw = buildRawEmail({ to: "a@b.com", subject: "Fwd: Hi", body: "See below", forward: true, originalBody: "Original content" });
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('Forwarded message');
    expect(decoded).toContain('Original content');
  });
});

// ── buildComposeInitialCc ──────────────────────────────────────────────────────
// In reply mode: default CC is empty (reply-to-sender only, not reply-all).
// In compose or forward mode: CC is always empty.
// This corrects the Sprint #74 behaviour which pre-filled CC on every reply.
function buildComposeInitialCc(mode, email) {
  // Only reply mode ever pre-fills CC — and only if user explicitly clicks Reply-All.
  // Default: empty string.
  if (mode !== 'reply') return '';
  return ''; // Reply defaults to reply-to-sender
}

describe("buildComposeInitialCc — reply-to-sender default", () => {
  const email = {
    from: "donor@example.com",
    to: "kayla@freshfoodconnect.org, alice@example.com",
    cc: "bob@example.com",
    replyTo: "",
  };

  test("compose mode returns empty CC", () => {
    expect(buildComposeInitialCc('compose', null)).toBe('');
  });

  test("forward mode returns empty CC", () => {
    expect(buildComposeInitialCc('forward', email)).toBe('');
  });

  test("reply mode returns empty CC (reply-to-sender is default)", () => {
    expect(buildComposeInitialCc('reply', email)).toBe('');
  });

  test("reply mode with null email returns empty CC", () => {
    expect(buildComposeInitialCc('reply', null)).toBe('');
  });
});

// ── buildReplyAllCc ────────────────────────────────────────────────────────────
// When user clicks "Reply All", compute the CC field from the original email's
// To and CC fields, excluding the ED's own address.
function buildReplyAllCc(email, ownEmail) {
  if (!email) return '';
  const toAddrs = (email.to || '').split(',').map(s => s.trim()).filter(Boolean);
  const ccAddrs = (email.cc || '').split(',').map(s => s.trim()).filter(Boolean);
  const allAddrs = [...toAddrs, ...ccAddrs];
  // Exclude own email (case-insensitive)
  const own = (ownEmail || '').toLowerCase();
  const filtered = allAddrs.filter(addr => {
    const emailMatch = addr.match(/<(.+)>/);
    const addrEmail = emailMatch ? emailMatch[1].toLowerCase() : addr.toLowerCase();
    return addrEmail !== own;
  });
  return filtered.join(', ');
}

describe("buildReplyAllCc", () => {
  test("null email returns empty string", () => {
    expect(buildReplyAllCc(null, 'kayla@freshfoodconnect.org')).toBe('');
  });

  test("combines To and CC fields", () => {
    const email = { to: "alice@example.com", cc: "bob@example.com" };
    const result = buildReplyAllCc(email, 'kayla@freshfoodconnect.org');
    expect(result).toContain('alice@example.com');
    expect(result).toContain('bob@example.com');
  });

  test("own email excluded from CC (plain address)", () => {
    const email = { to: "kayla@freshfoodconnect.org, alice@example.com", cc: "" };
    const result = buildReplyAllCc(email, 'kayla@freshfoodconnect.org');
    expect(result).not.toContain('kayla@freshfoodconnect.org');
    expect(result).toContain('alice@example.com');
  });

  test("own email excluded from CC (angle-bracket format)", () => {
    const email = { to: "Kayla Birdsong <kayla@freshfoodconnect.org>, Alice <alice@example.com>", cc: "" };
    const result = buildReplyAllCc(email, 'kayla@freshfoodconnect.org');
    expect(result).not.toContain('kayla@freshfoodconnect.org');
    expect(result).toContain('Alice <alice@example.com>');
  });

  test("case-insensitive own email exclusion", () => {
    const email = { to: "KAYLA@FRESHFOODCONNECT.ORG, alice@example.com", cc: "" };
    const result = buildReplyAllCc(email, 'kayla@freshfoodconnect.org');
    expect(result).not.toMatch(/kayla@freshfoodconnect\.org/i);
  });

  test("no CC field — only To used", () => {
    const email = { to: "alice@example.com", cc: "" };
    const result = buildReplyAllCc(email, 'kayla@freshfoodconnect.org');
    expect(result).toBe('alice@example.com');
  });

  test("empty To and CC returns empty string", () => {
    const email = { to: "", cc: "" };
    const result = buildReplyAllCc(email, 'kayla@freshfoodconnect.org');
    expect(result).toBe('');
  });

  test("no ownEmail — nothing excluded", () => {
    const email = { to: "alice@example.com", cc: "bob@example.com" };
    const result = buildReplyAllCc(email, '');
    expect(result).toContain('alice@example.com');
    expect(result).toContain('bob@example.com');
  });
});

// ── validateBcc ────────────────────────────────────────────────────────────────
// Validates BCC field: must be empty OR contain valid email addresses.
// Returns true if valid, false if any address is malformed.
function validateBcc(bcc) {
  if (!bcc || !bcc.trim()) return true; // empty is valid
  const parts = bcc.split(',').map(s => s.trim()).filter(Boolean);
  return parts.every(part => {
    // Accept "Name <email>" or plain "email"
    const match = part.match(/<(.+)>$/);
    const addr = match ? match[1] : part;
    return addr.includes('@') && addr.includes('.');
  });
}

describe("validateBcc", () => {
  test("empty string is valid", () => {
    expect(validateBcc('')).toBe(true);
    expect(validateBcc(null)).toBe(true);
    expect(validateBcc(undefined)).toBe(true);
  });

  test("single valid email is valid", () => {
    expect(validateBcc('boss@example.com')).toBe(true);
  });

  test("multiple valid emails are valid", () => {
    expect(validateBcc('boss@example.com, board@org.com')).toBe(true);
  });

  test("name + angle-bracket email is valid", () => {
    expect(validateBcc('John Doe <john@example.com>')).toBe(true);
  });

  test("address without @ is invalid", () => {
    expect(validateBcc('notanemail')).toBe(false);
  });

  test("mix of valid and invalid is invalid", () => {
    expect(validateBcc('boss@example.com, notanemail')).toBe(false);
  });
});
