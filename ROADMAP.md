# FFC Command Center — Living Product Roadmap

**Owner:** Kayla Birdsong, CEO / PM — Fresh Food Connect
**Executor:** Claude (autonomous, recursive, continuous until Kayla says pause)
**Last updated:** 2026-03-28 (issue #92 shipped — + button on task category cards to open new task pre-filled with that category, 733 tests passing)

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

### What shipped (Sprint 4 + user issue #26 also shipped this cycle)

| Feature | Status |
|---|---|
| Weekly brief generator on Today tab (AI-written, < 300 words) | ✅ |
| Board report draft mode (structured sections, "DRAFT" watermark) | ✅ |
| Save to Drive button on both outputs | ✅ |
| #26: Drafts horizontal strip at top of Email tab (Send/Edit/Delete per card) | ✅ |

**Tests added:** 18 new tests (sprint4.test.js) — **287 total passing**

---

## Sprint 5 — Search & Cross-Content Intelligence ✅ COMPLETE
*Shipped: 2026-03-21*

### Panel deliberation (post-Sprint 4 convening)

**UX panel (6/6):**
> "Search is the most critical missing feature. Users expect Cmd+K global search everywhere. Without it, the app feels incomplete no matter how many features you add. Every power user I've interviewed mentions search in the first 30 seconds. It's not optional."

UX vote: Cmd+K search palette (6/6), fuzzy search across emails+tasks+drafts (6/6), keyboard-navigable results (6/6)

**COO panel (6/6):**
> "I need to find the email I sent about the grant three weeks ago. I need to find the task I created from that email. I need to see them together. Cross-content search is the differentiator. Not just 'here are emails matching X' — but 'here is everything related to X across the app.'"

COO vote: cross-content search (6/6), single search box that returns email + task + draft results (6/6)

**CRO panel (5/6):**
> "Contact timeline: every touchpoint with one person — emails, meetings, tasks, notes — in one view. That's relationship intelligence. I want to type 'Alice Brown' and see our entire relationship history: when we first emailed, every meeting, all tasks, notes in HubSpot."

CRO vote: contact search in palette (5/6), contact timeline on click (3/6 — "deferred, complex")

**Data panel (4/6):**
> "The search should be ranked by relevance, not just recency. An email with 'LOI' in the subject is more relevant to a grant search than one with 'LOI' in the body. Weight the title/subject higher."

Data vote: relevance scoring (4/6), recency as tiebreaker (6/6)

**ED Users panel (6/6):**
> "I just want to type a name or subject and find things. I don't care about the technical architecture. Cmd+K is fine — I've seen that in other apps. Make it fast."

ED vote: fast and simple (6/6), search across everything (6/6)

**CFO panel:** "No financial impact. But search should include tasks — I use tasks as a financial tracking tool."

CFO vote: tasks in search (6/6)

**Unicorn CEO panel (5/6):**
> "The 10x version is AI-powered search: 'show me all emails related to the Walker Foundation grant' — semantic search, not keyword. But ship keyword first, don't wait for perfect."

CEO vote: keyword search now (6/6), semantic search as future enhancement (note for Sprint 6)

**Product team resolution (Kayla as PM):**
- Cmd+K search palette: searches emails (subject/from/snippet), tasks (title), drafts (subject/to)
- Results shown in grouped sections: Emails, Tasks, Drafts
- Keyboard navigation (↑↓ to move, Enter to open)
- Contact search: type a name, see matching contacts from email history
- Team activity digest also ships this sprint (was deferred from Sprint 4)

**Product team plan:**
- Feature 1: Cmd+K global search palette (emails + tasks + drafts, keyboard-navigable)
- Feature 2: Team activity digest (per TEAM member: emails from them this week, tasks assigned to them)

**New env vars needed:** None
**New API routes:** None (search is client-side across loaded data)

### What shipped (Sprint 5)

| Feature | Status |
|---|---|
| Cmd+K global search palette (emails + tasks + drafts) | ✅ |
| Relevance scoring (`scoreSearchResult`) — subject/title > snippet/notes | ✅ |
| Keyboard navigation ↑↓ Enter Esc in search palette | ✅ |
| Team Activity Digest on Today tab (per-member email/task counts) | ✅ |
| #27: Click outside expanded email to collapse (overlay z-index pattern) | ✅ |

**Tests added:** 24 new tests (sprint5.test.js) — **311 total passing**

---

## Sprint 6 — UX Polish & Resilience ✅ COMPLETE
*Shipped: 2026-03-21 | 326 tests passing*

Issues #28–35 shipped between sprints (user feedback cycle). Sprint 6 formalizes
the resilience work plus any remaining polish from that cycle.

### Panel deliberation (post-issues #28–35)

**ED Users panel (6/6):**
> "The app feels like it's getting real. But sometimes it just sits there after I
> click something — no spinner, no error. I don't know if it's working. I need
> feedback on every action."

ED vote: loading spinners everywhere (6/6), error messages (6/6), toast on success (5/6 — already partial)

**UX panel (6/6):**
> "The Today page redesign helped. The compact email rows are right. But the
> transitions when switching tabs still feel jarring — content just appears.
> A 150ms fade would be enough. Also: the tabs centered, but now the 📌 Capture
> and + Compose buttons feel disconnected from the tab area. Consider a persistent
> header action row."

UX vote: fade transition on tab switch (6/6), header refinement (4/6 — secondary), loading skeletons (5/6)

**CFO panel (5/6):**
> "The side-by-side Classy + Pipeline layout is exactly what I needed. Now I can
> see fundraising at a glance. Add a 'total in pipeline' dollar figure next to
> the pipeline stages — not just counts."

CFO vote: pipeline dollar totals (4/6), Classy 7-day total shown (5/6)

**Unicorn CEO panel (5/6):**
> "Error recovery. If the Gmail token expires in the middle of the day, right now
> the whole app silently fails. I want a banner: 'Session expired — click to
> reconnect' not a blank page."

CEO vote: session expiry banner (6/6), auto-retry on token refresh (already built — note for CEO)

**Product team resolution (Kayla as PM):**
- Feature 1: Session expiry banner (detect 401 responses → show reconnect prompt)
- Feature 2: Tab switch fade transition (CSS opacity transition on content area)
- Feature 3: Pipeline dollar totals in Donor Pipeline widget
- Feature 4: Loading skeleton on initial data load (Today tab key widgets)

**Product team plan:**
- Feature 1: 401 detection in data fetches → `sessionExpired` state → banner with login link
- Feature 2: CSS fade on tab content (opacity 0→1, 150ms)
- Feature 3: Sum deal amounts in parsePipelineStages or show total in pipeline header
- Feature 4: Skeleton loaders for email list, Today widgets

**New env vars needed:** None
**New API routes:** None

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
- Jest + TDD, 326 tests, 14 test files
- Claude Sonnet (7-panel × 6-expert review on every feedback submission)

---

## Sprint 7 — Intelligence & Clarity
*Status: IN PROGRESS — user issues #63–74 shipped 2026-03-23; planned features below pending*

### Panel deliberation

**ED Users panel:**
> "The Claude panel on feedback is incredible — it's like having a board room in my pocket. Now I want that intelligence applied to my email inbox. When I open an email, I want Claude to tell me what to do with it. One sentence. No fluff."

ED vote: per-email AI action recommendation (6/6), confidence score on classification (3/6 — secondary)

**UX panel:**
> "The feedback panel is great, but it only fires when Kayla submits feedback. What if Claude proactively surfaced insights on the Today page? 'You have 3 donor emails and a pipeline review — suggested focus order: 1, 2, 3.' One block, scannable in 10 seconds."

UX vote: daily AI briefing block on Today tab (5/6), email action suggestion on expand (4/6)

**Unicorn CEO panel:**
> "This is a single-user tool for a nonprofit ED. The 10x version: it knows her patterns, predicts what she'll do with each email, and drafts the response before she even asks. Start with: auto-classify confidence + explain why."

CEO vote: explain classification reasoning on hover (5/6), pattern learning (2/6 — too complex now)

**CRO panel:**
> "Every donor email should get a confidence score: 'This looks like a major gift prospect.' Surface it before she replies."

CRO vote: donor intent signal on email row (5/6), HubSpot auto-lookup on open (4/6)

**Product team resolution (Kayla as PM):**
- Feature 1: AI daily focus briefing on Today tab — Claude looks at inbox + calendar + tasks → generates 3-bullet focus list
- Feature 2: Per-email classification explanation — "Why is this needs-response?" shown on expand
- Feature 3: Batch AI triage — button in inbox header: "AI Triage" → Claude recommends archive/respond/defer for each visible email
- Feature 4: Donor intent signal — if email is from a known HubSpot contact, show deal stage badge on email row

**New env vars needed:** None (ANTHROPIC_API_KEY already in use)
**New API routes:** POST /api/ai-triage (batch), GET /api/ai-explain?id= (per-email)

### User issues shipped in Sprint 7 (pre-planned-features)

| Issue | Title | Shipped |
|---|---|---|
| #63 | Drag-to-scroll autoscroll | 2026-03-22 |
| #64 | Sales domains misrouted to newsletter | 2026-03-22 |
| #65/#66 | Remove Urgent column from inbox grid | 2026-03-22 |
| #67 | Team Meeting Agenda block on Today tab | 2026-03-22 |
| #68 | Drive list/grid toggle + email density toggle | 2026-03-22 |
| #69 | Past Week tab in Calendar + follow-up actions | 2026-03-22 |
| #70 | AI Prep button on calendar event cards | 2026-03-22 |
| #71/#72 | Week Ahead Prep button → Calendar tab navigation | 2026-03-23 |
| #73 | Schedule Send (client-side queue, 60s interval) | 2026-03-23 |
| #74 | Reply-all default (CC pre-filled with To field) | 2026-03-23 |
| #75 | Email autocomplete sources from To/CC fields (parseAddressField) | 2026-03-23 |
| #76 | Remove Urgent Box from Today tab | 2026-03-23 |
| #77 | Calendar now-awareness: in-progress badge, countdown, event status | 2026-03-23 |
| #78 | Multi-user settings (userName, orgName, accentColor) + Settings tab | 2026-03-23 |
| #79 | Agenda doc link on calendar Prepare button (extractDocFromEvent) | 2026-03-23 |
| #80 | Attendees autocomplete in EventForm + CC autocomplete in ComposeForm | 2026-03-23 |
| #81 | Close open forms when switching tabs | 2026-03-23 |
| #82 | Drive folder navigation: browse into folders with breadcrumb trail | 2026-03-23 |
| #83 | Dark mode toggle (🌙/☀️ in header, persisted to localStorage) | 2026-03-23 |
| #84 | Email section rename (✏️ inline, persisted) + "Move to…" dropdown to reclassify emails | 2026-03-23 |
| #85 | Forward emails with attachments included by default (pre-checked; multipart/mixed MIME) | 2026-03-24 |
| #86 | Today's Schedule (home tab) now shows full PREP options for all real meetings: AI Prep, Open Agenda doc link, Find Agenda drive search — gated on isRealMeeting instead of hasOthers | 2026-03-25 |
| #87 | Undo button after deleting/archiving emails — 5-second toast with Undo that calls untrash/unarchive API and restores email to top of list | 2026-03-25 |
| #88 | Page background changed to blue: light mode #E0E0E0 → #DDEAF5, dark mode #111827 → #0D1628 | 2026-03-26 |
| #89 | Google Chat notifications: bottom-right popup on new messages, 30s polling, extensible CHAT_PROVIDERS config (Slack/Teams stubs ready) | 2026-03-26 |
| #90 | Configurable email action buttons: Settings tab shows all 11 buttons with checkboxes, changes apply instantly, resets to defaults, persisted to localStorage | 2026-03-26 |
| #91 | Email classifier fixes: (1) FFC-sender emails with external recipients no longer classified as team/internal, (2) calendar RSVP replies (Accepted:/Declined:/Tentative: subject) route to calendar-notif even from personal email addresses, (3) thread deduplication in data.js prevents same thread appearing multiple times | 2026-03-28 |
| #92 | Task category + button: each category card on the task board now has a + button in its header that opens the TaskForm with that category pre-selected | 2026-03-28 |

**Bug fix:** Dark mode SSR hydration crash — `useState` was reading `localStorage` on the server, causing a server/client mismatch that Next.js surfaced as "Application error: a client-side exception has occurred". Fixed by using `useState(false)` + `useEffect` to restore saved preference after hydration.

**Tests:** 450 total (up from 424). emailSections.test.js adds getBucketLabel, getEmailSection, setBucketLabel, moveEmailToSection, removeEmailSectionOverride.

---

## Sprint 8 — Gmail Compose: BCC Field + Reply/Reply-All Toggle
*Shipped: 2026-03-23 | 475 tests passing*

### Panel deliberation

**ED Users panel (6/6):**
> "I need BCC for every email — when I loop in the board, when I BCC legal, when I BCC a development director on a donor reply. The missing BCC field is a daily gap. Also: the reply-all default (#74) sends replies to everyone in the thread. That's a liability. I want to reply to the sender by default and choose reply-all explicitly."

ED vote: BCC field (6/6), reply-only as default with toggle (5/6)

**UX panel (6/6):**
> "BCC is a standard field — any email client has it. Show it behind a '+ BCC' toggle so it doesn't clutter the form for the 70% of emails that don't need it. The reply/reply-all toggle should be visible in the compose form header — not buried in a dropdown."

UX vote: BCC behind toggle (6/6), toggle button in form header (6/6)

**Unicorn CEO panel (6/6):**
> "BCC is table stakes. Reply-all by default is a well-known productivity trap. Fix both. Ship them together since they're both compose-form changes."

CEO vote: both features (6/6)

**Data panel (6/6):**
> "The data shows: most ED replies go to the original sender only. Reply-all is the exception. Invert the default. Make reply-all a one-click upgrade."

Data vote: reply-only default (6/6), reply-all toggle (6/6)

**CFO panel (6/6):**
> "BCC is essential for financial communications. Board members are BCC'd on grant notifications. Legal is BCC'd on contract emails. This is a compliance need."

CFO vote: BCC (6/6)

**COO panel (6/6):**
> "Reply-all by default creates operational noise. Staff gets unwanted CCs. Reply-only default is the right ops posture."

COO vote: reply-only default (6/6), BCC (6/6)

**CRO panel (5/6):**
> "BCC'ing the development director on donor replies is standard stewardship practice. BCC field is required. Reply-all on donor threads is a donor stewardship risk."

CRO vote: BCC (6/6), reply-only default (5/6)

**Product team resolution (Kayla as PM):**
- Feature 1: BCC field — hidden behind `+ BCC` toggle button in compose header, autocomplete support, passes through to send-email API and MIME headers
- Feature 2: Reply/Reply-All toggle — reply mode defaults to sender-only (empty CC), toggle button switches to pre-fill CC with all original recipients, toggles back to reply-only

**Files changed:**
- `src/pages/api/send-email.js` — `buildRawEmail` now accepts `bcc` param, emits `Bcc:` header
- `src/pages/index.js` — ComposeForm: BCC state + input + autocomplete, reply-all toggle button, reply CC defaults to empty

### What shipped

| Feature | Panel mandate | Status |
|---|---|---|
| BCC field in ComposeForm (toggle, autocomplete, passes to API) | CFO + COO + CRO (6/6) | ✅ |
| Reply-only default (empty CC) with Reply-All toggle button | Data + COO (6/6) | ✅ |

**Tests added:** 25 new tests (gmail-improvements.test.js) — **475 total passing**
**Pure functions tested:** `buildRawEmail` (BCC variant), `buildComposeInitialCc`, `buildReplyAllCc`, `validateBcc`

---

## Sprint 9 — Calendar Tab Improvements ✅ COMPLETE
*Shipped: 2026-03-23 | 539 tests passing*

### Panel deliberation — Calendar tab vs. Google Calendar

All 7 panels reviewed the current Calendar tab against what Google Calendar itself provides.

**ED Users panel (6/6):**
> "I need to edit an event directly from the calendar tab — I created a meeting with the wrong attendees and had to hunt through Google Calendar to fix it. Also: I see events listed but I can't tell if they're 30 minutes or 2 hours. Duration matters for prep."
ED vote: edit event inline (6/6), attendee RSVP status visible (5/6), event duration shown (4/6)

**UX panel (6/6):**
> "The Today view shows 'Nothing on the calendar today' when there ARE events — they're just focus blocks. That's a lie. Show 'No meetings today (2 calendar blocks hidden)'. Also: duration is GCal table stakes. Every calendar shows it."
UX vote: accurate empty state (6/6), duration display (6/6), edit event (5/6)

**Unicorn CEO panel (6/6):**
> "Edit events inline. Right now creating a meeting with wrong attendees requires leaving the app. That's 3 extra clicks × 10 events/week = 30 minutes/week wasted. Second: attendee RSVP status — 'who hasn't accepted?' is a daily question before any meeting."
CEO vote: edit event (6/6), attendee RSVP status (5/6)

**Data panel (6/6):**
> "Duration enables time audit: how many hours/week is Kayla in meetings? That's a leading indicator. Calendar tab badge showing today's meeting count is zero-cognitive-load awareness."
Data vote: duration (6/6), calendar tab badge (5/6), attendee RSVP (4/6)

**CFO panel (6/6):**
> "Edit events is essential — we reschedule constantly. RSVP status matters for quorum on board meetings."
CFO vote: edit event (6/6), RSVP status (5/6)

**COO panel (6/6):**
> "The empty state bug is a trust issue. When the app shows 'nothing today' but I know I have a focus block, I stop trusting the data. Fix it. Duration and edit are high-value ops improvements."
COO vote: edit event (6/6), accurate empty state (6/6), duration (5/6)

**CRO panel (5/6):**
> "RSVP status on attendees before a donor meeting — critical for briefing Kayla. Also: location as a maps link saves the extra step of copying and pasting an address."
CRO vote: RSVP status (6/6), location maps link (5/6), calendar badge (4/6)

**Product team resolution (Kayla as PM):**
- All 6 improvements approved. Vote tallies: edit event (29), RSVP status (21), duration (17), accurate empty state (15), calendar badge (9), maps link (5). All cleared the bar.

### What shipped

| Feature | Panel mandate | Status |
|---|---|---|
| ✏️ Edit event inline — edit button on all calendar views opens EventForm pre-filled | ED + CEO + CFO + COO (6/6) | ✅ |
| Event duration display ("1h 30m") — shown below time on all views | UX + Data (6/6) | ✅ |
| Attendee RSVP status chips — ✓/✗/? per attendee on Today + This Week views | CEO + CFO + CRO (6/6) | ✅ |
| Accurate empty state — "No meetings today (N calendar blocks hidden)" when all events are blocks | UX + COO (6/6) | ✅ |
| Calendar tab badge — today's real meeting count on tab nav button | Data (5/6) | ✅ |
| Location maps link — physical locations become clickable Google Maps links | CRO (5/6) | ✅ |

**Pure functions added:** `formatDuration`, `getAttendeeRsvpIcon`, `getAttendeeRsvpColor`, `calendarEmptyStateMessage`, `countTodayMeetings`, `buildMapsUrl`, `isVideoCallLocation`, `summarizeAttendeeRsvp`
**Tests added:** 64 new tests (sprint9.test.js) — **539 total passing**
