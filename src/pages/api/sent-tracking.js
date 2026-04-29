/**
 * GET /api/sent-tracking
 * Scans sent emails from the last 7 days and checks which ones have not
 * received a reply within 48 hours.
 * Returns: { sentEmails: [{id, to, subject, date, hasReply, daysSince}] }
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
const { getToken } = require('../../lib/auth');

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
