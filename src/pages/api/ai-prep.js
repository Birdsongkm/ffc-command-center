/**
 * POST /api/ai-prep
 * Uses Claude (Haiku) to generate concise meeting prep notes for a calendar event.
 * Accepts event details (title, date, attendees, location, description); no auth guard.
 * Env: ANTHROPIC_API_KEY
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { title, date, attendees, location, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Missing event title' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ai-prep:config', { reason: 'ANTHROPIC_API_KEY not set' });
    return res.status(500).json({ error: 'Claude API not configured' });
  }

  const attendeeList = Array.isArray(attendees) && attendees.length
    ? attendees.map(a => a.email || a).join(', ')
    : 'No attendees listed';

  const prompt = `You are an executive assistant for Kayla, CEO of Fresh Food Connect — a nonprofit connecting communities to fresh, locally-sourced food.

Prepare concise meeting prep notes for this calendar event:

**Meeting:** ${title}
**Date/Time:** ${date || 'Not specified'}
**Attendees:** ${attendeeList}
**Location:** ${location || 'Not specified'}
**Description:** ${description || 'None provided'}

Provide:
1. **Goal** — what should Kayla accomplish in this meeting (1-2 sentences)
2. **Key questions to ask** — 3 sharp questions Kayla should ask
3. **Talking points** — 3 key points for Kayla to raise
4. **Watch for** — any risks, sensitivities, or things to be aware of
5. **Suggested next step** — one clear action to propose at the end

Keep it tight. Kayla is busy. No fluff.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('ai-prep:claude', { status: r.status, error: err.error?.message });
      return res.status(502).json({ error: err.error?.message || 'Claude API error' });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text || '';
    return res.status(200).json({ prep: text, model: data.model, status: 'ok' });
  } catch (error) {
    console.error('ai-prep:claude', { message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
