# FFC Command Center — Product Roadmap

> **Autonomous execution mode.** Panels convene after each sprint. Roadmap updates recursively. Claude continues until Kayla says pause.
>
> Panel composition per sprint review:
> - **Users** — 6 nonprofit executive directors
> - **UX** — 6 UX/product designers
> - **Unicorn CEOs** — 6 founder/CEOs (Garry Tan tier)
> - **Data** — 6 data scientists
> - **CFOs** — 6 nonprofit financial leads
> - **COOs** — 6 nonprofit operations leads
> - **CROs** — 6 development directors / chief revenue officers
> - **Product team** — Kayla (PM/CEO), UX, Architect, QA, Staff Eng, DevOps

---

## Sprint 1 — Foundation & Power User Efficiency ✅ COMPLETE
*Shipped: 2026-03-20*

**Panel consensus:** All panels flagged speed and at-a-glance clarity as the highest ROI before adding new features. Unicorn CEOs: "every second of friction compounds." EDs: "I need to know what's waiting without clicking."

| Feature | Why | Status |
|---|---|---|
| Count badges on Tasks + Drafts tabs | At-a-glance load — EDs + UX | ✅ |
| Keyboard shortcuts (j/k/e/r/? + tab switching) | Power-user velocity — Unicorn CEO + COO | ✅ |
| `?` shortcuts overlay | Discoverability — UX | ✅ |
| Oldest-waiting email indicator on Today tab | "what's been ignored longest" — ED panel | ✅ |

---

## Sprint 2 — AI-Assisted Drafting & Smart Prioritization
*Planned*

**Panel consensus:** EDs said "I spend 40% of my time on email." Data scientists: "the classifier is good — now make it act on what it knows." Unicorn CEOs: "AI should do the first draft, human does the final judgment."

| Feature | Why |
|---|---|
| AI-suggested reply drafts (one click → pre-filled compose) | ED time savings — highest ROI |
| Smart email priority score on Today tab (urgency × age × sender importance) | Data + ED panels |
| Auto-label suggestions when archiving | COO — "reduce manual sorting" |
| Contact relationship strength indicator (email frequency) | CRO — donor engagement proxy |

---

## Sprint 3 — Fundraising & Development Dashboard
*Planned*

**Panel consensus:** CROs and CFOs both flagged missing fundraising visibility. "This app serves the ED but the ED's primary job is revenue and mission — that's not visible yet."

| Feature | Why |
|---|---|
| Donor pipeline summary on Today tab (Classy + HubSpot data) | CRO — see major gifts in motion |
| Grant deadline tracker (manual entry, calendar-synced) | CFO + CRO — "grants drive our survival" |
| Classy donation stream (real-time, last 7 days) | CRO — momentum visibility |
| Monthly giving trend sparkline | Data + CFO |

---

## Sprint 4 — Reporting & Weekly Intelligence
*Planned*

**Panel consensus:** EDs: "I spend Sunday nights assembling board updates." Data scientists: "the data is all here — automate the narrative." COOs: "accountability without more meetings."

| Feature | Why |
|---|---|
| Auto-generated weekly brief (emails handled, tasks completed, meetings had, $ raised) | ED + COO + Board |
| Board report draft generator (AI-written from week's data) | ED + Unicorn CEO |
| Team activity digest (who replied, what got done) | COO |
| Export to Google Doc / PDF | CFO + Board |

---

## Sprint 5 — Search & Cross-Content Intelligence
*Planned*

**Panel consensus:** UX: "You can't search anything. That's a critical gap at this stage." COOs: "I need to find the email I sent about the grant three weeks ago."

| Feature | Why |
|---|---|
| Global search (emails + drafts + tasks + notes) | UX — critical missing feature |
| Contact timeline (all emails, meetings, tasks with one person) | CRO + ED |
| Email → task → meeting thread view | COO — "close the loop" |
| Drive file search from sidebar | UX |

---

## Sprint 6 — Resilience & Operations
*Planned*

**Panel consensus:** DevOps + QA: "The app works but has no error recovery, no offline state, no performance optimization." CFO: "I need this to be reliable enough to trust for board meetings."

| Feature | Why |
|---|---|
| Offline/stale state indicators | UX — trust signals |
| Error boundary + retry UI | QA — zero silent failures |
| Email pagination performance (virtual scroll) | Data — large inboxes |
| Mobile-responsive layout | UX + ED — "I check this on my phone" |

---

## Recursive execution protocol

```
After each sprint:
1. Panel review — convene all 7 panels, synthesize findings
2. Update this ROADMAP.md — mark complete, reprioritize backlog
3. Plan next sprint — top 3-5 features by panel consensus
4. Execute — TDD, parallel where possible
5. Close GitHub issue — document what shipped
6. Repeat → until Kayla says pause
```

**Guiding principles across all sprints:**
- Test-to-code ratio ≥ 1.3 at all times
- Zero silent failures — every error visible
- Scope discipline — ship the sprint, no gold-plating
- Auth guard on every new API route
- No new dependencies without explicit approval
