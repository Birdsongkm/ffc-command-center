/**
 * Pure classification functions — no side effects, fully testable.
 * Imported by index.js and tested by src/__tests__/classify.test.js
 */

// Returns true if any address in to/cc is outside @freshfoodconnect.org / @ffc (#91)
function hasExternalRecipient(toStr, ccStr) {
  const addrs = [(toStr || ''), (ccStr || '')]
    .join(',')
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(Boolean);
  return addrs.some(a => !a.includes('freshfoodconnect') && !a.includes('@ffc'));
}

function classifyEmail(e) {
  const from = (e.from || "").toLowerCase();
  const subj = (e.subject || "").toLowerCase();
  const listUnsub = e.listUnsubscribe || "";
  const listId = (e.listId || "").toLowerCase();
  const precedence = (e.precedence || "").toLowerCase();
  const recipientCount = e.recipientCount || 1;

  // DropboxSign / HelloSign = HIGH PRIORITY regardless of other signals
  if (from.includes("dropboxsign") || from.includes("hellosign") || from.includes("dropbox.com")) {
    return "needs-response";
  }

  // Raised threshold to 20 to avoid false mass-send classification on small-team sends
  const isMassSend = recipientCount >= 20;

  if (isMassSend && !from.includes("classy") && !from.includes("hubspot")) return "fyi-mass";
  // Sales outreach platforms: check before newsletter — these tools add List-Unsubscribe headers
  // for CAN-SPAM compliance, which would otherwise misroute them to newsletter (#64)
  const salesFromDomains = [
    "apollo.io", "outreach.io", "salesloft.com", "mailshake.com", "lemlist.com",
    "woodpecker.co", "reply.io", "yesware.com", "mixmax.com", "persistiq.com",
    "klenty.com", "instantly.ai", "smartlead.ai", "saleshandy.com",
  ];
  if (salesFromDomains.some(d => from.includes(d))) return "sales";
  // Invoices checked before newsletter: billing emails often carry List-Unsubscribe headers
  // (e.g. Turing, QuickBooks) which would otherwise land them in newsletter instead of Financial
  if (subj.includes("invoice") || subj.includes("receipt") || subj.includes("payment") || subj.includes("billing") || subj.includes("statement") || subj.includes("your order") || subj.includes("charge") || subj.includes("subscription renewal")) return "invoices";
  if (listUnsub || listId || precedence === "list" || precedence === "bulk") {
    if (from.includes("classy") || from.includes("fundrais")) return "classy-recurring";
    return "newsletter";
  }
  if (from.includes("calendar-notification") || from.includes("calendar.google.com")) return "calendar-notif";
  // Calendar RSVP replies arrive from the attendee's own email, not calendar.google.com (#91)
  if (/^(accepted|declined|tentative):/.test(subj)) return "calendar-notif";
  if (from.includes("drive-shares-dm") || from.includes("comments-noreply") || from.includes("docs.google.com") || from.includes("drive.google.com")) return "docs-activity";
  // Classy checks must come before the generic noreply check — Classy sends from noreply addresses
  if ((from.includes("classy") || subj.includes("classy")) && (subj.includes("donation") || subj.includes("gift") || subj.includes("contribut"))) return "classy-onetime";
  if (from.includes("classy")) return "classy-recurring";
  if (from.includes("noreply") || from.includes("no-reply") || from.includes("notifications@") || from.includes("mailer-daemon") || from.includes("postmaster")) return "automated";
  // Only classify as team if all recipients are internal — external recipient means it's not purely internal (#91)
  if ((from.includes("freshfoodconnect") || from.includes("@ffc")) && !hasExternalRecipient(e.to, e.cc)) return "team";
  // Sales/spam: subject/snippet keyword deep scan
  const salesSignals = [
    "quick call", "15 minutes", "30 minutes", "45 minutes", "hop on a call", "schedule a demo",
    "book a demo", "request a demo", "just following up", "following up on my last",
    "wanted to connect", "wanted to reach out", "reaching out because",
    "partnership opportunity", "help you grow", "help your team", "help your organization",
    "increase your", "boost your", "improve your", "save you time",
    "we help nonprofits", "we help organizations", "we work with nonprofits",
    "solutions for", "platform for", "tool for nonprofits",
    "free trial", "no credit card", "limited time", "special offer", "exclusive offer",
    "our platform", "our software", "our solution", "our tool",
    "reach out to", "i wanted to reach", "i'm reaching out",
    "checking in to see", "would love to chat", "would love to connect",
    "can we connect", "can we talk", "can i get 10 minutes", "can i get 15 minutes",
    "business opportunity", "mutual benefit", "thought you'd be interested",
    "saw your organization", "came across your nonprofit", "found your website",
    "unsubscribe", "opt out", "opt-out",
  ];
  if (salesSignals.some(s => subj.includes(s) || (e.snippet || "").toLowerCase().includes(s))) return "sales";
  if (recipientCount <= 3) return "needs-response";
  return "needs-response";
}

function isRealMeeting(ev) {
  const t = (ev.title || "").toLowerCase();
  const solo = !ev.attendees || ev.attendees.length <= 1;
  const blockWords = ["hold", "lunch", "ooo", "out of office", "block", "focus", "personal", "gym", "break", "commute", "travel"];
  if (blockWords.some(w => t.includes(w)) && solo) return false;
  if (solo && !ev.hangoutLink) return false;
  return true;
}

function getQuickReplies(email) {
  const cat = classifyEmail(email);
  const sub = (email.subject || "").toLowerCase();
  if (cat === "classy-onetime") {
    return [
      { label: "Thank donor", text: "Thank you so much for your generous gift! Your support makes a real difference for Fresh Food Connect and the communities we serve." },
      { label: "Acknowledge", text: "Received — thank you! We'll be sending a formal acknowledgment shortly." },
      { label: "Loop in team", text: "Thanks for flagging this! Looping in the team to follow up." },
    ];
  }
  if (cat === "team") {
    return [
      { label: "Sounds good", text: "Sounds good — thanks for the update!" },
      { label: "Let's discuss", text: "Thanks for sharing. Let's discuss this at our next check-in." },
      { label: "On it", text: "Got it — I'll take a look and follow up." },
    ];
  }
  if (sub.includes("meeting") || sub.includes("call") || sub.includes("sync")) {
    return [
      { label: "Confirm", text: "That works for me — see you then!" },
      { label: "Reschedule", text: "I need to move this — can we find another time? Sending some options." },
      { label: "Decline", text: "Unfortunately I can't make this one. Could you send notes afterward?" },
    ];
  }
  return [
    { label: "Yes, sounds good", text: "Yes, that sounds good! Thanks for reaching out." },
    { label: "Let me get back to you", text: "Thanks for this — let me look into it and get back to you by end of week." },
    { label: "Loop in team", text: "Thanks! I'm going to loop in my team to make sure we follow up properly." },
  ];
}

function extractCalendarRsvpLinks(html) {
  if (!html) return {};
  const links = {};
  const accept = html.match(/href="(https?:\/\/[^"]*?action=ACCEPT[^"]*?)"/i);
  const decline = html.match(/href="(https?:\/\/[^"]*?action=DECLINE[^"]*?)"/i);
  const maybe = html.match(/href="(https?:\/\/[^"]*?action=TENTATIVE[^"]*?)"/i);
  if (accept) links.accept = accept[1].replace(/&amp;/g, '&');
  if (decline) links.decline = decline[1].replace(/&amp;/g, '&');
  if (maybe) links.maybe = maybe[1].replace(/&amp;/g, '&');
  return links;
}

module.exports = { classifyEmail, isRealMeeting, getQuickReplies, extractCalendarRsvpLinks };
