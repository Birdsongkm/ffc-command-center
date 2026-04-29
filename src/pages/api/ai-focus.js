/**
 * POST /api/ai-focus
 * AI daily focus briefing — Claude looks at inbox + calendar + tasks,
 * generates a 3-bullet priority list for the day.
 * Body: { emails: [{from, subject, bucket}], events: [{title, start}], tasks: [{title, done, dueDate}] }
 * Returns: { briefing: string, items: string[] }
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY
 */
const { getToken } = require('../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { emails, events, tasks } = req.body || {};

  const needsResponse = (emails || []).filter(e => e.bucket === 'needs-response');
  const pendingTasks = (tasks || []).filter(t => !t.done);
  const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
  const todayEvents = events || [];

  const contextLines = [];
  contextLines.push(`Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`);
  contextLines.push(`${(emails || []).length} unread emails (${needsResponse.length} need response)`);
  contextLines.push(`${todayEvents.length} meetings today`);
  contextLines.push(`${pendingTasks.length} pending tasks${overdueTasks.length ? ` (${overdueTasks.length} overdue)` : ''}`);

  if (needsResponse.length > 0) {
    contextLines.push('\nEmails needing response:');
    needsResponse.slice(0, 8).forEach((e, i) => contextLines.push(`  ${i + 1}. From: ${e.from} — "${e.subject}"`));
  }
  if (todayEvents.length > 0) {
    contextLines.push('\nToday\'s meetings:');
    todayEvents.slice(0, 6).forEach((e, i) => contextLines.push(`  ${i + 1}. ${e.start || ''} — ${e.title}`));
  }
  if (overdueTasks.length > 0) {
    contextLines.push('\nOverdue tasks:');
    overdueTasks.slice(0, 5).forEach((t, i) => contextLines.push(`  ${i + 1}. ${t.title} (due ${t.dueDate})`));
  }

  const prompt = `You are the AI assistant for Kayla Birdsong, CEO of Fresh Food Connect (a nonprofit). Based on her current inbox, calendar, and tasks, write a 3-bullet daily focus briefing. Each bullet should be one actionable sentence — what to do and why it matters. Prioritize: donor/board emails first, then deadlines, then everything else. Keep it under 50 words per bullet. No preamble — just the 3 bullets.

${contextLines.join('\n')}

Write 3 focus bullets:`;

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
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('ai-focus:anthropic', { status: r.status, message: err.error?.message });
      return res.status(500).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const d = await r.json();
    const briefing = d.content?.[0]?.text || '';
    const items = briefing.split(/\n/).filter(l => l.trim())
      .map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '').trim())
      .filter(l => l.length > 5)
      .slice(0, 5);

    return res.status(200).json({ briefing, items });
  } catch (error) {
    console.error('ai-focus:fetch', { message: error.message });
    return res.status(500).json({ error: error.message || 'Failed to generate focus briefing' });
  }
}
