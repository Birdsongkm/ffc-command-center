/**
 * GET /api/sent-tracking
 * Scans sent emails from the last 7 days and checks which ones have not
 * received a reply within 48 hours.
 * Returns: { sentEmails: [{id, to, subject, date, hasReply, daysSince}] }
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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const h = { Authorization: `Bearer ${token}` };

  try {
    // Fetch sent emails from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const afterDate = `${sevenDaysAgo.getFullYear()}/${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}/${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;
    const q = encodeURIComponent(`in:sent after:${afterDate}`);
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=30`,
      { headers: h }
    );
    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({}));
      console.error('sent-tracking:list', { status: listRes.status, message: err.error?.message });
      return res.status(500).json({ error: err.error?.message || 'Failed to list sent emails' });
    }
    const listData = await listRes.json();
    const messages = listData.messages || [];

    // Fetch metadata for each sent email
    const sentEmails = [];
    for (const msg of messages.slice(0, 20)) {
      try {
        const mRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: h }
        );
        if (!mRes.ok) continue;
        const mData = await mRes.json();
        const getH = name => (mData.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
        const sentDate = getH('Date');
        const to = getH('To');
        const subject = getH('Subject');

        // Skip automated/internal sends
        const toAddr = to.toLowerCase();
        if (toAddr.includes('noreply') || toAddr.includes('no-reply')) continue;

        const daysSince = Math.floor((Date.now() - new Date(sentDate).getTime()) / (1000 * 60 * 60 * 24));

        // Only track emails sent 48+ hours ago
        if (daysSince < 2) continue;

        // Check for reply: search inbox for "from:<recipient> subject:<subject>"
        const recipientEmail = to.match(/[\w.-]+@[\w.-]+/)?.[0] || '';
        if (!recipientEmail) continue;
        const subjectClean = (subject || '').replace(/^(Re:\s*)+/i, '').trim();
        if (!subjectClean) continue;

        const replyQ = encodeURIComponent(`from:${recipientEmail} subject:"${subjectClean.slice(0, 60)}"`);
        const replyRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${replyQ}&maxResults=1`,
          { headers: h }
        );
        const replyData = replyRes.ok ? await replyRes.json() : {};
        const hasReply = (replyData.messages || []).length > 0;

        sentEmails.push({
          id: msg.id,
          to: recipientEmail,
          toDisplay: to,
          subject,
          date: sentDate,
          daysSince,
          hasReply,
        });
      } catch (e) {
        console.error('sent-tracking:fetchMsg', { msgId: msg.id, message: e.message });
      }
    }

    // Return only non-replied emails, sorted by days since sent (oldest first)
    const awaitingReply = sentEmails
      .filter(e => !e.hasReply)
      .sort((a, b) => b.daysSince - a.daysSince);

    return res.status(200).json({ awaitingReply, totalSent: sentEmails.length });
  } catch (error) {
    console.error('sent-tracking:handler', { message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
