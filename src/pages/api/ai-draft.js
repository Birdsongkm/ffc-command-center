/**
 * POST /api/ai-draft
 * Uses Claude (Haiku) to generate a reply email draft on behalf of the ED.
 * Accepts email context (from, subject, snippet/body) and returns a draft reply.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY
 */
const { getToken } = require('../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { from, subject, snippet, body } = req.body || {};
  if (!from && !subject) return res.status(400).json({ error: 'Missing email context' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const emailText = body || snippet || '';
  const prompt = `You are drafting a reply email on behalf of Kayla Birdsong, CEO of Fresh Food Connect, a nonprofit connecting communities to fresh food.

Write a professional, warm, and concise reply to this email. Be genuine — not overly formal. Match the tone of the original message. Do not add a subject line. Just write the body of the reply.

From: ${from}
Subject: ${subject}
Email content:
${emailText.slice(0, 2000)}

Write the reply now:`;

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
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('ai-draft:anthropic', { status: r.status, message: err.error?.message });
      return res.status(500).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const d = await r.json();
    const draft = d.content?.[0]?.text || '';
    return res.status(200).json({ draft });
  } catch (error) {
    console.error('ai-draft:fetch', { message: error.message });
    return res.status(500).json({ error: error.message || 'Failed to generate draft' });
  }
}
