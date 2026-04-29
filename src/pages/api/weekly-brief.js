/**
 * POST /api/weekly-brief
 * Uses Claude (Haiku) to generate a weekly intelligence brief or board report draft.
 * Body: context (required, digest text), boardMode (optional boolean for board report format).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY
 */
const { getToken } = require('../../lib/auth');

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
