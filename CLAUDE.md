# CLAUDE.md — FFC Command Center

Executive operations dashboard for Fresh Food Connect, a nonprofit connecting communities to fresh food. Built for a single user (the executive director) running daily from a browser tab.

---

## Development philosophy

Decisions from a joint panel of engineering and nonprofit leaders, resolved by Kayla (PM):

**Scope mode: HOLD.** Scrutinize accepted scope with maximum rigor. Do not expand scope, add features, or think 10x unless Kayla explicitly asks. Default to reduction for bug fixes — surgical cuts only. Never speculate about future needs.

**Zero silent failures.** Every failure mode must be visible. No swallowed errors. No generic catches that hide what actually went wrong. If something fails, the system must know it failed, surface the reason, and return a meaningful response.

**Plan before coding.** For any non-trivial change: write the what, why, and which files before touching code. Get alignment, then implement.

**Systematic over ad-hoc.** Follow the process. Don't improvise solutions to problems that have a defined approach in this file.

**Evidence over claims.** Don't say a change "should work" — run the tests, check the ratio, verify the behavior.

---

## Scope discipline

Default is **HOLD**:
- Implement exactly what was asked, nothing more
- Push back on additions: "that's out of scope for this change — should I add it to a separate task?"
- Do not add error handling for scenarios that can't happen
- Do not add configuration for things that don't need to vary
- Do not add abstractions for code that runs in one place

Switch to **REDUCTION** for bug fixes: find the smallest change that fixes the issue.

Switch to **EXPANSION** only when Kayla explicitly asks to think bigger or explore what's possible.

---

## Auth pattern — copy this exactly for every new API route

Every API route starts with the same three functions. Do not inline or abbreviate them. Copy them verbatim from `src/pages/api/drafts.js`:

```js
parseCookies(req)       // parses cookie string → object
refreshToken(rt)        // POSTs to Google OAuth token endpoint
getToken(req, res)      // checks ffc_at, silently refreshes if expired, returns token or null
```

Then the handler follows this shape:

```js
export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // ... fetch from Google API using `Bearer ${token}`
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
```

**Never** expose tokens to the client. **Never** skip the `getToken` guard.

Cookies in use:

| Cookie | Contents |
|---|---|
| `ffc_at` | Google access token |
| `ffc_rt` | Google refresh token |
| `ffc_exp` | Expiry timestamp (ms) |

All cookies are `HttpOnly; Secure; SameSite=Lax`.

---

## Error handling

Every `catch` block must:
1. Name the failure — what operation failed and with what inputs
2. Return a specific error response, not a generic one
3. Never silently swallow the exception

```js
// Required pattern
} catch (error) {
  console.error('drafts:send', { draftId, status: error.status, message: error.message });
  return res.status(500).json({ error: error.message || 'Failed to send draft' });
}

// Forbidden
} catch (e) {
  return res.status(500).json({ error: 'Something went wrong' });
}
```

This applies to both API routes and client-side fetch calls.

---

## Observability

**Structured console logging** is the standard. No paid tools required.

Every API route failure path must log a structured object — not just the error string:

```js
console.error('route:operation', { id, status, message: error.message })
```

Format: `'module:action'` as the first arg, context object as the second. This makes logs scannable in Vercel's log viewer.

Required on:
- Every `catch` block in an API route
- Every Google API response that is not `ok`
- Every `getToken` returning `null` (log the reason if knowable)

Not required on:
- Client-side UI state changes
- Expected empty-state responses (no drafts, no events)

---

## Email reply behavior

**Reply-all is always the default.** When composing a reply (in `ComposeForm` or any automated send like payroll approval), always include the original To and CC recipients in the outgoing CC. Never default to reply-to-sender-only.

- `ComposeForm` reply mode: CC initializes to `[email.to, email.cc].filter(...).join(', ')`
- Payroll approval POST: passes `cc` built from original email's To + CC
- `buildRawEmail` in `src/lib/email.js` already supports a `cc` parameter — always pass it for replies

The toggle in ComposeForm lets the user switch to sender-only if needed, but reply-all is the starting state.

---

## Email classification (`classifyEmail` in `index.js`)

The classifier runs client-side on every email object returned by `/api/data`. The buckets in priority order:

| Bucket key | Meaning |
|---|---|
| `needs-response` | Requires a reply from the ED |
| `fyi-mass` | Mass send (≥20 recipients), not Classy |
| `classy-onetime` | One-time donation notification |
| `team` | Internal @freshfoodconnect.org sender |
| `classy-recurring` | Classy platform notification |
| `calendar-notif` | Google Calendar notification |
| `docs-activity` | Drive/Docs activity email |
| `automated` | noreply / no-reply / system mailer |
| `newsletter` | List-Unsubscribe / List-Id / bulk precedence |

**Key rule:** DropboxSign / HelloSign always → `needs-response`, regardless of other signals. Do not move this check.

**Mass-send threshold is 20.** It was raised from a lower value to reduce false positives on small-team sends. Do not lower it without a concrete reason.

When modifying `classifyEmail`, trace through a representative email for each bucket you might affect before committing. Write the test case first.

---

## Data flow

```
index.js load
  → GET /api/data          emails (50/page, unread only) + today's calendar events
  → GET /api/drafts        draft list (batched 10 at a time)
  → GET /api/monday-digest weekly briefing (parallel fetches)
  → GET /api/signature     email signature HTML
  → GET /api/board-prep    check for upcoming board meeting (21-day window)
  → GET /api/birthday      check for today's birthdays in calendar
  → GET /api/credit-card?action=findAllocationEmail   check for CC allocation email from @dnatsi.com

user action
  → POST /api/email-actions   archive / label / snooze
  → POST /api/send-email      send composed email
  → PUT  /api/drafts          send existing draft
  → DELETE /api/drafts?id=    delete draft
  → GET /api/email-body?id=   full message body (on expand)
  → GET /api/contact-history  per-contact thread list
  → POST /api/drive-note      add bullet to 1:1 Google Doc (smart insertion)
  → GET /api/credit-card?action=checkTeamCompletion   check who filled in CC allocations
  → GET /api/credit-card?action=draftNudge            create reminder draft for team member
  → POST /api/credit-card?action=draftReplyToDebbie   create threaded reply draft
```

All fetches use `credentials: 'include'` so cookies flow with every request.

**Key flow diagrams** — maintain these when the flows change:

```
Auth flow:
/api/auth/login
  → builds Google OAuth URL with scopes
  → redirect to Google consent screen
  → Google redirects to /api/auth/callback?code=...
  → callback exchanges code for access + refresh tokens
  → sets ffc_at, ffc_rt, ffc_exp as HttpOnly cookies
  → redirect to /

Token refresh (inside getToken):
request arrives
  → parseCookies → ffc_at, ffc_rt, ffc_exp
  → if no ffc_at → return null → 401
  → if Date.now() > ffc_exp and ffc_rt exists
      → POST oauth2.googleapis.com/token
      → if access_token → update ffc_at + ffc_exp cookies → return new token
      → if no access_token → return null → 401
  → else → return ffc_at

classifyEmail() decision tree:
email arrives
  → DropboxSign / HelloSign in from? → needs-response (always, stop here)
  → recipientCount >= 20 AND not Classy/HubSpot? → fyi-mass
  → has List-Unsubscribe / List-Id / bulk precedence?
      → Classy or fundrais in from? → classy-recurring
      → else → newsletter
  → calendar-notification / calendar.google.com in from? → calendar-notif
  → drive-shares / docs activity in from? → docs-activity
  → noreply / no-reply / notifications@ / mailer-daemon in from? → automated
  → Classy in from/subject + donation/gift/contribut in subject? → classy-onetime
  → Classy in from? → classy-recurring
  → freshfoodconnect / @ffc in from? → team
  → recipientCount <= 3? → needs-response
  → default → needs-response
```

---

## Testing — TDD required

The **test-to-code ratio must be ≥ 1.3** at all times (lines of test code ÷ lines of production code).

**RED → GREEN → REFACTOR — always in this order:**
1. Write a failing test that describes the behavior
2. Write the minimum production code to make it pass
3. Refactor without breaking the test

**What to test:**
- `classifyEmail` — every bucket, edge cases (DropboxSign exception, mass-send threshold, list headers)
- `isRealMeeting` — block words, solo events, hangout link presence
- `getQuickReplies` — each category branch
- `buildDigestText` — all combinations of zero/nonzero inputs
- API route handlers — auth guard (no token → 401), Google API failure (→ 500), happy path shape
- `extractCalendarRsvpLinks` — accept/decline/maybe extraction, `&amp;` decoding, missing links

**Measuring the ratio:**
```bash
find . -name "*.test.js" -not -path "*/node_modules/*" | xargs wc -l
find . -name "*.js" -not -name "*.test.js" -not -path "*/node_modules/*" -not -path "*/.next/*" | xargs wc -l
```

If the ratio drops below 1.3, write more tests before any other work.

---

## Code review — Claude subagent

After any non-trivial implementation, before marking the work done, spawn a review subagent with this checklist:

- [ ] Auth guard present on every new API route (`getToken` → 401 if null)
- [ ] Every `catch` block logs structured context and returns a named error
- [ ] Test ratio ≥ 1.3 (run the measurement)
- [ ] No tokens, cookies, or secrets in client-side code
- [ ] `classifyEmail` edge cases covered if classifier was touched
- [ ] No new dependencies added without explicit approval
- [ ] Scope held — no additions beyond what was asked

Fix any flags before considering the work complete.

---

## Frontend conventions

- **No external UI library.** All styles are inline using the `T` theme object at the top of `index.js`.
- **`T` is the single source of truth for colors.** Never hardcode a color. Add to `T` first.
- **State lives in `index.js`.** No Redux, Context, or Zustand. Use `useState` / `useCallback` / `useMemo` / `useRef`.
- Components are defined in the same file unless size makes it unwieldy.
- `isRealMeeting()` filters calendar events — drops solo blocks without a Hangouts link. Do not surface "hold" / "OOO" / "focus" / "gym" / "commute" blocks.

---

## Key constants (do not rename without updating all references)

```js
TEAM        // six FFC staff members with name, initials, email, meetingStyle, docName
            //   meetingStyle: "notes" (→ Google Doc), "email", "email-chat", "email-doc" (email + doc)
            //   docName: exact Google Doc name for drive-note API (e.g. "Laura & Kayla 1:1")
COLOR_SCHEMES // five theme presets (fresh, ocean, sunset, lavender, slate) with light/dark variants
CATEGORIES  // Fundraising, Finance, Board, Programs, Admin, External, Marketing
URGENCY     // Critical, High, Medium, Low
BUCKETS     // email classification display config (label, icon, color, priority)
QUOTES      // daily motivational quotes, rotated by day-of-month
```

---

## Spam/sales learning

The classifier has a two-layer learning system:
1. **Hardcoded rules** in `classifyEmail()` — salesFromDomains list + salesSignals keyword scan
2. **Learned overrides** in `learnedBuckets` (localStorage `ffc_learned_buckets`) — per-sender and per-domain

**🚫 Spam button** (on all non-sales emails): deletes email + saves `sender@domain` and `domain` → `"sales"` in learnedBuckets. Future emails from that domain auto-route to sales bucket.

**✅ Not Spam button** (on sales-bucketed emails): moves to inbox + removes sender/domain from learnedBuckets.

The learned overrides are checked in `emailsByBucket` derivation (line ~3205) before the static classifier runs.

---

## Credit card allocation flow

**Trigger:** Email from `@dnatsi.com` with subject containing "credit card", "CC", "transactions", or "allocation" (within 30 days).

**API:** `/api/credit-card` with actions: `findAllocationEmail`, `checkTeamCompletion`, `draftNudge`, `draftReplyToDebbie`, `checkSheet`.

**Panel:** 5-step flow — Email → Team Status → Nudge → Review → Reply to Debbie. All actions create drafts (never auto-send).

---

## Team This Week — drive-note smart insertion

The `POST /api/drive-note` endpoint:
1. Finds the Google Doc by exact `docName` (from TEAM constant) or falls back to `"1:1 {firstName}"`
2. Reads the doc content via Google Docs API
3. Scans for a section with a **future date** (parses various date formats)
4. If found → appends bullet to that section
5. If not found → creates a new dated section matching existing heading style + bullet format

---

## Google API notes

- **Gmail:** Use `gmail.googleapis.com` (not `www.googleapis.com/gmail`).
- **Drafts:** Fetch via `/drafts/{id}?format=full` — not the messages endpoint. The messages endpoint does not return draft body.
- **Calendar:** `singleEvents=true` is required to expand recurring events. Always pass `timeMin` and `timeMax`.
- **Batch size:** Fetch draft details in batches of 10 to stay under Gmail rate limits.
- All Google API calls go server-side. No Google API calls from the browser.

---

## What to avoid

- Do not add a database or session store.
- Do not make Google API calls from the browser.
- Do not generalize `classifyEmail` into a config file — the logic is intentionally readable inline.
- Do not add TypeScript.
- Do not add a component library.
- Do not swallow errors silently.
- Do not add features that weren't asked for.
- Do not add error handling for scenarios that cannot occur.

---

## Running locally

```bash
npm install
# create .env.local with:
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
npm run dev
```

Auth: `/api/auth/login` → Google consent → `/api/auth/callback` → sets cookies → redirects to `/`.

---

## Before making changes

1. Read the relevant file(s) first.
2. Check if `getToken` / `parseCookies` / `refreshToken` are already present — do not duplicate.
3. For classifier changes: trace a representative email through each affected bucket.
4. For new API routes: copy auth boilerplate exactly, then add route logic.
5. For UI changes: use `T` for colors, inline styles, no new deps.
6. Write the failing test before writing the code.
7. After implementation: run the review subagent checklist.
