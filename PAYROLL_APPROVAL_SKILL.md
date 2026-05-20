# Payroll Approval Skill

## What this skill does

When Debbie Nash (bookkeeper, dnash@dnatsi.com) sends a payroll approval email with a PDF attachment, this skill:

1. **Finds the payroll email** — searches Gmail for the current payroll approval request
2. **Reads the PDF** — extracts the payroll report from the attachment
3. **Finds last month's payroll** — pulls the most recent previous payroll PDF for comparison
4. **Compares the two** — analyzes both reports and produces a clear, per-employee summary of what changed
5. **Asks for approval** — shows the summary and waits for your go-ahead before sending a reply

---

## Trigger

Run this skill when you say something like:
- "Review payroll"
- "Payroll approval"
- "Check the payroll from Debbie"
- "Approve payroll"

---

## Step-by-step instructions

### Step 1: Find the payroll email

Search Gmail for:
- **Query:** `from:@dnatsi.com subject:"Payroll Approval" has:attachment`
- Take the **most recent** match
- If no match found, tell me: "No payroll approval email found. Debbie may not have sent it yet."

Extract from the email:
- Message ID and thread ID (needed for the reply)
- From, To, CC headers (needed for reply-all)
- Subject line
- The date it was sent

### Step 2: Get the PDF attachment

Claude cannot directly download email attachments from Gmail. Use this workaround:

**Option A — Ask me to provide it (fastest):**
Tell me: "I found Debbie's payroll email from [date]. Can you download the PDF attachment and share it with me?"
I'll save it from Gmail and give it to you. Then read the PDF I provide.

**Option B — Find it on Drive (if Debbie shared it there too):**
Search Google Drive for the PDF filename or "payroll" near the email date. Debbie sometimes also shares files via Drive. If found on Drive, read it directly.

**Option C — Use the email body as fallback:**
If the email body itself contains payroll summary text (some payroll systems include a text summary in addition to the PDF), use that text for comparison instead.

Once you have the current payroll content (by any method above), proceed to Step 3.

### Step 3: Find the previous payroll for comparison

**Option A — Ask me for both PDFs at once:**
When asking me to provide the attachment in Step 2, also ask: "And can you also share last month's payroll PDF so I can compare?"

**Option B — Search Drive:**
Search Google Drive for previous payroll files.

**Option C — Compare against what you can see:**
If you only have the current payroll, tell me: "I can see this month's payroll but don't have last month's to compare. Here's what this month shows: [summary]. Want me to proceed with approval or do you want to provide last month's for comparison?"

If no previous payroll found by any method, note: "This is the first payroll — no prior month to compare against."

### Step 4: Compare and summarize

Analyze both payroll reports and produce a clear summary. For each employee:

1. **List the employee by name**
2. **Show what changed:** salary, hours, deductions, taxes, benefits — with old → new values
3. **If nothing changed** for an employee, say "No changes"
4. **Flag anything unusual:** large increases/decreases, new deductions, missing line items, new employees added, employees removed

Format the response like this:

```
💰 Payroll Review — [Month Year]

From: Debbie Nash · Sent: [date]
Comparing against: [previous month date]

📋 Changes:

Laura Lavid
  Regular Pay: $3,500.00 → $3,650.00 (+$150.00)
  Federal Tax: $310.42 → $325.50 (+$15.08)

Carmen Alcantara
  Hours: 38.00 → 40.00 (+2.00)

✅ No changes:
  Gretchen Roberts, Adjoa Kittoe

⚠️ Flags:
  None (or list anything unusual)

Ready to approve?
```

**Important:** If you cannot identify employee names in the PDF text, describe the changes by category (earnings, deductions, taxes) with specific numbers. Never show raw unstructured PDF text — always interpret it.

### Step 5: Wait for approval

After showing the summary, ask me: **"Reply-all 'I approve, thank you' to Debbie?"**

Only proceed when I confirm. Then:

- **Reply-all** to the original email thread (this is critical — always reply-all, never reply to sender only)
- **To:** Debbie (the From address on the original email)
- **CC:** everyone on the original To and CC fields
- **Subject:** `Re: [original subject]`
- **Body:** `I approve, thank you`
- Send as a threaded reply (use the thread ID and In-Reply-To header)

After sending, confirm: "Approval sent to Debbie (reply-all to thread)."

---

## FFC team members (for reference)

| Name | Role | Email |
|---|---|---|
| Laura Lavid | Staff | laura@freshfoodconnect.org |
| Gretchen Roberts | Staff | gretchen@freshfoodconnect.org |
| Carmen Alcantara | Staff | carmen@freshfoodconnect.org |
| Adjoa Kittoe | Staff | adjoa@freshfoodconnect.org |
| Debbie Nash | Bookkeeper | dnash@dnatsi.com |
| Brittany | Staff | brittany@freshfoodconnect.org |

---

## Important rules

- **Always reply-all.** Every reply must include all original To and CC recipients. This is a universal rule — never reply to sender only.
- **Never auto-send.** Always show the comparison summary and wait for my explicit "yes" or "approve" before sending.
- **Never show raw PDF text.** Always interpret and summarize it into a readable per-employee breakdown.
- **Flag surprises.** If someone's pay changed by more than 10%, if a new employee appeared, or if a deduction was removed — call it out explicitly.
- **If the PDF can't be parsed,** tell me what went wrong and offer to open the email in Gmail so I can review it manually. Don't silently fail.
- **One payroll at a time.** If there are multiple pending payroll emails, handle the most recent one. Mention if there are older unapproved ones.
