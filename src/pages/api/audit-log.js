export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    console.error('audit-log:config', { hasToken: !!token, hasRepo: !!repo });
    return res.status(500).json({ error: 'GitHub integration not configured' });
  }

  try {
    // Fetch all ffc-feedback issues (open + closed) sorted by newest first
    const r = await fetch(
      `https://api.github.com/repos/${repo}/issues?labels=ffc-feedback&state=all&per_page=50&sort=created&direction=desc`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('audit-log:fetch', { status: r.status, message: err.message });
      return res.status(502).json({ error: err.message || 'Failed to fetch audit log' });
    }

    const issues = await r.json();
    const entries = issues.map(issue => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      status: issue.state === 'open' ? 'pending' : 'deployed',
      labels: issue.labels.map(l => l.name),
      createdAt: issue.created_at,
      closedAt: issue.closed_at,
      url: issue.html_url,
    }));

    return res.status(200).json({ entries });
  } catch (error) {
    console.error('audit-log:fetch', { message: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
