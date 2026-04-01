/**
 * POST /api/github-feedback
 * Creates a GitHub issue tagged ffc-feedback, then fire-and-forgets a 7-panel
 * Claude Sonnet expert review that posts back as an issue comment.
 *
 * Env vars required:
 *   GITHUB_TOKEN   — Personal access token with repo scope
 *   GITHUB_REPO    — "owner/repo" (e.g. "Birdsongkm/ffc-command-center")
 *   ANTHROPIC_API_KEY — Claude Sonnet access
 */

const PANELS = [
  {
    name: "ED Users Panel",
    description: "6 nonprofit executive directors",
    experts: [
      "Sarah Chen — ED, urban food bank, 12 years",
      "Marcus Williams — ED, rural hunger relief, 8 years",
      "Priya Patel — ED, food rescue network, 15 years",
      "James Okafor — ED, community kitchen coalition, 10 years",
      "Elena Rodriguez — ED, farm-to-table nonprofit, 6 years",
      "Linda Thompson — ED, multi-city food pantry network, 20 years",
    ],
    lens: "Does this save me time today? Does it fit how I actually work?",
  },
  {
    name: "UX Panel",
    description: "6 product designers",
    experts: [
      "Alex Kim — Senior UX Designer, nonprofit SaaS",
      "Jordan Lee — Product Designer, civic tech",
      "Sam Rivera — Design Lead, accessibility-first tools",
      "Morgan Chen — UX Researcher, mission-driven orgs",
      "Riley Patel — Product Designer, dashboard systems",
      "Casey Williams — UX Lead, executive workflow tools",
    ],
    lens: "Is this learnable in 30 seconds? Does it reduce cognitive load?",
  },
  {
    name: "Unicorn CEOs Panel",
    description: "6 YC/a16z-backed startup CEOs",
    experts: [
      "David Park — CEO, B2B SaaS (YC W19, $50M ARR)",
      "Aisha Johnson — CEO, enterprise tools (a16z, $200M raised)",
      "Tom Zhang — CEO, productivity software (YC S20, 500K users)",
      "Nina Osei — CEO, workflow automation (Sequoia, IPO 2024)",
      "Raj Mehta — CEO, AI ops platform (YC W21, $80M Series B)",
      "Claire Dubois — CEO, SMB software (Benchmark, $40M ARR)",
    ],
    lens: "What is the 10x version? What would make this a category-defining feature?",
  },
  {
    name: "Data Scientists Panel",
    description: "6 civic-tech data scientists",
    experts: [
      "Dr. Fatima Al-Hassan — Data Science Lead, USDA Food Programs",
      "Carlos Mendez — ML Engineer, hunger mapping nonprofit",
      "Dr. Yuki Tanaka — Research Scientist, food security analytics",
      "Amara Diallo — Data Engineer, civic infrastructure",
      "Dr. Ben Foster — Applied ML, supply chain optimization",
      "Lily Zhao — Data Analyst, nonprofit impact measurement",
    ],
    lens: "What data and metrics back this up? What can we measure to know it's working?",
  },
  {
    name: "CFO Panel",
    description: "6 nonprofit CFOs",
    experts: [
      "Robert Kim — CFO, $20M nonprofit, 15 years in sector",
      "Sandra Okafor — CFO, regional food bank network",
      "Michael Torres — VP Finance, national hunger org",
      "Patricia Wells — CFO, foundation-funded nonprofit",
      "David Chang — Controller, multi-program food nonprofit",
      "Grace Nkosi — CFO, government-contract-heavy org",
    ],
    lens: "What does this cost? What does it save? Is this the right use of resources?",
  },
  {
    name: "COO Panel",
    description: "6 nonprofit COOs — breaks 3-3 ties",
    experts: [
      "Jennifer Lee — COO, 50-person food rescue org",
      "Marcus Johnson — COO, volunteer-driven network",
      "Ana Gutierrez — VP Operations, multi-site food program",
      "Kevin Obi — COO, rapid-growth nonprofit",
      "Susan Park — Chief of Staff / COO, ED-support focused",
      "Daniel Rivera — COO, tech-forward food nonprofit",
    ],
    lens: "Can we actually implement this? What breaks? What does the team need to execute?",
  },
  {
    name: "CRO Panel",
    description: "6 development directors / chief revenue officers",
    experts: [
      "Melissa Brooks — Development Director, $5M annual fund",
      "James Nwosu — Chief Development Officer, major gifts focus",
      "Rachel Chen — VP Development, foundation relations",
      "Tyler Washington — CRO, digital fundraising specialist",
      "Nia Okafor — Director of Development, corporate partnerships",
      "Chris Patel — Chief Revenue Officer, earned revenue nonprofit",
    ],
    lens: "Does this help us raise more money or tell our story better? What do donors see?",
  },
];

function buildPanelPrompt(feedback, context) {
  const panelSections = PANELS.map(p => `
### ${p.name} (${p.description})
Experts: ${p.experts.join("; ")}
Lens: "${p.lens}"`).join("\n");

  return `You are facilitating a product review panel for FFC Command Center, an executive operations dashboard for Fresh Food Connect, a nonprofit connecting communities to fresh food. The sole user is Kayla, the executive director.

## Feedback Submitted
${feedback.trim()}
${context ? `\n## Context\n${context.trim()}\n` : ""}
## Your Task

Convene 7 expert panels (6 experts each) to debate this feedback and produce a structured recommendation. For each panel, have the experts briefly debate and arrive at a consensus or majority recommendation. Then produce a final synthesis.

${panelSections}

## Output Format

For each panel, output:
**[Panel Name]**
Consensus: [1–2 sentence verdict]
Key points: [2–3 bullet points from the debate]
Recommendation: [Implement as-is / Implement with changes / Defer / Reject] — [one sentence rationale]

After all 7 panels, output:

---
## FINAL SYNTHESIS

**Overall recommendation:** [one of: Ship it | Ship with modifications | Needs more scoping | Defer | Reject]

**Rationale:** [2–3 sentences]

**If shipping — suggested implementation approach:** [3–5 bullet points]

Be direct. Panels can disagree. The COO panel breaks 3-3 ties across panels. Aim for 600–800 words total.`;
}

async function postGitHubComment(repo, issueNumber, body, token) {
  const r = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ body }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error("github-feedback:comment", { issueNumber, status: r.status, message: err.message });
  }
}

async function convenePanel(feedback, context, issueNumber, repo, ghToken, anthropicKey) {
  try {
    const prompt = buildPanelPrompt(feedback, context);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error("github-feedback:claude", { issueNumber, status: r.status, message: err.error?.message });
      return;
    }

    const data = await r.json();
    const panelText = data.content?.[0]?.text || "(No response from panel)";

    const commentBody = [
      "## 🏛️ Expert Panel Review",
      "",
      "*Convened automatically by Claude Sonnet — 7 panels × 6 experts each*",
      "",
      panelText,
    ].join("\n");

    await postGitHubComment(repo, issueNumber, commentBody, ghToken);
  } catch (error) {
    console.error("github-feedback:convenePanel", { issueNumber, message: error.message });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { feedback, context } = req.body;
  if (!feedback || !feedback.trim()) {
    return res.status(400).json({ error: "Feedback is required" });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!ghToken || !repo) {
    console.error("github-feedback:config", { hasToken: !!ghToken, hasRepo: !!repo });
    return res.status(500).json({ error: "GitHub integration not configured" });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    const body = [
      feedback.trim(),
      "",
      "---",
      "**Source:** FFC Command Center lightbulb feedback",
      context ? `**Context:** ${context}` : null,
      `**Submitted:** ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: feedback.trim().slice(0, 80),
        body,
        labels: ["ffc-feedback"],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error("github-feedback:create", { status: r.status, message: err.message });
      return res.status(502).json({ error: err.message || "Failed to create GitHub issue" });
    }

    const issue = await r.json();

    // Fire-and-forget: convene panel without blocking the response
    if (anthropicKey) {
      convenePanel(feedback, context, issue.number, repo, ghToken, anthropicKey).catch(err =>
        console.error("github-feedback:panel-uncaught", { message: err.message })
      );
    } else {
      console.error("github-feedback:panel-skip", { reason: "ANTHROPIC_API_KEY not set" });
    }

    return res.status(200).json({ success: true, issueNumber: issue.number, url: issue.html_url });
  } catch (error) {
    console.error("github-feedback:create", { message: error.message });
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
