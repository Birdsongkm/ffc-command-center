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
    const refreshed = await refreshToken(rt);
    if (!refreshed.access_token) return null;
    token = refreshed.access_token;
    const newExp = Date.now() + (refreshed.expires_in || 3600) * 1000;
    res.setHeader('Set-Cookie', [
      `ffc_at=${token}; HttpOnly; Secure; SameSite=Lax; Path=/`,
      `ffc_exp=${newExp}; HttpOnly; Secure; SameSite=Lax; Path=/`,
    ]);
  }
  return token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { context, boardMode } = req.body || {};
  if (!context) return res.status(400).json({ error: 'Missing context' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const weekStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const prompt = boardMode
    ? `You are writing a DRAFT board report for Fresh Food Connect, a nonprofit connecting communities to fresh food. The executive director is Kayla Birdsong.

Write a structured, professional board report draft. Include sections: Executive Summary, Operations Update, Fundraising Update, Key Challenges & Next Steps. Keep it under 500 words. This is a DRAFT — mark it clearly at the top.

Data for the week ending ${weekStr}:
${context}

Write the board report draft now:`

    : `You are writing a weekly brief for Kayla Birdsong, CEO of Fresh Food Connect, a nonprofit connecting communities to fresh food.

Write a concise, energetic weekly summary — max 250 words. Highlight wins, flag risks, note momentum. Speak directly to Kayla. This is her Monday morning intelligence brief.

Data for the week ending ${weekStr}:
${context}

Write the weekly brief now:`;

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
        max_tokens: boardMode ? 700 : 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('weekly-brief:anthropic', { status: r.status, boardMode, message: err.error?.message });
      return res.status(500).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const d = await r.json();
    const brief = d.content?.[0]?.text || '';
    return res.status(200).json({ brief });
  } catch (error) {
    console.error('weekly-brief:fetch', { boardMode, message: error.message });
    return res.status(500).json({ error: error.message || 'Failed to generate brief' });
  }
}
