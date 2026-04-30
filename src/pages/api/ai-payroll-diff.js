/**
 * POST /api/ai-payroll-diff
 * Uses Claude to compare two payroll PDF texts and produce a human-readable
 * summary of what changed, organized by employee.
 * Body: { currentText, previousText }
 * Returns: { summary: string }
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY
 */
const { getToken } = require('../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { currentText, previousText } = req.body || {};
  if (!currentText) return res.status(400).json({ error: 'Missing currentText' });

  const prompt = `You are comparing two payroll reports for Fresh Food Connect (a nonprofit). The CEO needs to approve the current payroll and wants to understand exactly what changed from last month.

PREVIOUS PAYROLL:
${(previousText || 'No previous payroll available').slice(0, 4000)}

CURRENT PAYROLL:
${(currentText || '').slice(0, 4000)}

Analyze both reports and produce a clear, concise summary:

1. List each EMPLOYEE by name
2. For each employee, show what changed: salary, hours, deductions, taxes — with the old and new values
3. If nothing changed for an employee, say "No changes"
4. At the end, note any new employees added or employees removed
5. Flag anything unusual (large increases/decreases, new deductions, missing items)

Format as a clean list. Use → to show changes (e.g., "$3,500.00 → $3,650.00"). Keep it scannable — the CEO reads this before clicking Approve.

If you cannot identify employee names in the text, describe the changes you can see by category (earnings, deductions, taxes) with the specific numbers.`;

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
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('ai-payroll-diff:anthropic', { status: r.status, message: err.error?.message });
      return res.status(500).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const d = await r.json();
    const summary = d.content?.[0]?.text || '';
    return res.status(200).json({ summary });
  } catch (error) {
    console.error('ai-payroll-diff:fetch', { message: error.message });
    return res.status(500).json({ error: error.message || 'Failed to analyze payroll' });
  }
}
