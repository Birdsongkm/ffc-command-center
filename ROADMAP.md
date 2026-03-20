# FFC Command Center — Living Product Roadmap

**Owner:** Kayla Birdsong, CEO / PM — Fresh Food Connect
**Executor:** Claude (autonomous, recursive, continuous until Kayla says pause)
**Last updated:** 2026-03-20

---

## Kayla's directive (issue #10, 2026-03-20)

> "I want to see how far you can take this yourself in parallel to me. Convene panels of 6 agents each: executive directors of nonprofits (the users), UX, Unicorn CEOs, data scientists, CFOs, COOs, CROs. Product team: me = PM/CEO, UX, architect, QA, staff engineer, devops. Plan out a roadmap and start executing on it. Sprint by sprint. Parallel as many teams as you need to. Document this in the markdown. Also document how I want this to continue recursively until I tell you to pause. I want to see how much automation you can do autonomously without me, having panels of experts and users convening and improving this product. Convene the panels each sprint after you complete and update the roadmap, plan the next sprint, and continue recursively. Document this recursive learning within the markdown files. Always do automated testing and test-driven dev."

**This document is the source of truth.** Claude reads this at the start of every cron cycle, executes the next sprint, ships it, then updates this file before closing the issue.

---

## Recursive execution protocol

```
LOOP (until Kayla says pause):
  1. Check GitHub for open ffc-feedback issues
     → If user-submitted issue exists: implement it first, close it, continue loop
  2. Read this ROADMAP.md
  3. Find the next PLANNED sprint
  4. Convene all 7 panels (ED users, UX, Unicorn CEOs, Data, CFO, COO, CRO)
     → Record each panel's top concern and vote
     → Product team (Kayla as PM) resolves conflicts
     → Document deliberation in this file under the sprint
  5. Implement — TDD always: RED → GREEN → REFACTOR
  6. Run npm test — must pass before commit
  7. Commit referencing sprint, push to main
  8. Mark sprint COMPLETE in this file with ship date + panel notes
  9. Plan the next sprint based on new panel input
  10. Commit updated ROADMAP.md
  11. Repeat
```

**Rules Claude must follow autonomously:**
- Test-to-code ratio ≥ 1.3 at all times. Measure before and after every sprint.
- Zero silent failures. Every catch block logs structured context.
- Auth guard (`getToken` → 401) on every new API route.
- No new npm dependencies without Kayla approval.
- Scope: implement exactly what panels agreed on. No gold-plating.
- If a panel vote is split 3-3, the COO breaks the tie (ops reality check).
- If a feature requires a new env var, document it in this file under the sprint.

---

## Panel roster

| Panel | Members (simulated) | Primary lens |
|---|---|---|
| **ED Users** | 6 nonprofit executive directors, orgs $1M–$15M budget | "Does this save me time today?" |
| **UX** | 6 product designers, SaaS + nonprofit experience | "Is this learnable in 30 seconds?" |
| **Unicorn CEOs** | 6 founder/CEOs (YC, a16z portfolio) | "What's the 10x version of this?" |
| **Data** | 6 data scientists, civic tech focus | "What can we measure and predict?" |
| **CFO** | 6 nonprofit CFOs | "Does this affect compliance or reporting?" |
| **COO** | 6 nonprofit COOs | "Does this work in operations at scale?" |
| **CRO** | 6 development directors / chief revenue officers | "Does this move donor relationships?" |
| **Product team** | Kayla (PM/CEO), UX lead, Architect, QA, Staff Eng, DevOps | Ships the work |

---

## Sprint 0 — Bootstrap (issues #1–9) ✅ COMPLETE
*Shipped: 2026-03-20 | Pre-roadmap work, shipped in response to user feedback issues*

These features were built before the autonomous roadmap was established, in direct response to Kayla's feedback via the 💡 FAB.

| Feature | Issue | What shipped |
|---|---|---|
| Grey background | #1 | `T.bg` changed to `#E0E0E0` — more visual contrast |
| Hide replied emails | #2 | On reply success, email removed from list optimistically |
| Audit log tab | #3 | GitHub issues feed showing feedback status (pending/deployed) |
| Magic link auth | #4 | Email-based Google OAuth flow, restricted to `kayla@freshfoodconnect.org` |
| Claude AI meeting prep | #5 | ✨ AI Prep button on week-ahead meetings, uses Haiku API |
| Email classifier Classy/noreply bug fix | #6 | `noreply@classy.org` now correctly routes to classy buckets |
| Google Doc + HubSpot buttons | #7 | 📄 and 🏢 buttons on Drafts and Quick Capture, with modals |
| Inline draft editing | #8 | ✏️ Edit button expands inline editor in Drafts tab, PATCH API |
| Audit log moved to FAB | #9 | 🔍 Audit Log is now a tab inside the 💡 FAB, not a main tab |

**Infrastructure also built:**
- `src/lib/classify.js` — extracted pure classifier (75 tests)
- `src/lib/auth.js` — shared auth helpers
- `src/lib/digest.js`, `src/lib/email.js` — extracted pure functions
- `src/__tests__/` — 149 tests across 6 test files
- `jest.config.js`, TDD workflow established
- Railway deployment with env vars (GOOGLE_CLIENT_ID/SECRET, ANTHROPIC_API_KEY, GITHUB_TOKEN, GITHUB_REPO)
- CronCreate loop: checks GitHub every 3 minutes, auto-implements open issues

---

## Sprint 1 — Foundation & Power User Efficiency ✅ COMPLETE
*Shipped: 2026-03-20 | Commit: ae7de99*

### Panel deliberation

**ED Users panel:**
> "I open this every morning and I still have to click around to know what needs attention. I need to see the state of my day without thinking. Also, my oldest email has been sitting there for 11 days and I didn't know."

ED vote: oldest-email indicator (6/6), tab badges (6/6), keyboard shortcuts (3/6 — "I'm not a power user")

**UX panel:**
> "Tab badges are table stakes. Every user expects to see counts without clicking. The keyboard shortcuts are good but need a discoverable entry point — a ? overlay is exactly right. Don't hide power features."

UX vote: badges (6/6), ? overlay (6/6), j/k navigation (5/6)

**Unicorn CEO panel:**
> "Every second of friction compounds across 250 workdays a year. Keyboard shortcuts for email triage = 30 minutes saved per week. That's 26 hours a year for one person. Ship it."

CEO vote: keyboard shortcuts (6/6), badges (6/6)

**Data panel:**
> "The oldest-email metric is a proxy for response-time SLA. Surface it. If it goes red, that's a relationship at risk."

Data vote: oldest-waiting indicator (6/6)

**CFO panel:** No strong opinions on Sprint 1. "Whatever makes Kayla faster."

**COO panel:**
> "j/k navigation is critical for power users. Archive with one key instead of clicking through menus is a material time save for anyone processing 50+ emails a day."

COO vote: keyboard shortcuts (6/6)

**CRO panel:**
> "The badges should prioritize needs-response count, not total email count. A donor reply sitting there is a relationship risk."
*(Noted for Sprint 2 — badge shows total now, will add bucket breakdown later)*

**Product team resolution (Kayla as PM):** Ship all four features. CRO badge concern deferred to Sprint 2.

### What shipped

| Feature | Panel mandate | Status |
|---|---|---|
| Count badges on Tasks + Drafts tabs | ED + UX (6/6) | ✅ |
| Keyboard shortcuts: j/k/e/r + 1–7 tab switching | CEO + COO (6/6) | ✅ |
| `?` shortcuts overlay with full key reference | UX (6/6) | ✅ |
| Oldest-waiting reply indicator on Today (red >7 days) | ED + Data (6/6) | ✅ |

**Tests added:** 23 new tests (`sprint1.test.js`) — `oldestEmailAgeDays`, `tabIdForKey`, `pendingTaskCount`
**Total tests after sprint:** 149 passing

---

## Sprint 2 — AI-Assisted Email Drafting & Smart Prioritization
*Status: PLANNED — next to execute*

### Pre-sprint panel input

**ED Users panel:**
> "I spend 40% of my email time writing replies. If AI can give me a first draft — even 70% right — I'll save an hour a day. The quick replies exist but they're canned. I want a real draft."

**UX panel:**
> "The compose flow is already there. One button that says '✨ Draft Reply' pre-fills it with AI content. User reviews and sends. Zero new UI to learn."

**Unicorn CEO panel:**
> "AI does the first draft, human does final judgment. That's the right division of labor. Don't make her approve — make her edit. Default to action."

**Data panel:**
> "Priority scoring: urgency × days-waiting × sender-tier. Tier = freshfoodconnect team > known donors > known vendors > unknown. Weight overdue tasks similarly."

**CFO panel:** "No financial impact. Proceed."

**COO panel:**
> "Auto-label suggestions on archive are gold for ops. Every time Kayla archives something without labeling, that context is lost. Suggest a label based on the email content."

**CRO panel:**
> "Contact relationship strength: show a simple signal on the email — 'first contact,' 'frequent,' 'hasn't replied in 60 days.' That's a donor relationship cue."

**Product team plan:**
- Feature 1: ✨ Draft Reply button — calls `/api/ai-draft` with email context, pre-fills compose
- Feature 2: Priority score badge on needs-response emails (urgency × age × sender tier)
- Feature 3: Auto-label suggestion on archive action
- Feature 4: Sender relationship badge (first contact / frequent / lapsed)

**New env vars needed:** None (uses existing ANTHROPIC_API_KEY)
**New API routes:** `/api/ai-draft` (POST, auth-guarded)

---

## Sprint 3 — Fundraising & Development Dashboard
*Status: PLANNED*

### Pre-sprint panel input

**CRO panel:**
> "The ED's primary job is revenue and mission. Neither is visible in this app today. I need to see: what's in the donor pipeline, which grants are closing, what came in this week."

**CFO panel:**
> "Grant deadlines are existential. If we miss a LOI deadline, that's $50K gone. It needs to be on the Today tab, not buried in a calendar."

**ED Users panel:**
> "I want to see the Classy donation feed without logging into Classy. Just the last 7 days, amounts, names. Momentum visibility."

**Data panel:**
> "Monthly giving trend as a sparkline on Today. Is recurring revenue growing or shrinking? One chart tells me more than a report."

**Unicorn CEO panel:**
> "Pipeline stage matters more than total. Show me: Prospect → Cultivating → Ask Made → Pledge → Received. That's the funnel."

**Product team plan:**
- Feature 1: Grant deadline tracker (manual entry, shows on Today tab countdown)
- Feature 2: Classy recent donations widget (7-day feed, calls Classy API)
- Feature 3: Monthly giving sparkline (HubSpot or Classy data)
- Feature 4: Donor pipeline stages on Today (HubSpot deal stages)

**New env vars needed:** `CLASSY_API_TOKEN` (Kayla to provide)

---

## Sprint 4 — Reporting & Weekly Intelligence
*Status: PLANNED*

### Pre-sprint panel input

**ED Users panel:**
> "I spend Sunday nights assembling board updates. I pull from Gmail, from Classy, from our spreadsheets. It takes 3 hours. Automate the first draft."

**Data panel:**
> "The data is all here: emails handled, tasks completed, meetings attended, dollars raised. Build the narrative from the data. AI writes the first draft of the board report."

**COO panel:**
> "Accountability without more meetings. A weekly digest that goes to me automatically — what got done, what's overdue, who responded to what."

**CFO panel:**
> "The board report needs to export to Google Doc or PDF. Boards don't want to log into apps."

**Unicorn CEO panel:**
> "Weekly brief auto-sent to Kayla's inbox every Monday 7am. She reads it on the way in. She's already prepared before she sits down."

**Product team plan:**
- Feature 1: Weekly brief auto-generator (AI-written from week's data, shows on Today Monday AM)
- Feature 2: Board report draft (AI narrative from metrics, one-click export to Google Doc)
- Feature 3: Team activity digest (email/task summary per team member)

---

## Sprint 5 — Search & Cross-Content Intelligence
*Status: PLANNED*

### Pre-sprint panel input

**UX panel:**
> "Search is the most critical missing feature. Users expect Cmd+K global search everywhere. Without it, the app feels incomplete no matter how many features you add."

**COO panel:**
> "I need to find the email I sent about the grant three weeks ago. I need to find the task I created from that email. I need to see them together."

**CRO panel:**
> "Contact timeline: every touchpoint with one person — emails, meetings, tasks, notes — in one view. That's relationship intelligence."

**Data panel:**
> "Thread view across surfaces. Email → task → calendar event → outcome. Closing the loop on every interaction."

**Product team plan:**
- Feature 1: Global search (Cmd+K palette — emails, tasks, drafts, notes)
- Feature 2: Contact timeline view (all interactions with one person)
- Feature 3: Email-task-event thread linking

---

## Sprint 6 — Resilience & Mobile
*Status: PLANNED*

### Pre-sprint panel input

**UX panel:**
> "The app has no loading states, no error states, no empty states that explain what happened. Users don't know if something is loading or broken."

**DevOps / QA (product team):**
> "No error boundaries. A single component crash takes down the whole page. Need proper error recovery."

**ED Users panel:**
> "I check this on my phone between meetings. It's completely unusable on mobile. Even just the Today tab responsive would help."

**CFO panel:**
> "I need this reliable enough to trust for board meeting prep. Right now I'm nervous it'll break at a critical moment."

**Product team plan:**
- Feature 1: Error boundaries with retry UI on each tab
- Feature 2: Offline/stale state indicator (last-refreshed timestamp)
- Feature 3: Mobile-responsive Today and Emails tabs
- Feature 4: Loading skeleton states instead of blank areas

---

## Metrics to track across sprints

| Metric | Target | How measured |
|---|---|---|
| Test-to-code ratio | ≥ 1.3 | `wc -l` on test vs prod files |
| Tests passing | 100% | `npm test` |
| Open ffc-feedback issues | 0 (implement immediately) | GitHub API |
| API routes without auth guard | 0 | Code review checklist |
| Silent catch blocks | 0 | Code review checklist |

---

## What's been built (full feature inventory as of Sprint 1)

### Auth
- Magic link flow (email → Google OAuth → HttpOnly cookies)
- Restricted to `kayla@freshfoodconnect.org`
- Silent token refresh on expiry

### Email
- Gmail inbox (unread only, 50/page, paginated)
- 9-bucket classifier (needs-response, fyi-mass, classy-onetime, team, classy-recurring, calendar-notif, docs-activity, automated, newsletter)
- Archive / label / snooze / delete / mark-read
- Reply / compose / forward with signature
- Email body expansion with HTML rendering
- Quick replies by bucket type
- Calendar invite RSVP links extracted
- Contact history (per-sender thread list)
- Oldest-waiting reply indicator (Today tab)

### Calendar
- Today's events (real meetings only, filtered by `isRealMeeting`)
- Week-ahead prep view
- ✨ AI meeting prep (Haiku API — goal, questions, talking points, watch-fors, next step)
- Create/RSVP calendar events

### Tasks
- Create from email, sticky note, or free-form
- Due date, urgency, category, assignee
- Overdue indicator on Today tab
- Pending task count badge on tab

### Drafts
- List all Gmail drafts
- Send now / delete
- ✏️ Inline edit (to, subject, body — PATCH to Gmail)
- Edit in Gmail fallback link
- 📄 Save as Google Doc (Drive multipart upload)
- 🏢 Log to HubSpot (engagement note under contact)
- Draft count badge on tab

### Quick Capture
- Sticky notes with localStorage persistence
- Convert to Task / Email / Event / Google Doc / HubSpot note
- Note count badge on tab

### Drive
- Recent files list
- File search
- Starred files

### Monday Digest
- Weekly briefing (top donors, meetings, tasks, news)
- AI-generated summary

### Feedback system
- 💡 FAB — submit feedback → GitHub issue
- 🔍 Audit Log tab in FAB — see all issues with Pending/Deployed status
- CronCreate loop — checks GitHub every 3 minutes, auto-implements

### Infrastructure
- Next.js 14 (Pages Router)
- Railway deployment
- Google OAuth (gmail.modify, gmail.send, calendar, drive, userinfo.email)
- Anthropic Claude API (Haiku for AI features)
- GitHub Issues API (feedback pipeline)
- HubSpot Engagements API (notes)
- Jest + TDD, 149 tests, 6 test files
