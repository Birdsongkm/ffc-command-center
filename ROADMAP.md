# FFC Command Center — Living Product Roadmap

**Owner:** Kayla Birdsong, CEO / PM — Fresh Food Connect
**Executor:** Claude (autonomous, recursive, continuous until Kayla says pause)
**Last updated:** 2026-03-21 (Sprint 3 complete, Sprint 4 planned)

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

## Sprint 2 — AI-Assisted Email Drafting & Smart Prioritization ✅ COMPLETE
*Shipped: 2026-03-20 | Commit: e522bf5*

### Panel deliberation

**ED Users panel (6/6):**
> "I spend 40% of my email time writing replies. If AI can give me a first draft — even 70% right — I'll save an hour a day. The quick replies exist but they're canned. I want a real draft — something context-aware that I can tweak and send."

ED vote: AI draft reply (6/6), priority score (5/6 — "help me see what's actually urgent"), relationship badge (4/6 — "is this someone I know?")

**UX panel (6/6):**
> "The compose flow is already there. One button that says '✨ Draft Reply' pre-fills it with AI content. User reviews and sends. Zero new UI to learn. The priority badge needs to be subtle — don't add visual noise. One small colored indicator, not a whole scoring system."

UX vote: Draft Reply button in hover bar AND expanded view (6/6), subtle P-score badge (5/6 — "keep it small"), relationship badge as colored chip (4/6)

**Unicorn CEO panel (6/6):**
> "AI does the first draft, human does final judgment. That's the right division of labor. Don't make her approve — make her edit. Default to action. Inbox-zero as a service. Every email that goes past 7 days should feel like a burn."

CEO vote: Draft Reply (6/6), urgency-weighted priority (6/6)

**Data panel (6/6):**
> "Priority scoring: urgency × days-waiting × sender-tier. Tier = freshfoodconnect team (3x) > frequent contact (2x) > known (1.2x) > unknown (1x). Cap age at 14 days to prevent ancient emails dominating. Urgency keywords add flat bonus: ASAP/urgent/critical (+10), grant/deadline/sign (+6), follow-up/invoice (+3)."

Data vote: Priority score algorithm as described (6/6), relationship badge (5/6)

**CFO panel:** "No financial impact on this sprint. No new env vars needed — good. Proceed."

**COO panel (6/6):**
> "Auto-label suggestions on archive are gold for ops. Every time Kayla archives something without labeling, that context is lost. Suggest a label based on the email content — show it in the toast message so it doesn't add a step."

COO vote: Label suggestion in toast (6/6 — "in the toast, not a modal")

**CRO panel (6/6):**
> "Contact relationship strength: show a simple signal on the email — 'First contact,' 'Frequent,' 'Lapsed (60d+).' That's a donor relationship cue. Lapsed is the most important — if a key donor hasn't heard from Kayla in 60 days, that email needs a reply today."

CRO vote: Relationship badge (6/6), lapsed signal highlighted in red/orange (6/6)

**Product team resolution (Kayla as PM):**
- All four features green-lit
- Priority score: show only on needs-response bucket emails (not all emails)
- Label suggestion: in toast message, not blocking UI
- Relationship badge: Lapsed = orange, Frequent = green, First contact = blue
- `e` keyboard shortcut mapped to trash (not archive — Kayla doesn't use archive)

### What shipped

| Feature | Panel mandate | Status |
|---|---|---|-|
| ✨ Draft Reply button (hover bar + expanded) → `/api/ai-draft` | ED + UX + CEO (6/6) | ✅ |
| Priority score badge (P-score) on needs-response emails | Data (6/6) | ✅ |
| Auto-label suggestion in delete/archive toast | COO (6/6) | ✅ |
| Relationship badge (First contact / Frequent / Lapsed) | CRO (6/6) | ✅ |

**New API route:** `/api/ai-draft` — POST, auth-guarded, calls Anthropic Haiku, returns draft text
**Pure functions added:** `senderTier`, `priorityScore`, `relationshipBadge`, `suggestArchiveLabel`
**Tests added:** 43 new tests (sprint2.test.js: 29, aiDraft.test.js: 14) — **242 total passing**

---

## Sprint 3 — Fundraising & Development Dashboard ✅ COMPLETE
*Shipped: 2026-03-21 | Commit: 3a31e22 (Sprint 3 features) + acd5c8f (user issues #20-25)*

### Panel deliberation (post-Sprint 2 convening)

**CRO panel (6/6):**
> "The ED's primary job is revenue and mission. Neither is visible in this app today. I need to see: what's in the donor pipeline, which grants are closing, what came in this week. Right now Kayla has to log into Classy, HubSpot, and her email separately. Pull it all into Today."

CRO vote: donation widget (6/6), pipeline funnel (6/6), grant deadlines (5/6)

**CFO panel (6/6):**
> "Grant deadlines are existential for a nonprofit our size. Miss an LOI and that's $50K gone. It needs to live on Today tab with a countdown — red when < 7 days, amber when < 30. Manual entry is fine to start; we can connect to a spreadsheet later. Don't block on a data source."

CFO vote: grant deadline countdown on Today (6/6), manual entry first (6/6 — "don't wait for API"), color-coded urgency (6/6)

**ED Users panel (6/6):**
> "I want to see the Classy donation feed without logging into Classy. Just the last 7 days, amounts, names. Momentum visibility — when I see a $500 donation come in, I send a thank-you within 24 hours. If I'm not watching Classy, I miss that window. Also: grant deadlines belong on my daily view, full stop."

ED vote: Classy widget (6/6), grant deadlines on Today (6/6), pipeline funnel (3/6 — "nice to have but not daily")

**Data panel (5/6):**
> "The Classy feed is tactical. The strategic view is trend: is monthly giving growing or shrinking? A sparkline on Today — last 6 months of recurring revenue — tells me more than a dollar total. Connect to HubSpot deal data for the pipeline funnel. Don't build custom pipeline tracking when the data already lives in HubSpot."

Data vote: monthly giving sparkline (5/6), HubSpot pipeline (6/6 — "don't reinvent what HubSpot already does")

**UX panel (6/6):**
> "Two risks: widget sprawl (Today becomes a dashboard nobody reads) and API dependency (Classy/HubSpot goes down, Today breaks). Mitigate: each widget is collapsible. If the API call fails, show 'data unavailable' — never a broken Today tab. Keep the grant tracker above the fold."

UX vote: collapsible widgets (6/6), graceful empty states (6/6), grant tracker at top (6/6)

**COO panel (5/6):**
> "The grant tracker is ops-critical. I will use this daily. Make sure it persists — localStorage is fine. Pipeline funnel: COO wants to know what's in 'Ask Made' stage — that's where deals die. Surface that count."

COO vote: grant tracker localStorage (6/6), Ask Made stage highlighted (5/6)

**Unicorn CEO panel (4/6):**
> "Pipeline stage matters more than total. Show me: Prospect → Cultivating → Ask Made → Pledge → Received. That's the funnel. The sparkline is a vanity metric if you can't act on it. Pair it with a trend arrow — up/down vs. prior 6 months."

CEO vote: pipeline funnel stages (6/6), trend arrow on sparkline (4/6 — "only if data is reliable")

**Product team resolution (Kayla as PM):**
- Feature 1 ships: grant deadline tracker (localStorage, Today tab, color-coded countdown) — no external API needed, ships immediately
- Feature 2 ships: Classy donation widget — needs `CLASSY_API_TOKEN`; if not available, build the UI with a graceful "Connect Classy" empty state
- Feature 3 ships: HubSpot pipeline funnel using existing HubSpot MCP (deals by stage)
- Feature 4 deferred: monthly giving sparkline — requires historical Classy data, too much scope for Sprint 3; move to Sprint 4
- COO tie-break on sparkline deferral: "ops reality — don't build a chart we can't populate"

**Product team plan:**
- Feature 1: Grant deadline tracker (localStorage, Today tab, red/amber countdown, manual add/remove)
- Feature 2: Classy recent donations widget (7-day feed via Classy API, graceful empty state if no token)
- Feature 3: HubSpot donor pipeline funnel on Today (deal stages: Prospect → Cultivating → Ask Made → Pledge → Received)

**New env vars needed:** `CLASSY_API_TOKEN` (Kayla to provide for Feature 2)
**New API routes:** `/api/classy-donations` (GET, auth-guarded), `/api/hubspot-pipeline` (GET, auth-guarded)

### What shipped (Sprint 3 + user issues #20-25 also shipped this cycle)

| Feature | Status |
|---|---|
| Grant deadline tracker (localStorage, red/amber/green countdown, add/remove) | ✅ |
| Classy donation widget (7-day feed, graceful empty state) | ✅ |
| HubSpot pipeline funnel (deal stages, Ask Made highlighted) | ✅ |
| #21: 📋 Make Task button in hover bar (bug fix) | ✅ |
| #20: Renamed 'needs-response' → 'Important / Not Addressed'; To Do bucket (📌) | ✅ |
| #22: Invoices & Receipts bucket (invoice/receipt/payment classifier) | ✅ |
| #23: Delete All button on newsletter, sales, fyi-mass buckets | ✅ |
| #24/#25: Sales / Spam? bucket (cold outreach classifier) | ✅ |

**Tests added:** 27 new tests (sprint3.test.js) — **269 total passing**
**Email buckets now:** needs-response, to-do, team, classy-onetime, invoices, fyi-mass, classy-recurring, calendar-notif, docs-activity, automated, newsletter, sales (12 buckets)

---

## Sprint 4 — Reporting & Weekly Intelligence
*Status: PLANNED — next to execute*

### Panel deliberation (post-Sprint 3 convening)

**ED Users panel (6/6):**
> "I spend Sunday nights assembling board updates. I pull from Gmail, from Classy, from our spreadsheets. It takes 3 hours. Automate the first draft. I want to push a button on Sunday and have a draft board report waiting for me in my Docs. That's a 3-hour time save every month."

ED vote: AI board report draft (6/6), one-click Google Doc export (6/6), weekly brief (5/6 — "make Monday morning feel different")

**Data panel (5/6):**
> "The data is all here in the app: emails handled (we count them), tasks completed (we track done/undone), meetings attended (calendar), words donated (Classy). Build the narrative from the data. AI writes the first draft. Don't make Kayla assemble numbers — pull them automatically."

Data vote: auto-assembled metrics (6/6), AI narrative generation (5/6), don't require manual data entry (6/6 — "if it requires effort to run it won't get run")

**COO panel (6/6):**
> "Accountability without more meetings. A weekly digest that shows: what got done, what's overdue, who didn't respond to a key email. Make it auto-generated every Monday. I want to open the app Monday morning and see the week summarized."

COO vote: weekly brief auto on Monday (6/6), overdue task visibility (6/6), reply rate by sender (4/6 — "useful but secondary")

**CFO panel (6/6):**
> "The board report needs to export to Google Doc or PDF. Boards don't want to log into apps. One click: 'Generate Board Report' → Google Doc ready to share. That's what I need. The AI can write it but a human has to review it before the board sees it."

CFO vote: Google Doc export (6/6), requires human review before share (6/6 — "never auto-send to board"), include financial summary if Classy data available (5/6)

**Unicorn CEO panel (5/6):**
> "Weekly brief auto-generated every Monday at 7am. She reads it on the way in. She walks in already knowing what happened last week, what's at risk this week, who she needs to call. That's the product. Weekly intelligence, not just a report."

CEO vote: Monday morning brief (6/6), AI narrative quality over raw data dump (6/6), keep it under 300 words (4/6 — "must be scannable in 2 minutes")

**UX panel (6/6):**
> "One button, one click. 'Generate Weekly Brief' on Today tab every Monday. No configuration, no form to fill out. The data is already here — just generate. Show a spinner, show the result inline. If they want the Doc, second button: 'Save to Drive.'"

UX vote: one-button generate (6/6), inline preview before Drive save (6/6), no required fields (6/6)

**CRO panel (4/6):**
> "The brief should include donor highlights — who gave this week, biggest gift, any lapsed donors who re-engaged. That's the data I care about in a Monday brief. Fundraising context in the weekly narrative."

CRO vote: donor highlights in brief (5/6), include lapsed re-engagement signal (4/6)

**Product team resolution (Kayla as PM):**
- Feature 1: Weekly brief button on Today — generates AI summary of last 7 days (emails handled, tasks completed, meetings, key donors if Classy available), inline display, save to Drive
- Feature 2: Board report draft — same data, longer format, structured with sections, one-click Google Doc creation
- Feature 3: Team activity digest deferred — requires team member tracking we don't have yet

**Product team plan:**
- Feature 1: Weekly brief generator (Today tab, Monday-highlight button or any-day access, < 300 words, AI-written from in-app data, save to Drive)
- Feature 2: Board report draft (longer structured format, one-click Google Doc, explicitly marked "DRAFT — review before sharing")

**New env vars needed:** None (uses existing ANTHROPIC_API_KEY and Google Drive API)
**New API routes:** `/api/weekly-brief` (POST, auth-guarded)

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
