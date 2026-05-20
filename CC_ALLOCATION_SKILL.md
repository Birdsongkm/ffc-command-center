# Credit Card Allocation Skill

## What this skill does

When Debbie Nash (bookkeeper, dnash@dnatsi.com) sends the monthly credit card allocation email, this skill:

1. **Finds the email** — searches Gmail for the current month's CC allocation email from Debbie
2. **Extracts the spreadsheet** — pulls the Google Sheets link from the email body
3. **Checks team status** — reads the spreadsheet to see who has filled in their allocations and who hasn't
4. **Reports a summary** — tells you exactly who's done and who still needs to act

You handle nudging and replying yourself.

---

## Trigger

Run this skill when you say something like:
- "Check CC allocations"
- "Who's done their credit card allocations?"
- "Did the team fill in the spreadsheet?"
- "Check on Debbie's allocation email"

---

## Step-by-step instructions

### Step 1: Find the allocation email

Search Gmail for the most recent email matching:
- **Subject contains** any of: "credit card", "CC transactions", "transactions ready", "allocations", "allocation"
- **Date:** current month only (after the 1st of this month)
- **Sender:** from @dnatsi.com, OR from Debbie Nash, OR forwarded through HubSpot with Debbie's name

If no matching email is found, tell me: "No CC allocation email found for this month yet."

### Step 2: Extract the spreadsheet link

From the email body (check BOTH plain text and HTML — Debbie's emails sometimes come through HubSpot where the link is only in an HTML `<a href>`):

- Look for a Google Sheets URL: `https://docs.google.com/spreadsheets/d/{ID}/...`
- Extract the spreadsheet ID from the URL

If no spreadsheet link is found, tell me: "Found Debbie's email but couldn't extract the spreadsheet link. Here's the email subject: [subject]" and show me the email snippet so I can find the link myself.

### Step 3: Check who's completed allocations

Open the spreadsheet and read the data. The sheet tab name follows the pattern `{Year} CC Purchases` (e.g., "2026 CC Purchases").

**Team members to check (by initials in column A):**

| Name | Initials | Email |
|---|---|---|
| Laura Lavid | LL | laura@freshfoodconnect.org |
| Gretchen Roberts | GR | gretchen@freshfoodconnect.org |
| Carmen Alcantara | CA | carmen@freshfoodconnect.org |
| Adjoa Kittoe | AK | adjoa@freshfoodconnect.org |

**Do NOT check:** Debbie Nash (she's the bookkeeper, not an allocator) or Brittany (excluded from CC allocations).

**How to check:** For each team member, find their initials in column A. If any cells in their row (columns E through J) have content, they're **done**. If those cells are empty, they're **pending**.

### Step 4: Report the summary

Format the response like this:

```
💳 CC Allocation Status — [Month Year]

Spreadsheet: [link]
Debbie's email: [date] — "[subject]"

✅ Done:
- Carmen Alcantara (CA)
- Laura Lavid (LL)

⏳ Still needed:
- Gretchen Roberts (GR) — gretchen@freshfoodconnect.org
- Adjoa Kittoe (AK) — adjoa@freshfoodconnect.org

[X] of 4 complete.
```

Include email addresses for pending people so I can quickly nudge them.

---

## Important rules

- **Never auto-send emails.** Only report status. I'll handle nudging.
- **Current month only.** Don't surface last month's email.
- **Check if I already replied.** If I've already replied to Debbie's thread, mention that: "You already replied to this thread on [date]."
- The spreadsheet link may be in HTML only (HubSpot-forwarded emails). Always check both plain text and HTML email body.
- If the Google Sheets API fails or the sheet tab name doesn't match, tell me what went wrong — don't silently fail.
