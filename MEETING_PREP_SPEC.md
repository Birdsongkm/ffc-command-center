# Meeting Prep Spec — External Meetings

Handoff spec for the enhanced meeting prep flow in FFC Command Center.

**Status:** Ready for implementation. All open decisions resolved by a 12-agent panel (Unicorn CEOs ×2, COOs ×2, UX/UI ×2, PMs ×2, Large-scale Nonprofit EDs ×2, Small-scale Nonprofit EDs ×2).

| Decision | Resolution | Vote |
|---|---|---|
| Moves-management depth | v1 lean (Last Contact + stage branching) | 9–3 |
| External research source | Gmail / Drive / Calendar only | 11–1 |
| Per-person record grain | Drive doc only (parse dated headings if needed later) | 9–3 |

---

## Why this exists

The current "Prep" button on calendar events is a status toggle — click it, get a green checkmark, nothing happens. This replaces that with a real prep flow for external meetings.

Motivating example: 10am meeting today with Pat Wynne (external).

---

## Trigger

Enhanced Prep activates on a calendar event when **both**:

1. `isRealMeeting(event) === true` (already drops drive time, lunch, OOO, focus, commute, solo blocks without a Hangouts link)
2. At least one attendee has email domain `!== 'freshfoodconnect.org'`

Meetings with multiple external attendees: research all, group the brief per person.

Mixed FFC + external: triggers; research only the external attendee(s).

---

## Timing — pre-generate, never on-demand

Never block Kayla on a cold research call before a meeting.

- **Scheduled generation at 5am** for every qualifying event in the next **24 hours** (trimmed from 48h — most beyond-24h briefs go stale or get superseded by overnight email).
- **Same-day invites:** regenerate when the invite is received.
- Every brief carries a visible **"Generated Xh ago"** timestamp and a **Refresh** action.
- **No silent expiry.** Briefs older than 14 days show a **"Stale — refresh?"** chip but content is preserved (recurring quarterly donors had research deleted out from under them in the prior version of this spec; that's the silent-failure pattern CLAUDE.md forbids).

---

## UI placement — right-side drawer

- Drawer anchored right, ~480px wide.
- Opens from the calendar event row. Closes without losing state.
- Not modal (severs context), not inline (crushes adjacent rows), not new route (overkill).
- Streams sections into **fixed slots** (skeletons visible immediately, fill top-to-bottom). Do not reorder sections based on completion time.

---

## Brief structure (order matters)

Every factual claim carries an inline citation (source URL or Gmail message ID). No citation → the sentence doesn't render.

1. **Why this meeting** — pinned at the very top. One-liner pulled from the calendar invite description, or fallback to the most recent thread subject with this person. *"Booked 3/12 from Pat's reply re: spring event sponsorship."* (Kayla forgets why a meeting got booked more often than she forgets the last email.)
2. **Last Contact** — second pin. One sentence, Gmail-derived. Example: *"You last emailed Pat on March 3 re: the spring event; he didn't reply."*
3. **Identity + Confidence** — email used, org match, **Confidence chip** (Low / Med / High) with resolution trail (e.g., *"Matched via pat@acme.org + 3 threads"*).
   - **Below Med** → render explicit banner: *"Identity unresolved — showing Gmail/Drive signals only."* Hard-skip any cross-person linking.
4. **Organization Overview** — 2 lines max. Derived from email signatures, calendar org, Drive sharing context. **Renders only when those internal sources actually contain org info.** No external lookup in v1.
5. **Relationship with FFC** — giving history with FFC (from any FFC giving emails / Classy notifications in Gmail), prior touches Kayla may have forgotten, current cultivation context if inferable.
6. **Connection Points** — shared threads, mutual contacts in cc/bcc history, shared Drive docs.

### Removed from v1

- ~~**Giving History (external public signals)**~~ — without a web search source, the section is structurally hollow. Internal Classy/donation signals roll into "Relationship with FFC" instead.
- ~~**Possible Next Moves**~~ — without external context or moves-management spine, suggested actions become fortune-cookie filler that erodes trust in the rest of the brief. Add in v2 once a structured record exists.

### Stage-dependent behavior

The brief weights sections differently based on FFC giving history (parsed from Gmail/Classy signals only):

- **New / unknown** → Why this meeting + Connection Points emphasized.
- **Active / major donor** → Relationship with FFC + Last Contact emphasized.

No CRM-style stage field in v1. Inferred from Gmail signal.

---

## Sparse-data path

If there are no Gmail threads, no shared Drive docs, no FFC giving signal — do **not** render empty sections (reads as "broken"). Instead:

- Render a single **"Low-Signal Contact"** card.
- State explicitly what's missing: *"No prior email threads. No shared docs. No FFC giving history found."*
- Offer a free-text field: *"Add context manually before the meeting?"* — persisted to the person's Drive doc.

The absence of data is itself a finding; it must be stated, not hidden.

---

## Per-source status pills

Each data source (Gmail, Drive, calendar) renders with a status pill:

- **Loaded** — data present
- **Partial** — data present, with known gaps
- **Failed** — include the specific API + error
- **Timed Out** — include the timeout duration
- **Skipped** — source intentionally not queried in v1 (e.g., external research). Distinguishes product decision from bug. Required to satisfy CLAUDE.md zero-silent-failures.

Brief header banner: *"3 of 3 sources complete"* until all done.

---

## Drive model — one doc per person

**Not one doc per meeting.** Recurring meetings with the same person must not produce a graveyard of near-duplicate docs.

- Keyed by attendee email (normalized: lowercased, trimmed).
- Doc title: `{Full Name} — Meeting Prep`.
- Each meeting **appends a dated section** (e.g., `## Prep for 2026-04-17 meeting`).
- Research sections (Why this meeting, Org Overview, Relationship with FFC, Connections) **update in place** on regenerate.
- Live meeting notes are **append-only**, hand-edited.
- v1 parses dated `##` headings to compute "days since last touch" if the dashboard ever needs it. No JSON sidecar.

### Folder location — private

- Path: `FFC Command Center / Meeting Prep /` — owned by Kayla, **no sharing**.
- **Not** in `Fundraising / Individual Donors/Donations / Meeting Notes` (that folder is shared; relationship context must never leak to a donor who is a collaborator on an adjacent doc).

### Privacy guard — fails closed, silently

- The save/write path **refuses to write** if the target folder ACL contains any non-`@freshfoodconnect.org` email, or any sharing beyond Kayla's own ownership.
- **No confirmation dialog.** A dialog Kayla sees daily becomes muscle-memory click-through, especially at 9:58am before a 10am meeting. Hard fail with a structured log + a visible banner in the drawer: *"Cannot save brief — target folder is shared. Contact admin."*
- ACL check runs on **every write**, not just at folder creation, because Drive sharing inherits from parents and can drift.

### Doc exists before the meeting

Doc is auto-created when the brief generates, not after a "Save" click. Kayla takes live notes in the same doc during the call. **No "Save to Drive" button.**

---

## Completion signal — drop the checkmark

The old Prep checkmark was theater. Replace with a passive, evidence-based pill on the event row:

1. **Brief ready** — generated and drawer has not been opened.
2. **Opened** — Kayla viewed the brief.
3. **Doc touched** — Drive `modifiedTime > meeting end time`. (Robust signal; replaces the brittle "content beyond template stub" heuristic from the prior spec, which would have false-negatived on short notes and false-positived on prep-time edits.)

If a meeting ended without "Doc touched," the end-of-day digest surfaces: *"3 meetings today, no notes captured — add quick recap?"*

---

## Technical notes

- **Existing code to reuse:**
  - `/api/create-doc` — supports `folderId`
  - `/api/drive` — has `folders` action for searching
  - `isRealMeeting()` in `src/pages/index.js` — trigger filter
- **New API routes needed:**
  - `/api/person-research` — aggregator: identity resolution, Gmail threads, Drive collaborators, calendar context. **No external/web sources in v1.**
  - `/api/drive` may need a `createFolder` action if not already present
  - Scheduled job endpoint for the 5am pre-generation (Railway scheduler or cron)
- **Rules from CLAUDE.md:**
  - All Google API calls **server-side only**. No browser-side Google calls.
  - Auth guard on every new route: `getToken` → 401 if null. Copy boilerplate from `src/pages/api/drafts.js`.
  - Zero silent failures. Every `catch` logs structured context and returns a specific error.
  - **TDD required.** Write failing tests first. Maintain test-to-code ratio ≥1.3.
  - Use `T` theme object for all colors. Inline styles. No component library.
  - **No new npm dependencies** without explicit approval.
- **Concurrency note:** Another agent may be editing `src/pages/index.js`. Keep edits there minimal and localized; build new UI as component files under `src/components/` (create the dir if needed).

---

## Out of scope for v1

- External public-signal research (web search, 990 lookup, wealth screening). Resolved by panel: gmail-drive-only.
- Automated ask-amount recommendations.
- Net-worth estimation / wealth-screening integrations.
- "Possible Next Moves" suggestions (deferred until structured record exists).
- "Giving History" as a standalone external section (rolled into "Relationship with FFC" using internal signals only).
- Cross-person CRM views (portfolio, pipeline, "who haven't I touched in 60 days").
- Structured per-person record (JSON sidecar / front-matter). Drive doc is the single source of truth in v1.
- Post-meeting auto-debrief / transcript integration.
- Integration with board prep flow (separate feature).
- Schema versioning (premature at zero docs; revisit if v2 changes the doc shape).

---

## Panel rationale (for reference, not requirements)

The strongest cross-cutting argument across all 12 panelists: **trust in this tool dies on the first hallucinated donor fact.** That single principle drove four of the v1 cuts (external research, Giving History, Possible Next Moves, identity-degradation banner) and the privacy hard-fail. The lean v1 ships in days, not weeks, and real usage will tell the next iteration which fields Kayla actually re-reads before a meeting.
