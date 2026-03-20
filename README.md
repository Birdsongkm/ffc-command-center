# FFC Command Center

An executive operations dashboard for **Fresh Food Connect** — a nonprofit connecting communities to fresh, locally-sourced food. Built to give leadership a single, calm surface for email triage, calendar awareness, team coordination, finance alerts, and donor activity.

---

## What It Does

The Command Center aggregates the most signal-dense information a nonprofit executive needs to start their day:

| Module | What it surfaces |
|---|---|
| **Email Triage** | Classifies inbox into actionable buckets (needs-response, team, newsletter, automated, Classy donations) so nothing critical is buried |
| **Monday Digest** | Weekly audio/text briefing — unread count, meetings, items needing reply, latest finance alerts |
| **Calendar** | Current-week events pulled from Google Calendar, surfaced at a glance |
| **Finance Alerts** | Emails from finance contacts (Debbie, accounting@) flagged and elevated |
| **Google Drive** | Recent activity on shared docs and folders |
| **Draft Management** | Review and send AI-assisted email drafts without leaving the dashboard |
| **Contact History** | Per-contact communication log for relationship continuity |
| **Signature Management** | Consistent email signature tooling |

**Priority categories:** Fundraising · Finance · Board · Programs · Admin · External · Marketing

**Urgency tiers:** Critical · High · Medium · Low

---

## Tech Stack

- **Next.js** (Pages Router, API routes)
- **Google OAuth 2.0** — access + refresh token flow, HttpOnly cookies
- **Gmail API** — message search, classification, draft creation, send
- **Google Calendar API** — event listing and actions
- **Google Drive API** — recent file activity
- **React** (hooks-based, no external state library)

---

## Local Setup

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env.local
```

Required env vars:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

```bash
npm run dev
# → http://localhost:3000
```

Auth flow: `/api/auth/login` → Google OAuth consent → `/api/auth/callback` sets `ffc_at`, `ffc_rt`, `ffc_exp` cookies.

---

## Architecture

```
src/pages/
├── index.js                  # Main dashboard (email, calendar, tasks, finance)
└── api/
    ├── auth/
    │   ├── login.js           # Initiates Google OAuth
    │   └── callback.js        # Exchanges code → tokens, sets cookies
    ├── data.js                # Gmail fetch + classification
    ├── drafts.js              # Draft list + management
    ├── email-actions.js       # Send, archive, label actions
    ├── email-body.js          # Full message body retrieval
    ├── send-email.js          # Outbound send
    ├── calendar-actions.js    # RSVP and event actions
    ├── monday-digest.js       # Weekly briefing aggregator
    ├── finance-review.js      # Finance-specific email queries
    ├── contact-history.js     # Per-contact thread history
    ├── drive.js               # Drive activity
    ├── credit-card.js         # Credit card expense emails
    └── signature.js           # Signature content
```

**Token handling:** All API routes call `getToken(req, res)` — checks expiry, silently refreshes via `ffc_rt` if needed, updates cookies in-flight. No token is ever exposed to the client.

**Email classification:** `classifyEmail()` in `index.js` uses sender domain, list headers, recipient count, and subject keywords to route each message. DropboxSign/HelloSign always surfaces as `needs-response` regardless of other signals. Mass-sends require ≥20 recipients to avoid false positives.

---

## Development Approach

This project is built and maintained with [Claude Code](https://claude.ai/claude-code) following the workflow discipline from [Adventures in Claude](https://adventuresinclaude.ai) and the [Superpowers](https://github.com/obra/superpowers) agentic skills framework:

- **Plan before building** — new features get a written plan with exact file paths and verification steps before any code is written
- **Zero silent failures** — every API route surfaces errors explicitly; no swallowed exceptions or generic catch-all responses
- **Systematic over ad-hoc** — changes follow a design → plan → implement → verify cycle
- **Scope discipline** — features are scoped tightly; no speculative abstractions or premature generalization

Code review checklist (adapted from [Garry Tan's Plan Review framework](https://gist.github.com/garrytan/120bdbbd17e1b3abd5332391d77963e7)):

- [ ] Error paths are named and handled explicitly (not generic `catch(e)`)
- [ ] Token refresh failures return `null`, never throw to the client
- [ ] New API routes follow the `getToken → fetch → shape → return` pattern
- [ ] No N+1 fetches — batch or `Promise.all` where possible
- [ ] Classification logic changes include a representative test case

---

## Team

| Name | Initials | Role |
|---|---|---|
| Laura Lavid | LL | |
| Gretchen Roberts | GR | |
| Carmen Alcantara | CA | |
| Adjoa Kittoe | AK | |
| Debbie Nash | DN | Finance |
| Lone Bryan | LB | |

---

## Organization

**Fresh Food Connect** — building a more resilient food system by connecting communities to fresh, locally-sourced produce. Every connection made reduces hunger tomorrow.
