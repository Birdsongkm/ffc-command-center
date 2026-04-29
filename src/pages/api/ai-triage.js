/**
 * POST /api/ai-triage
 * Batch AI triage — Claude recommends RESPOND/ARCHIVE/DEFER for each email.
 * Body: { emails: [{ id, from, subject, snippet }] }
 * Returns: { recommendations: [{ id, action, reason }] }
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY
 */
const { getToken } = require('../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { emails } = req.body || {};
  if (!emails || emails.length === 0) return res.status(400).json({ error: 'No emails provided' });

  const emailList = emails.slice(0, 15).map((e, i) =>
    `Email ${i + 1} (id:${e.id}): From="${e.from}" Subject="${e.subject}" Snippet="${(e.snippet || '').slice(0, 120)}"`
  ).join('\n');

  const prompt = `You are triaging emails for Kayla Birdsong, CEO of Fresh Food Connect (a nonprofit). For each email below, recommend one action: RESPOND, ARCHIVE, or DEFER.

Rules:
- RESPOND: emails from donors, board members, partners, or anyone expecting a personal reply
- ARCHIVE: newsletters, automated notifications, system emails, mass sends
- DEFER: informational emails that need reading but not an immediate reply

Format each recommendation as: "Email N: ACTION: brief reason"

${emailList}

Recommendations:`;

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
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('ai-triage:anthropic', { status: r.status, message: err.error?.message });
      return res.status(500).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const d = await r.json();
    const text = d.content?.[0]?.text || '';

    // Parse recommendations from response
    const recommendations = [];
    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const match = line.match(/Email\s*(\d+).*?(RESPOND|ARCHIVE|DEFER|DELETE|FLAG):\s*(.+)/i);
      if (match) {
        const idx = parseInt(match[1]) - 1;
        if (idx >= 0 && idx < emails.length) {
          recommendations.push({
            id: emails[idx].id,
            action: match[2].toLowerCase(),
            reason: match[3].trim(),
          });
        }
      }
    }

    return res.status(200).json({ recommendations, raw: text });
  } catch (error) {
    console.error('ai-triage:fetch', { message: error.message });
    return res.status(500).json({ error: error.message || 'Failed to triage' });
  }
}
