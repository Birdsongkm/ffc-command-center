export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { feedback, context } = req.body;
  if (!feedback || !feedback.trim()) {
    return res.status(400).json({ error: 'Feedback is required' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "kaylathedev/ffc-command-center"
  if (!token || !repo) {
    console.error('github-feedback:config', { hasToken: !!token, hasRepo: !!repo });
    return res.status(500).json({ error: 'GitHub integration not configured' });
  }

  try {
    const body = [
      feedback.trim(),
      '',
      '---',
      `**Source:** FFC Command Center lightbulb feedback`,
      context ? `**Context:** ${context}` : null,
      `**Submitted:** ${new Date().toISOString()}`,
    ].filter(Boolean).join('\n');

    const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: feedback.trim().slice(0, 80),
        body,
        labels: ['ffc-feedback'],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('github-feedback:create', { status: r.status, message: err.message });
      return res.status(502).json({ error: err.message || 'Failed to create GitHub issue' });
    }

    const issue = await r.json();
    return res.status(200).json({ success: true, issueNumber: issue.number, url: issue.html_url });
  } catch (error) {
    console.error('github-feedback:create', { message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
