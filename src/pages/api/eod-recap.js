/**
 * POST /api/eod-recap
 * End-of-day AI recap — summarizes the day's activity.
 * Body: { emailsHandled, meetingsAttended, tasksCompleted, followUpsPending, nonReplies, highlights }
 * Returns: { recap: string }
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { emailsHandled, meetingsAttended, tasksCompleted, followUpsPending, nonReplies, highlights } = req.body || {};

  const contextLines = [];
  contextLines.push(`End-of-day summary for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`);
  contextLines.push(`Emails handled: ${emailsHandled || 0}`);
  contextLines.push(`Meetings attended: ${meetingsAttended || 0}`);
  contextLines.push(`Tasks completed: ${tasksCompleted || 0}`);
  if (followUpsPending > 0) contextLines.push(`Follow-ups still pending: ${followUpsPending}`);
  if (nonReplies > 0) contextLines.push(`Sent emails awaiting reply (48h+): ${nonReplies}`);
  if (highlights) contextLines.push(`\nNotable items:\n${highlights}`);

  const prompt = `You are writing an end-of-day recap for Kayla Birdsong, CEO of Fresh Food Connect. Based on today's activity, write a brief 3-4 sentence summary. Be encouraging but honest. If there are pending follow-ups or non-replies, gently flag them. If it was a productive day, acknowledge it. Keep it under 80 words. No preamble.

${contextLines.join('\n')}

Write the recap:`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('eod-recap:anthropic', { status: r.status, message: err.error?.message });
      return res.status(500).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const d = await r.json();
    const recap = d.content?.[0]?.text || '';
    return res.status(200).json({ recap });
  } catch (error) {
    console.error('eod-recap:fetch', { message: error.message });
    return res.status(500).json({ error: error.message || 'Failed to generate recap' });
  }
}
