import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Head from "next/head";

// ═══════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════
const LIGHT_T = {
  bg: "#DDEAF5", surface: "#FFFFFF", card: "#FFFFFF", cardHover: "#D4D4D4",
  border: "#D8E4D2", borderLight: "#E8F0E4", text: "#2C3E2C", textMuted: "#6B8068",
  textDim: "#94AC8E", accent: "#4A9B4A", accentDark: "#357A35", accentBg: "#E8F5E8",
  gold: "#C4942A", goldBg: "#FFF8E8", danger: "#D45555", dangerBg: "#FFF0F0",
  info: "#4A8BB5", infoBg: "#EDF5FB", white: "#FFFFFF",
  emailBlue: "#3B82C4", emailBlueBg: "#EBF3FB", emailBlueBorder: "#B8D4F0",
  calGreen: "#3A9B5A", calGreenBg: "#E6F5EC", calGreenBorder: "#A8DDB8",
  taskAmber: "#C4942A", taskAmberBg: "#FFF8E8", taskAmberBorder: "#E8D5A0",
  driveViolet: "#7C5AC4", driveVioletBg: "#F0EBF9", driveVioletBorder: "#C4B0E8",
  urgentCoral: "#D45555", urgentCoralBg: "#FFF0F0", urgentCoralBorder: "#F0B8B8",
  stickyYellow: "#F5E642", stickyYellowBg: "#FFFDE8", stickyYellowBorder: "#E8E0A0",
  leafDecor: "#4A9B4A",
};

const DARK_T = {
  bg: "#0D1628", surface: "#1F2937", card: "#1F2937", cardHover: "#2D3748",
  border: "#2A4A2A", borderLight: "#1A3020", text: "#E8F0E8", textMuted: "#9CAE98",
  textDim: "#7A9278", accent: "#5AAD5A", accentDark: "#4A9B4A", accentBg: "#0F2010",
  gold: "#D4A840", goldBg: "#1F1A00", danger: "#E06868", dangerBg: "#200808",
  info: "#5A9BC5", infoBg: "#0A1820", white: "#1F2937",
  emailBlue: "#4A90D4", emailBlueBg: "#0A1828", emailBlueBorder: "#1A3855",
  calGreen: "#4AAD6A", calGreenBg: "#081A10", calGreenBorder: "#1A4A28",
  taskAmber: "#D4A840", taskAmberBg: "#1F1A00", taskAmberBorder: "#3A3010",
  driveViolet: "#9B7ADA", driveVioletBg: "#120A28", driveVioletBorder: "#2A1A4A",
  urgentCoral: "#E06868", urgentCoralBg: "#200808", urgentCoralBorder: "#3A1010",
  stickyYellow: "#F5E642", stickyYellowBg: "#1A1A00", stickyYellowBorder: "#3A3A10",
  leafDecor: "#5AAD5A",
};

// Mutable module-level reference — reassigned at the top of each render
// so all sub-components (LightbulbFAB, ComposeForm, etc.) see the current theme.
let T = LIGHT_T;

const CATEGORIES = [
  { id: "fundraising", label: "Fundraising", color: "#7C5AC4", bg: "#F0EBF9" },
  { id: "finance", label: "Finance", color: "#C4942A", bg: "#FFF8E8" },
  { id: "board", label: "Board", color: "#3B82C4", bg: "#EBF3FB" },
  { id: "programs", label: "Programs", color: "#3A9B5A", bg: "#E6F5EC" },
  { id: "admin", label: "Admin", color: "#6B8068", bg: "#F0F5EE" },
  { id: "external", label: "External", color: "#C47A3A", bg: "#FFF4E8" },
  { id: "marketing", label: "Marketing", color: "#C44A8B", bg: "#FBE8F3" },
];

// Fill in real email addresses here
const TEAM = [
  { name: "Laura Lavid", initials: "LL", email: "laura@freshfoodconnect.org", meetingStyle: "notes" },
  { name: "Gretchen Roberts", initials: "GR", email: "gretchen@freshfoodconnect.org", meetingStyle: "notes" },
  { name: "Carmen Alcantara", initials: "CA", email: "carmen@freshfoodconnect.org", meetingStyle: "email-chat" },
  { name: "Adjoa Kittoe", initials: "AK", email: "adjoa@freshfoodconnect.org", meetingStyle: "notes" },
  { name: "Debbie Nash", initials: "DN", email: "dnash@freshfoodconnect.org", meetingStyle: "email" },
  { name: "Brittany", initials: "BR", email: "brittany@freshfoodconnect.org", meetingStyle: "notes" },
];

// ── Email action button configuration (#90) ────────────────────────────────────
const EMAIL_ACTION_BUTTONS = [
  { id: "reply",     label: "↩ Reply",       defaultOn: true },
  { id: "aiDraft",   label: "✨ Draft Reply", defaultOn: true },
  { id: "trash",     label: "🗑 Delete",      defaultOn: true },
  { id: "markRead",  label: "✓ Mark Read",   defaultOn: true },
  { id: "star",      label: "⭐ Star",        defaultOn: true },
  { id: "makeTask",  label: "📋 Make Task",   defaultOn: true },
  { id: "toDo",      label: "📌 To Do",       defaultOn: true },
  { id: "moveTo",    label: "📂 Move to…",    defaultOn: true },
  { id: "forward",   label: "↗ Forward",      defaultOn: true },
  { id: "snooze",    label: "⏰ Snooze",       defaultOn: true },
  { id: "makeEvent", label: "📅 Make Event",  defaultOn: true },
];

function isEmailActionVisible(id, config) {
  if (!config || !(id in config)) {
    const btn = EMAIL_ACTION_BUTTONS.find(b => b.id === id);
    return btn ? btn.defaultOn : false;
  }
  return !!config[id];
}

function getEmailActionConfig(stored) {
  const defaults = {};
  EMAIL_ACTION_BUTTONS.forEach(b => { defaults[b.id] = b.defaultOn; });
  return { ...defaults, ...(stored || {}) };
}

// ── Chat providers — add Slack / Teams entries here to enable future integrations ──
const CHAT_PROVIDERS = [
  { id: "google-chat", name: "Google Chat", apiPath: "/api/chat-messages", icon: "💬" },
  // { id: "slack", name: "Slack", apiPath: "/api/slack-messages", icon: "💬" },
  // { id: "teams", name: "Microsoft Teams", apiPath: "/api/teams-messages", icon: "💬" },
];

function chatProviderFor(id, providers) {
  return (providers || CHAT_PROVIDERS).find(p => p.id === id) || null;
}

function isNewChatMessage(msg, lastPollMs) {
  if (!msg || !msg.createTime) return false;
  return new Date(msg.createTime).getTime() > lastPollMs;
}

function formatChatSender(msg) {
  return msg?.sender?.displayName || msg?.sender?.name || "Unknown";
}

function formatChatPreview(msg, maxLen = 80) {
  const text = msg?.text || "[attachment]";
  return text.length > maxLen ? text.slice(0, maxLen) + "\u2026" : text;
}

function buildChatNotifications(messages, lastPollMs) {
  return messages
    .filter(m => isNewChatMessage(m, lastPollMs))
    .map(m => ({
      id: m.name || String(Date.now()),
      sender: formatChatSender(m),
      preview: formatChatPreview(m),
      spaceName: m.spaceName || "",
      timestamp: new Date(m.createTime).getTime(),
    }));
}

const URGENCY = [
  { id: "critical", label: "Critical", color: "#D45555", bg: "#FFF0F0", dot: "#FF4444" },
  { id: "high", label: "High", color: "#C4942A", bg: "#FFF8E8", dot: "#FFAA33" },
  { id: "medium", label: "Medium", color: "#3B82C4", bg: "#EBF3FB", dot: "#55AAFF" },
  { id: "low", label: "Low", color: "#6B8068", bg: "#F0F5EE", dot: "#6B8068" },
];

// Daily quote — rotates by day of month
const QUOTES = [
  // New Girl
  { text: "I'm not convinced I know how to read. I've just memorized a lot of words.", attr: "Nick Miller, New Girl" },
  { text: "I'm a grown-ass man! ...I want to go home and I want pancakes.", attr: "Nick Miller, New Girl" },
  { text: "My hoodie is my house.", attr: "Nick Miller, New Girl" },
  { text: "I brake for birds. I rock a lot of polka dots. I have touched glitter in the last 24 hours.", attr: "Jess Day, New Girl" },
  // The Office
  { text: "Would I rather be feared or loved? Easy. Both. I want people to be afraid of how much they love me.", attr: "Michael Scott, The Office" },
  { text: "I am running away from my responsibilities. And it feels good.", attr: "Michael Scott, The Office" },
  { text: "I'm not superstitious, but I am a little stitious.", attr: "Michael Scott, The Office" },
  { text: "Wikipedia is the best thing ever. Anyone in the world can write anything they want about any subject. So you know you are getting the best possible information.", attr: "Michael Scott, The Office" },
  { text: "Identity theft is not a joke, Jim! Millions of families suffer every year!", attr: "Dwight Schrute, The Office" },
  { text: "Through concentration, I can raise and lower my cholesterol at will.", attr: "Dwight Schrute, The Office" },
  // Arrested Development
  { text: "I've made a huge mistake.", attr: "Gob Bluth, Arrested Development" },
  { text: "Her?", attr: "George Michael Bluth, Arrested Development" },
  { text: "There's always money in the banana stand.", attr: "George Bluth Sr., Arrested Development" },
  { text: "I don't understand the question and I won't respond to it.", attr: "Lucille Bluth, Arrested Development" },
  // Parks and Rec
  { text: "I am big enough to admit that I am often inspired by myself.", attr: "Leslie Knope, Parks and Rec" },
  { text: "Treat yo self!", attr: "Tom Haverford & Donna Meagle, Parks and Rec" },
  { text: "I have no idea what I'm doing, but I know I'm doing it really, really well.", attr: "Andy Dwyer, Parks and Rec" },
  { text: "Everything hurts and I'm dying.", attr: "Leslie Knope, Parks and Rec" },
  { text: "The key to a good meeting is to end it at a high point. So let's end with waffles.", attr: "Leslie Knope, Parks and Rec" },
  { text: "I typed your symptoms into the thing up here and it says you could have network connectivity problems.", attr: "Tom Haverford, Parks and Rec" },
  { text: "Oh my god, this is so sad. Alexa, play Despacito.", attr: "April Ludgate, Parks and Rec" },
];

// ═══════════════════════════════════════════════
//  EMAIL CLASSIFICATION
// ═══════════════════════════════════════════════
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

  // DropboxSign / HelloSign = HIGH PRIORITY regardless
  if (from.includes("dropboxsign") || from.includes("hellosign") || from.includes("dropbox.com")) {
    return "needs-response";
  }

  // Raised threshold to 20 to avoid false mass-send classification
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
  // Invoices before newsletter: billing emails often carry List-Unsubscribe headers
  // (e.g. Turing, QuickBooks) which would otherwise route them to newsletter instead of Financial
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
  // Payroll approval emails from DNash Accounting (#94)
  if (from.includes("@dnatsi.com") && subj.includes("payroll approval")) return "payroll-approval";
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

function emailAge(dateStr) {
  if (!dateStr) return 0;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

function ageDot(hours) {
  if (hours >= 72) return { color: T.danger, label: "72h+" };
  if (hours >= 48) return { color: "#E88A33", label: "48h+" };
  if (hours >= 24) return { color: T.gold, label: "24h+" };
  return null;
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

// Extract Google Calendar RSVP links from email HTML
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

const SNOOZE_OPTIONS = [
  { label: "Tomorrow morning", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString(); } },
  { label: "Later this week", getValue: () => { const d = new Date(); const daysUntilThu = (4 - d.getDay() + 7) % 7 || 4; d.setDate(d.getDate() + daysUntilThu); d.setHours(8, 0, 0, 0); return d.toISOString(); } },
  { label: "Next week", getValue: () => { const d = new Date(); const daysUntilMon = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + daysUntilMon); d.setHours(8, 0, 0, 0); return d.toISOString(); } },
  { label: "Custom...", getValue: () => null },
];

// ── Sender avatar: initials + deterministic color ────────────────────────────
const AVATAR_COLORS = ["#4A9B4A","#3B82C4","#C4942A","#D45555","#7C5AC4","#3A9B5A","#C44A8B","#C47A3A"];
function senderAvatar(from) {
  const name = (from || "").replace(/<.*>/, "").trim() || "?";
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || "?").toUpperCase();
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return { initials, color: AVATAR_COLORS[hash % AVATAR_COLORS.length] };
}

// ── Sprint 2: Priority scoring + Relationship badges + Label suggestions ──────
function senderTier(fromAddr, contactHistory) {
  const addr = (fromAddr || "").toLowerCase();
  if (addr.includes("@freshfoodconnect.org") || addr.includes("@ffc.")) return "team";
  const hist = contactHistory?.[fromAddr] || contactHistory?.[addr];
  if (!hist) return "unknown";
  if (hist.totalMessages >= 5) return "frequent";
  return "known";
}
function priorityScore(email, contactHistory) {
  const fromAddr = email.from?.match(/<(.+)>/)?.[1] || email.from || "";
  const tier = senderTier(fromAddr, contactHistory);
  const tierWeight = { team: 3, frequent: 2, known: 1.2, unknown: 1 };
  const tw = tierWeight[tier] || 1;
  const ageDays = email.internalDate ? Math.floor((Date.now() - parseInt(email.internalDate)) / 86400000) : 0;
  const ageWeight = Math.min(ageDays, 14);
  const subj = (email.subject || "").toLowerCase();
  const urgencyBonus = subj.includes("urgent") || subj.includes("asap") || subj.includes("critical") ? 10 :
    subj.includes("grant") || subj.includes("deadline") || subj.includes("sign") ? 6 :
    subj.includes("follow up") || subj.includes("invoice") ? 3 : 0;
  return Math.round(tw * (1 + ageWeight * 0.5) + urgencyBonus);
}
function relationshipBadge(fromAddr, contactHistory) {
  const addr = (fromAddr || "").toLowerCase();
  const hist = contactHistory?.[fromAddr] || contactHistory?.[addr];
  if (!hist) return "First contact";
  const lastMs = hist.lastContact ? new Date(hist.lastContact).getTime() : 0;
  const daysSinceLast = lastMs ? Math.floor((Date.now() - lastMs) / 86400000) : 999;
  if (daysSinceLast > 60) return "Lapsed";
  if (hist.totalMessages >= 5) return "Frequent";
  return null;
}
function suggestArchiveLabel(email) {
  const from = (email.from || "").toLowerCase();
  const subj = (email.subject || "").toLowerCase();
  const snippet = (email.snippet || "").toLowerCase();
  const text = from + " " + subj + " " + snippet;
  if (text.includes("donation") || text.includes("donor") || text.includes("fundrais") || text.includes("classy") || text.includes("gift")) return "Fundraising";
  if (text.includes("grant") || text.includes("proposal") || text.includes("loi") || text.includes("rfp")) return "Grants";
  if (text.includes("board") || text.includes("trustee") || text.includes("director")) return "Board";
  if (text.includes("invoice") || text.includes("payment") || text.includes("finance") || text.includes("budget")) return "Finance";
  if (text.includes("calendar") || text.includes("meeting") || text.includes("invite") || text.includes("rsvp")) return "Meetings";
  if (text.includes("@freshfoodconnect.org") || text.includes("team") || text.includes("staff")) return "Team";
  if (text.includes("unsubscribe") || text.includes("newsletter") || text.includes("list-id")) return "Newsletter";
  return null;
}

// ── Sprint 5: Global search + Team activity ───────────────────────────────────
function getScheduledTimeLabel(scheduledAt) {
  const diff = scheduledAt - Date.now();
  if (diff <= 0) return 'Sending now…';
  const mins = Math.round(diff / 60000);
  const hrs = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);
  if (mins < 60) return `Sends in ${mins}m`;
  if (hrs < 24) return `Sends in ${hrs}h`;
  return `Sends in ${days}d`;
}

function groupAgendaItems(items) {
  const groups = {};
  (items || []).forEach(item => {
    const key = item.assignee || 'General';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

function getAutoScrollSpeed(clientY, windowHeight, edgeThreshold = 70) {
  if (clientY < edgeThreshold) return -Math.round((1 - clientY / edgeThreshold) * 12);
  if (clientY > windowHeight - edgeThreshold) return Math.round((1 - (windowHeight - clientY) / edgeThreshold) * 12);
  return 0;
}

function driveFileIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType === 'application/vnd.google-apps.folder') return '📁';
  if (mimeType === 'application/vnd.google-apps.document') return '📝';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return '📊';
  if (mimeType === 'application/vnd.google-apps.presentation') return '📽';
  if (mimeType === 'application/pdf') return '📕';
  return '📄';
}

// Parses a comma-separated address header (To / CC) into { name, email } objects. (#75)
function parseAddressField(str) {
  if (!str) return [];
  return str.split(",").flatMap(part => {
    part = part.trim();
    const match = part.match(/^(.*?)\s*<(.+?)>$/);
    if (match) {
      const name = match[1].replace(/"/g, "").trim();
      const addr = match[2].trim().toLowerCase();
      return addr ? [{ name: name || addr, email: addr }] : [];
    }
    if (part.includes("@")) return [{ name: part.toLowerCase(), email: part.toLowerCase() }];
    return [];
  });
}

// Returns event status relative to now (#77): "inprogress" | "soon" | "upcoming" | "past"
// "soon" = starts within 30 minutes
function getEventStatus(ev, now) {
  if (!ev || !ev.start) return "upcoming";
  const start = new Date(ev.start).getTime();
  const end = ev.end ? new Date(ev.end).getTime() : start + 3600000;
  const n = now || Date.now();
  if (n >= start && n < end) return "inprogress";
  if (start > n && start - n <= 30 * 60 * 1000) return "soon";
  if (n >= end) return "past";
  return "upcoming";
}

// Extracts first Google Doc/Drive URL from an event (description or attachments). (#79)
function extractDocFromEvent(ev) {
  if (!ev) return null;
  if (Array.isArray(ev.attachments)) {
    for (const a of ev.attachments) {
      if (a.fileUrl && a.fileUrl.includes("docs.google.com")) return a.fileUrl;
      if (a.fileUrl && a.fileUrl.includes("drive.google.com")) return a.fileUrl;
    }
  }
  const desc = ev.description || "";
  const match = desc.match(/https?:\/\/(docs|drive)\.google\.com\/[^\s"<>]*/i);
  return match ? match[0] : null;
}

// ── User settings helpers (#78) ───────────────────────────────────────────────
function getDefaultSettings() {
  return { userName: "Kayla", orgName: "Fresh Food Connect", accentColor: "#2D7A3A" };
}
function mergeSettings(saved) {
  return Object.assign({}, getDefaultSettings(), saved || {});
}

// Returns "In Xm" / "In Xh Xm" label for future events (#77)
function minsUntil(ev, now) {
  const start = new Date(ev.start).getTime();
  const n = now || Date.now();
  const diffMs = start - n;
  if (diffMs <= 0) return "";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `In ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `In ${hrs}h ${rem}m` : `In ${hrs}h`;
}

// ── Sprint 9: Calendar tab improvements ──────────────────────────────────────

// Returns human-readable duration string, e.g. "1h 30m", "45m", "2h"
function formatDuration(startISO, endISO) {
  if (!startISO || !endISO) return '';
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diffMs = end - start;
  if (diffMs <= 0) return '';
  const totalMins = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Returns icon for an attendee RSVP status
function getAttendeeRsvpIcon(status) {
  switch ((status || '').toLowerCase()) {
    case 'accepted': return '✓';
    case 'declined': return '✗';
    case 'tentative': return '?';
    case 'needsaction': return '–';
    default: return '–';
  }
}

// Returns a semantic color key for RSVP status
function getAttendeeRsvpColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'accepted': return 'accepted';
    case 'declined': return 'declined';
    case 'tentative': return 'tentative';
    default: return 'pending';
  }
}

// Returns the appropriate empty state message for the calendar today view.
// Returns null when there are real meetings to show.
function calendarEmptyStateMessage(events) {
  if (!events || events.length === 0) return { type: 'no-events', text: 'No events today — enjoy the breathing room!' };
  const realCount = events.filter(isRealMeeting).length;
  const blockedCount = events.length - realCount;
  if (realCount === 0) {
    return {
      type: 'no-meetings',
      text: 'No meetings today',
      subtext: blockedCount === 1 ? `(${blockedCount} calendar block hidden)` : `(${blockedCount} calendar blocks hidden)`,
    };
  }
  return null;
}

// Returns count of real meetings today (for Calendar tab badge)
function countTodayMeetings(events) {
  if (!events || events.length === 0) return 0;
  return events.filter(isRealMeeting).length;
}

// Returns Google Maps URL for a location string, or null if empty/whitespace
function buildMapsUrl(location) {
  if (!location || !location.trim()) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(location.trim())}`;
}

// Returns true if a location string is a video call link (not a physical address)
function isVideoCallLocation(location) {
  if (!location) return false;
  return location.startsWith('http') && (
    location.includes('meet.google') ||
    location.includes('zoom.us') ||
    location.includes('teams.microsoft') ||
    location.includes('webex.com')
  );
}

// Returns summary counts of attendee RSVP statuses
function summarizeAttendeeRsvp(attendees) {
  if (!attendees || attendees.length === 0) return { accepted: 0, declined: 0, tentative: 0, pending: 0 };
  const summary = { accepted: 0, declined: 0, tentative: 0, pending: 0 };
  attendees.forEach(a => {
    const s = (a.status || '').toLowerCase();
    if (s === 'accepted') summary.accepted++;
    else if (s === 'declined') summary.declined++;
    else if (s === 'tentative') summary.tentative++;
    else summary.pending++;
  });
  return summary;
}

function scoreSearchResult(item, query, type) {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  let score = 0;
  if (type === 'email') {
    if ((item.subject || '').toLowerCase().includes(q)) score += 10;
    if ((item.from || '').toLowerCase().includes(q)) score += 8;
    if ((item.snippet || '').toLowerCase().includes(q)) score += 3;
  } else if (type === 'task') {
    if ((item.title || '').toLowerCase().includes(q)) score += 10;
    if ((item.notes || '').toLowerCase().includes(q)) score += 4;
  } else if (type === 'draft') {
    if ((item.subject || '').toLowerCase().includes(q)) score += 10;
    if ((item.to || '').toLowerCase().includes(q)) score += 8;
    if ((item.snippet || '').toLowerCase().includes(q)) score += 3;
  }
  return score;
}
function searchEmails(emailList, query) {
  if (!query || !query.trim()) return [];
  return (emailList || []).map(e => ({ item: e, score: scoreSearchResult(e, query, 'email') })).filter(r => r.score > 0).sort((a, b) => b.score - a.score).map(r => r.item);
}
function searchTasks(taskList, query) {
  if (!query || !query.trim()) return [];
  return (taskList || []).map(t => ({ item: t, score: scoreSearchResult(t, query, 'task') })).filter(r => r.score > 0).sort((a, b) => b.score - a.score).map(r => r.item);
}
function searchDraftsData(draftList, query) {
  if (!query || !query.trim()) return [];
  return (draftList || []).map(d => ({ item: d, score: scoreSearchResult(d, query, 'draft') })).filter(r => r.score > 0).sort((a, b) => b.score - a.score).map(r => r.item);
}
function buildTeamActivity(emailList, taskList, teamMembers) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
  return (teamMembers || []).map(member => {
    const memberEmails = (emailList || []).filter(e => {
      const from = (e.from || '').toLowerCase();
      return from.includes(member.email.toLowerCase()) || from.includes(member.name.toLowerCase().split(' ')[0]);
    });
    const recentEmails = memberEmails.filter(e => {
      const ts = e.internalDate ? parseInt(e.internalDate) : new Date(e.date || 0).getTime();
      return ts >= sevenDaysAgo;
    });
    const assignedTasks = (taskList || []).filter(t => (t.assignee || '').toLowerCase().includes(member.name.toLowerCase()));
    return {
      name: member.name, email: member.email, initials: member.initials,
      recentEmailCount: recentEmails.length,
      completedTaskCount: assignedTasks.filter(t => t.done).length,
      pendingTaskCount: assignedTasks.filter(t => !t.done).length,
    };
  });
}

// ── Sprint 4: Weekly brief context builder ────────────────────────────────────
function buildWeeklyBriefContext(emails, tasks, events, donations) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
  const recentEmails = (emails || []).filter(e => {
    const ts = e.internalDate ? parseInt(e.internalDate) : new Date(e.date || 0).getTime();
    return ts >= sevenDaysAgo;
  });
  const completedTasks = (tasks || []).filter(t => t.done);
  const overdueTasks = (tasks || []).filter(t => !t.done && t.due && new Date(t.due) < new Date());
  const pendingTasks = (tasks || []).filter(t => !t.done);
  const recentMeetings = (events || []).filter(ev => {
    const ts = new Date(ev.start || 0).getTime();
    return ts >= sevenDaysAgo && ts <= now;
  });
  const totalDonations = (donations || []).reduce((sum, d) => sum + (d.amount || 0), 0);
  const donationCount = (donations || []).length;
  return {
    emailCount: recentEmails.length,
    completedTaskCount: completedTasks.length,
    overdueTaskCount: overdueTasks.length,
    pendingTaskCount: pendingTasks.length,
    meetingCount: recentMeetings.length,
    totalDonations,
    donationCount,
    topDonation: donationCount ? Math.max(...(donations || []).map(d => d.amount || 0)) : 0,
  };
}
function formatBriefContext(ctx) {
  const lines = [
    `Emails in inbox this week: ${ctx.emailCount}`,
    `Tasks completed: ${ctx.completedTaskCount}`,
    `Tasks pending: ${ctx.pendingTaskCount}`,
    `Tasks overdue: ${ctx.overdueTaskCount}`,
    `Meetings attended: ${ctx.meetingCount}`,
  ];
  if (ctx.donationCount > 0) {
    lines.push(`Donations received (7 days): ${ctx.donationCount} totaling $${ctx.totalDonations.toLocaleString()}`);
    lines.push(`Largest donation: $${ctx.topDonation.toLocaleString()}`);
  }
  return lines.join('\n');
}

// ── Sprint 3: Grant tracker + Pipeline helpers ────────────────────────────────
const PIPELINE_STAGE_ORDER = ["Prospect", "Cultivating", "Ask Made", "Pledge", "Received"];
function grantDaysUntil(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
function grantDeadlineUrgency(deadline) {
  const days = grantDaysUntil(deadline);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= 7) return "red";
  if (days <= 30) return "amber";
  return "green";
}
function formatGrantCountdown(deadline) {
  const days = grantDaysUntil(deadline);
  if (days === null) return "";
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days`;
}
function parsePipelineStages(deals) {
  if (!deals || !deals.length) return [];
  const counts = {};
  const totals = {};
  for (const deal of deals) {
    const s = deal.stage || "Unknown";
    counts[s] = (counts[s] || 0) + 1;
    totals[s] = (totals[s] || 0) + (deal.amount || 0);
  }
  const ordered = PIPELINE_STAGE_ORDER.filter(s => counts[s]);
  const unknown = Object.keys(counts).filter(s => !PIPELINE_STAGE_ORDER.includes(s));
  return [...ordered, ...unknown].map(stage => ({ stage, count: counts[stage], total: totals[stage] }));
}

// ── Action learning helpers ───────────────────────────────────────────────────
function recordEmailAction(history, bucket, action) {
  const updated = { ...history };
  if (!updated[bucket]) updated[bucket] = {};
  updated[bucket] = { ...updated[bucket], [action]: (updated[bucket][action] || 0) + 1 };
  return updated;
}
function getSuggestedAction(history, bucket, threshold = 3) {
  const bh = history?.[bucket];
  if (!bh) return null;
  const entries = Object.entries(bh);
  if (!entries.length) return null;
  const [topAction, count] = entries.sort(([, a], [, b]) => b - a)[0];
  return count >= threshold ? { action: topAction, count } : null;
}


const PAGE_SIZE = 10; // emails per page within each bucket

// Color palette for user-created task sections (cycles through on add)
const CUSTOM_CAT_PALETTE = [
  { color: "#5A7FC4", bg: "#EBF0FB" },
  { color: "#C47A3A", bg: "#FFF4E8" },
  { color: "#4AC4A4", bg: "#EBF9F5" },
  { color: "#A44AC4", bg: "#F5EBF9" },
  { color: "#C4444A", bg: "#FFF0F0" },
  { color: "#6B8068", bg: "#F0F5EE" },
];

// ═══════════════════════════════════════════════
//  LIGHTBULB FAB — product feedback → GitHub issue
// ═══════════════════════════════════════════════
function LightbulbFAB() {
  const [open, setOpen] = useState(false);
  const [fabTab, setFabTab] = useState("feedback"); // "feedback" | "audit"
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null); // null | "sending" | "sent" | "error"
  const [issueUrl, setIssueUrl] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  function loadAudit() {
    setAuditLoading(true);
    fetch("/api/audit-log")
      .then(r => r.json())
      .then(d => { if (d.entries) setAuditLog(d.entries); })
      .finally(() => setAuditLoading(false));
  }

  function switchTab(t) {
    setFabTab(t);
    if (t === "audit" && auditLog.length === 0) loadAudit();
  }

  async function submit() {
    if (!text.trim()) return;
    setStatus("sending");
    try {
      const r = await fetch("/api/github-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedback: text.trim() }),
      });
      const data = await r.json();
      if (data.success) {
        setStatus("sent");
        setIssueUrl(data.url);
        setText("");
        setTimeout(() => { setOpen(false); setStatus(null); setIssueUrl(null); }, 3500);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: "7px 0", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
    borderRadius: 6, background: active ? T.accent : "transparent",
    color: active ? "#fff" : T.textMuted, transition: "background 0.15s",
  });

  return (
    <>
      <button
        onClick={() => { setOpen(o => !o); setStatus(null); }}
        title="Feedback & audit log"
        style={{
          position: "fixed", bottom: 28, right: 28, width: 52, height: 52,
          borderRadius: "50%", border: "none", cursor: "pointer",
          background: T.accent, color: "#fff",
          boxShadow: "0 4px 18px rgba(74,155,74,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, zIndex: 1000, transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(74,155,74,0.45)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(74,155,74,0.35)"; }}
      >
        💡
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1000 }} />
      )}
      {open && (
        <div onClick={e => e.stopPropagation()} style={{
          position: "fixed", bottom: 90, right: 28, width: 380,
          background: T.card, borderRadius: 14, padding: 24,
          boxShadow: "0 8px 36px rgba(0,0,0,0.16)", border: `1.5px solid ${T.border}`,
          zIndex: 1001,
        }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 4, background: T.bg, borderRadius: 8, padding: 4, marginBottom: 16 }}>
            <button style={tabStyle(fabTab === "feedback")} onClick={() => switchTab("feedback")}>💡 Feedback</button>
            <button style={tabStyle(fabTab === "audit")} onClick={() => switchTab("audit")}>🔍 Audit Log</button>
          </div>

          {fabTab === "feedback" && (
            <>
              <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 12 }}>
                What should be built, fixed, or changed? Creates a GitHub issue automatically.
              </div>
              {status === "sent" ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 600, color: T.accent }}>Issue created!</div>
                  {issueUrl && (
                    <a href={issueUrl} target="_blank" rel="noreferrer"
                      style={{ fontSize: 13, color: T.info, display: "block", marginTop: 6 }}>
                      View on GitHub →
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Describe the feature, bug, or idea..."
                    rows={5}
                    style={{
                      width: "100%", boxSizing: "border-box", padding: "10px 12px",
                      border: `1px solid ${T.border}`, borderRadius: 8, resize: "vertical",
                      fontSize: 14, color: T.text, background: T.bg, fontFamily: "inherit",
                      marginBottom: 10,
                    }}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                  />
                  {status === "error" && (
                    <div style={{ color: T.danger, fontSize: 13, marginBottom: 8 }}>
                      Failed to create issue. Check GITHUB_TOKEN and GITHUB_REPO env vars.
                    </div>
                  )}
                  <button
                    onClick={submit}
                    disabled={status === "sending" || !text.trim()}
                    style={{
                      width: "100%", padding: "11px", borderRadius: 8, border: "none",
                      background: text.trim() ? T.accent : T.border,
                      color: text.trim() ? "#fff" : T.textMuted,
                      fontWeight: 600, fontSize: 15, cursor: text.trim() ? "pointer" : "default",
                      transition: "background 0.15s",
                    }}
                  >
                    {status === "sending" ? "Creating issue..." : "Submit feedback  ⌘↵"}
                  </button>
                </>
              )}
            </>
          )}

          {fabTab === "audit" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: T.textMuted }}>All feedback requests and their status</span>
                <button onClick={loadAudit} style={{ padding: "4px 10px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 12, color: T.textMuted, fontWeight: 600 }}>
                  {auditLoading ? "..." : "↻"}
                </button>
              </div>
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {auditLoading && auditLog.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: T.textMuted, fontSize: 14 }}>Loading...</div>
                ) : auditLog.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: T.textMuted, fontSize: 14 }}>No feedback submitted yet.</div>
                ) : auditLog.map(entry => {
                  const deployed = entry.status === "deployed";
                  return (
                    <div key={entry.number} style={{ borderBottom: `1px solid ${T.borderLight}`, paddingBottom: 10, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>
                            <span style={{ color: T.textDim, marginRight: 6 }}>#{entry.number}</span>{entry.title}
                          </div>
                          <div style={{ fontSize: 12, color: T.textDim, marginTop: 3 }}>
                            {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <span style={{ padding: "2px 8px", background: deployed ? T.calGreenBg : T.goldBg, color: deployed ? T.calGreen : T.gold, borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                            {deployed ? "Deployed" : "Pending"}
                          </span>
                          <a href={entry.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.info, textDecoration: "none" }}>↗</a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════
//  SMALL COMPONENTS
// ═══════════════════════════════════════════════
function Toast({ message, onUndo, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, onUndo ? 5000 : 2500); return () => clearTimeout(t); }, [onDone, onUndo]);
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: T.text, color: "#fff", padding: "14px 24px", borderRadius: 10,
      fontSize: 16, fontWeight: 500, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      animation: "slideUp 0.3s ease", display: "flex", alignItems: "center", gap: 16 }}>
      <span>{message}</span>
      {onUndo && <button onClick={() => { onUndo(); onDone(); }} style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, padding: "4px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Undo</button>}
    </div>
  );
}

function ChatPopup({ notif, offsetBottom, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 8000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div onClick={onDismiss} style={{
      position: "fixed", bottom: offsetBottom, right: 24, maxWidth: 320, minWidth: 240,
      cursor: "pointer", background: T.card, border: `1px solid ${T.emailBlueBorder}`,
      borderRadius: 12, padding: "14px 16px", zIndex: 9998,
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)", animation: "slideUp 0.3s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 15 }}>💬</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1 }}>{notif.sender}</span>
        <span style={{ fontSize: 11, color: T.textMuted, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notif.spaceName}</span>
      </div>
      <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.4 }}>{notif.preview}</div>
    </div>
  );
}

function LeafIcon({ size = 18, color = T.leafDecor, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c6 0 10-7 10-7" />
      <path d="M2 2s7.4 2.08 12.85 6.14" />
    </svg>
  );
}

function SnoozePicker({ onSnooze, onCancel }) {
  const [custom, setCustom] = useState(false);
  const [customDate, setCustomDate] = useState("");
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", minWidth: 220, position: "absolute", bottom: "100%", left: 0, marginBottom: 6, zIndex: 200 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, color: T.text }}>Snooze until...</div>
      {!custom ? (
        <>
          {SNOOZE_OPTIONS.map(opt => (
            <button key={opt.label} onClick={() => {
              if (opt.label === "Custom...") { setCustom(true); return; }
              onSnooze(opt.getValue());
            }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none",
              border: "none", borderRadius: 6, cursor: "pointer", fontSize: 15, color: T.text, marginBottom: 2 }}
              onMouseEnter={e => e.target.style.background = T.bg} onMouseLeave={e => e.target.style.background = "none"}>
              {opt.label}
            </button>
          ))}
        </>
      ) : (
        <div>
          <input type="datetime-local" value={customDate} onChange={e => setCustomDate(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 15, marginBottom: 8, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { if (customDate) onSnooze(new Date(customDate).toISOString()); }}
              style={{ flex: 1, padding: "9px", background: T.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Set</button>
            <button onClick={() => setCustom(false)}
              style={{ flex: 1, padding: "9px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 14 }}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  COMPOSE / REPLY / FORWARD FORM — with autocomplete
// ═══════════════════════════════════════════════
function ComposeForm({ mode = "compose", email = null, onSend, onSchedule, onCancel, signature = "", suggestedForwardTo = "", prefillBody = "", contacts = [], forwardAttachments = [] }) {
  const [to, setTo] = useState(mode === "reply" && email ? (email.replyTo || email.from || "") : (mode === "forward" ? suggestedForwardTo : ""));
  // Reply defaults to sender-only (not reply-all). User can click "Reply All" to expand CC.
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(
    mode === "reply" ? `Re: ${(email?.subject || "").replace(/^Re:\s*/i, "")}` :
    mode === "forward" ? `Fwd: ${email?.subject || ""}` : ""
  );
  const [body, setBody] = useState(prefillBody || "");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [ccSuggestions, setCcSuggestions] = useState([]);
  const [showCcSugg, setShowCcSugg] = useState(false);
  const [bccSuggestions, setBccSuggestions] = useState([]);
  const [showBccSugg, setShowBccSugg] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleCustom, setScheduleCustom] = useState("");
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState(() => forwardAttachments.map(a => a.attachmentId));
  // Sync pre-selection when attachments load after compose opens
  React.useEffect(() => {
    setSelectedAttachmentIds(forwardAttachments.map(a => a.attachmentId));
  }, [forwardAttachments.length]);

  // Build CC string for reply-all: To + CC from original email, minus known own address
  const replyAllCc = mode === "reply" && email
    ? [email.to, email.cc].filter(v => v && v.trim()).join(', ')
    : "";
  const isReplyAll = mode === "reply" && cc === replyAllCc && replyAllCc !== "";

  const handleReplyAllToggle = () => {
    if (isReplyAll) {
      setCc(""); // Switch back to reply-to-sender
    } else {
      setCc(replyAllCc); // Expand to reply-all
    }
  };
  const inputStyle = { width: "100%", padding: "12px 16px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 16, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box" };

  const handleToChange = (val) => {
    setTo(val);
    const lastPart = val.split(",").pop().trim().toLowerCase();
    if (lastPart.length >= 2) {
      const matches = contacts.filter(c =>
        c.name.toLowerCase().includes(lastPart) || c.email.toLowerCase().includes(lastPart)
      ).slice(0, 6);
      setSuggestions(matches);
      setShowSugg(matches.length > 0);
    } else {
      setShowSugg(false);
    }
  };

  const pickSuggestion = (c) => {
    const parts = to.split(",");
    parts[parts.length - 1] = ` ${c.name} <${c.email}>`;
    setTo(parts.join(",").trimStart() + ", ");
    setShowSugg(false);
  };

  const handleCcChange = (val) => {
    setCc(val);
    const lastPart = val.split(",").pop().trim().toLowerCase();
    if (lastPart.length >= 2) {
      const matches = contacts.filter(c =>
        c.name.toLowerCase().includes(lastPart) || c.email.toLowerCase().includes(lastPart)
      ).slice(0, 6);
      setCcSuggestions(matches);
      setShowCcSugg(matches.length > 0);
    } else {
      setShowCcSugg(false);
    }
  };

  const pickCcSuggestion = (c) => {
    const parts = cc.split(",");
    parts[parts.length - 1] = ` ${c.name} <${c.email}>`;
    setCc(parts.join(",").trimStart() + ", ");
    setShowCcSugg(false);
  };

  const handleBccChange = (val) => {
    setBcc(val);
    const lastPart = val.split(",").pop().trim().toLowerCase();
    if (lastPart.length >= 2) {
      const matches = contacts.filter(c =>
        c.name.toLowerCase().includes(lastPart) || c.email.toLowerCase().includes(lastPart)
      ).slice(0, 6);
      setBccSuggestions(matches);
      setShowBccSugg(matches.length > 0);
    } else {
      setShowBccSugg(false);
    }
  };

  const pickBccSuggestion = (c) => {
    const parts = bcc.split(",");
    parts[parts.length - 1] = ` ${c.name} <${c.email}>`;
    setBcc(parts.join(",").trimStart() + ", ");
    setShowBccSugg(false);
  };

  const handleSend = async () => {
    if (!to.trim()) return;
    setSending(true);
    try {
      const payload = { to, cc, bcc: bcc || "", subject, body: body + (signature ? `\n--\n${signature.replace(/<[^>]*>/g, "")}` : "") };
      if (mode === "reply" && email) { payload.threadId = email.threadId; payload.inReplyTo = email.messageId; payload.references = email.messageId; payload.originalMessageId = email.id; }
      if (mode === "forward" && email) {
        payload.forward = true;
        payload.originalBody = email.snippet || "";
        payload.originalMessageId = email.id;
        const selected = forwardAttachments.filter(a => selectedAttachmentIds.includes(a.attachmentId));
        if (selected.length > 0) payload.forwardAttachments = selected;
      }
      await onSend(payload);
    } finally { setSending(false); }
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 22, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 17, color: T.text }}>{mode === "reply" ? "Reply" : mode === "forward" ? "Forward" : "New Email"}</span>
          {mode === "reply" && replyAllCc && (
            <button onClick={handleReplyAllToggle}
              style={{ padding: "4px 12px", fontSize: 13, fontWeight: 600, background: isReplyAll ? T.emailBlueBg : T.bg, color: isReplyAll ? T.emailBlue : T.textMuted, border: `1px solid ${isReplyAll ? T.emailBlue : T.border}`, borderRadius: 20, cursor: "pointer" }}
              title={isReplyAll ? "Switch to reply-to-sender only" : "Reply to all recipients"}>
              {isReplyAll ? "↩↩ Reply All" : "↩ Reply — click for Reply All"}
            </button>
          )}
          <button onClick={() => setShowBcc(s => !s)}
            style={{ padding: "4px 10px", fontSize: 12, fontWeight: 600, background: showBcc ? T.accentBg : T.bg, color: showBcc ? T.accent : T.textMuted, border: `1px solid ${showBcc ? T.accent : T.border}`, borderRadius: 20, cursor: "pointer" }}
            title="Add BCC recipients">
            {showBcc ? "− BCC" : "+ BCC"}
          </button>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textMuted }}>×</button>
      </div>
      {/* To field with autocomplete */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <input placeholder="To" value={to} onChange={e => handleToChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSugg(false), 150)}
          style={inputStyle} />
        {showSugg && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, zIndex: 200, boxShadow: "0 6px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
            {suggestions.map((c, i) => (
              <div key={i} onMouseDown={() => pickSuggestion(c)}
                style={{ padding: "10px 16px", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", gap: 10, borderBottom: i < suggestions.length - 1 ? `1px solid ${T.borderLight}` : "none" }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.accent, flexShrink: 0 }}>
                  {c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: T.text }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: T.textMuted }}>{c.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* CC field with autocomplete (#75) */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <input placeholder="Cc" value={cc} onChange={e => handleCcChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowCcSugg(false), 150)}
          style={inputStyle} />
        {showCcSugg && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, zIndex: 200, boxShadow: "0 6px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
            {ccSuggestions.map((c, i) => (
              <div key={i} onMouseDown={() => pickCcSuggestion(c)}
                style={{ padding: "10px 16px", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", gap: 10, borderBottom: i < ccSuggestions.length - 1 ? `1px solid ${T.borderLight}` : "none" }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.accent, flexShrink: 0 }}>
                  {c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: T.text }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: T.textMuted }}>{c.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* BCC field with autocomplete — shown when + BCC clicked */}
      {showBcc && (
        <div style={{ position: "relative", marginBottom: 8 }}>
          <input placeholder="Bcc" value={bcc} onChange={e => handleBccChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowBccSugg(false), 150)}
            style={inputStyle} />
          {showBccSugg && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, zIndex: 200, boxShadow: "0 6px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
              {bccSuggestions.map((c, i) => (
                <div key={i} onMouseDown={() => pickBccSuggestion(c)}
                  style={{ padding: "10px 16px", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", gap: 10, borderBottom: i < bccSuggestions.length - 1 ? `1px solid ${T.borderLight}` : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.accent, flexShrink: 0 }}>
                    {c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: T.text }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: T.textMuted }}>{c.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <textarea placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} rows={6} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
      {signature && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6, padding: "8px 12px", background: T.bg, borderRadius: 6, borderLeft: `3px solid ${T.accent}` }}>Your signature will be appended</div>}
      {mode === "forward" && forwardAttachments.length > 0 && (
        <div style={{ marginTop: 10, padding: "10px 14px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6 }}>📎 Attachments from original email:</div>
          {forwardAttachments.map(att => (
            <label key={att.attachmentId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text, cursor: "pointer", marginBottom: 4 }}>
              <input type="checkbox" checked={selectedAttachmentIds.includes(att.attachmentId)}
                onChange={() => setSelectedAttachmentIds(prev =>
                  prev.includes(att.attachmentId) ? prev.filter(id => id !== att.attachmentId) : [...prev, att.attachmentId]
                )} />
              {att.filename}
              {att.size > 0 && <span style={{ color: T.textMuted, fontSize: 12 }}>({Math.round(att.size / 1024)}KB)</span>}
            </label>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <button onClick={handleSend} disabled={sending || !to.trim()} style={{ padding: "11px 26px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer", opacity: sending ? 0.6 : 1 }}>{sending ? "Sending..." : "Send"}</button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowSchedule(s => !s)} disabled={!to.trim()} style={{ padding: "11px 18px", background: T.accentBg, color: T.accent, border: `1px solid ${T.accent}30`, borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>📅 Schedule</button>
          {showSchedule && (
            <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, zIndex: 100, minWidth: 230, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
              {[
                { label: "Tomorrow 8am", getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.getTime(); } },
                { label: "Tomorrow noon", getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); return d.getTime(); } },
                { label: "Monday 9am", getTime: () => { const d = new Date(); const days = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + days); d.setHours(9, 0, 0, 0); return d.getTime(); } },
                { label: "Next Friday 9am", getTime: () => { const d = new Date(); const days = ((5 - d.getDay() + 7) % 7) || 7; d.setDate(d.getDate() + days); d.setHours(9, 0, 0, 0); return d.getTime(); } },
              ].map(opt => (
                <button key={opt.label} onClick={() => { if (!onSchedule || !to.trim()) return; const payload = { to, cc, bcc: bcc || "", subject, body: body + (signature ? `\n--\n${signature.replace(/<[^>]*>/g, "")}` : "") }; if (mode === "reply" && email) { payload.threadId = email.threadId; payload.inReplyTo = email.messageId; payload.references = email.messageId; payload.originalMessageId = email.id; } onSchedule(payload, opt.getTime()); setShowSchedule(false); onCancel(); }} style={{ display: "block", width: "100%", padding: "8px 12px", textAlign: "left", background: "none", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, color: T.text, marginBottom: 2 }}>{opt.label}</button>
              ))}
              <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 6, paddingTop: 6 }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>Custom date/time:</div>
                <input type="datetime-local" value={scheduleCustom} onChange={e => setScheduleCustom(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, background: T.bg, color: T.text, boxSizing: "border-box" }} />
                <button onClick={() => { if (!scheduleCustom || !to.trim()) return; const payload = { to, cc, bcc: bcc || "", subject, body: body + (signature ? `\n--\n${signature.replace(/<[^>]*>/g, "")}` : "") }; if (mode === "reply" && email) { payload.threadId = email.threadId; payload.inReplyTo = email.messageId; payload.references = email.messageId; payload.originalMessageId = email.id; } onSchedule(payload, new Date(scheduleCustom).getTime()); setShowSchedule(false); onCancel(); }} disabled={!scheduleCustom} style={{ marginTop: 6, width: "100%", padding: "7px", background: T.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Schedule</button>
              </div>
            </div>
          )}
        </div>
        <button onClick={onCancel} style={{ padding: "11px 22px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  EVENT FORM
// ═══════════════════════════════════════════════
function EventForm({ event = null, onSave, onCancel, prefillFromEmail = null, contacts = [] }) {
  const now = new Date();
  const ds = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
  const de = new Date(ds.getTime() + 3600000);
  const [title, setTitle] = useState(event?.title || (prefillFromEmail?.subject || ""));
  const [start, setStart] = useState(event?.start ? event.start.slice(0, 16) : ds.toISOString().slice(0, 16));
  const [end, setEnd] = useState(event?.end ? event.end.slice(0, 16) : de.toISOString().slice(0, 16));
  const [attendees, setAttendees] = useState(event?.attendees?.map(a => a.email).join(", ") || (prefillFromEmail?.from?.match(/<(.+)>/)?.[1] || prefillFromEmail?.from || ""));
  const [location, setLocation] = useState(event?.location || "");
  const [desc, setDesc] = useState(event?.description || "");
  const [saving, setSaving] = useState(false);
  const [atSuggs, setAtSuggs] = useState([]);
  const [showAtSugg, setShowAtSugg] = useState(false);
  const inputStyle = { width: "100%", padding: "12px 16px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 16, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box" };

  const handleAttendeesChange = (val) => {
    setAttendees(val);
    const last = val.split(",").pop().trim().toLowerCase();
    if (last.length >= 2) {
      const matches = contacts.filter(c =>
        c.name.toLowerCase().includes(last) || c.email.toLowerCase().includes(last)
      ).slice(0, 6);
      setAtSuggs(matches);
      setShowAtSugg(matches.length > 0);
    } else {
      setShowAtSugg(false);
    }
  };

  const pickAtSugg = (c) => {
    const parts = attendees.split(",");
    parts[parts.length - 1] = ` ${c.email}`;
    setAttendees(parts.join(",").trimStart() + ", ");
    setShowAtSugg(false);
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 12, padding: 22, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 17, color: T.calGreen }}>{event ? "Edit Event" : "New Event"}</span>
        <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textMuted }}>×</button>
      </div>
      <input placeholder="Event title" value={title} onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
      </div>
      {/* Attendees with autocomplete (#80) */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <input placeholder="Attendees (comma-separated)" value={attendees}
          onChange={e => handleAttendeesChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowAtSugg(false), 150)}
          style={inputStyle} />
        {showAtSugg && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 8, zIndex: 200, boxShadow: "0 6px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
            {atSuggs.map((c, i) => (
              <div key={i} onMouseDown={() => pickAtSugg(c)}
                style={{ padding: "10px 16px", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", gap: 10, borderBottom: i < atSuggs.length - 1 ? `1px solid ${T.borderLight}` : "none" }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.calGreenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.calGreen, flexShrink: 0 }}>
                  {c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: T.textMuted }}>{c.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={async () => { if (!title.trim()) return; setSaving(true); await onSave({ title, start, end, location, description: desc, attendees: attendees.split(",").map(e => e.trim()).filter(Boolean), ...(event?.id && { eventId: event.id }) }); setSaving(false); }} disabled={saving} style={{ padding: "11px 26px", background: T.calGreen, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer" }}>{saving ? "Saving..." : "Save Event"}</button>
        <button onClick={onCancel} style={{ padding: "11px 22px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  TASK FORM
// ═══════════════════════════════════════════════
function TaskForm({ task = null, onSave, onCancel, prefillFromEmail = null, categories = CATEGORIES, initialCategory = "admin" }) {
  const [title, setTitle] = useState(task?.title || (prefillFromEmail?.subject || ""));
  const [category, setCategory] = useState(task?.category || initialCategory);
  const [urgency, setUrgency] = useState(task?.urgency || "medium");
  const [due, setDue] = useState(task?.due || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const inputStyle = { width: "100%", padding: "12px 16px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 16, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ background: T.card, border: `1px solid ${T.taskAmberBorder}`, borderRadius: 12, padding: 22, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 17, color: T.taskAmber }}>{task ? "Edit Task" : "New Task"}</span>
        <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textMuted }}>×</button>
      </div>
      <input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, flex: 1 }}>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <select value={urgency} onChange={e => setUrgency(e.target.value)} style={{ ...inputStyle, flex: 1 }}>{URGENCY.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}</select>
      </div>
      <input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={() => { if (!title.trim()) return; onSave({ id: task?.id || Date.now().toString(), title, category, urgency, due, notes, done: task?.done || false, order: task?.order ?? 999, createdAt: task?.createdAt || new Date().toISOString() }); }}
          style={{ padding: "11px 26px", background: T.taskAmber, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer" }}>{task ? "Update" : "Add Task"}</button>
        <button onClick={onCancel} style={{ padding: "11px 22px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  FINANCE REVIEW PANEL
// ═══════════════════════════════════════════════
// ── getPayrollChanges — pure diff helper (mirrored in __tests__/payrollReview.test.js) ──
function getPayrollChanges(currentLines, prevLines) {
  const currentSet = new Set((currentLines || []).filter(l => l.trim()));
  const prevSet = new Set((prevLines || []).filter(l => l.trim()));
  const added = [], removed = [], unchanged = [];
  currentSet.forEach(l => { if (prevSet.has(l)) unchanged.push(l); else added.push(l); });
  prevSet.forEach(l => { if (!currentSet.has(l)) removed.push(l); });
  return { added, removed, unchanged };
}

function PayrollReviewPanel({ email, cache, onCacheUpdate, onClose, showToast }) {
  const [loading, setLoading] = useState(!cache[email.id]);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [data, setData] = useState(cache[email.id] || null);
  const [approving, setApproving] = useState(false);
  const [approveStep, setApproveStep] = useState("idle"); // idle | confirm | done
  const [draftStatus, setDraftStatus] = useState(null);

  useEffect(() => {
    if (cache[email.id]) { setData(cache[email.id]); setLoading(false); return; }
    let cancelled = false;
    const tick = setInterval(() => setLoadProgress(p => Math.min(p + 8, 88)), 300);
    fetch(`/api/payroll-review?messageId=${email.id}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        clearInterval(tick);
        setLoadProgress(100);
        if (d.error) { setError(d.error); setLoading(false); return; }
        setData(d);
        onCacheUpdate(email.id, d);
        setTimeout(() => setLoading(false), 300);
      })
      .catch(e => { if (!cancelled) { clearInterval(tick); setError(e.message); setLoading(false); } });
    return () => { cancelled = true; clearInterval(tick); };
  }, [email.id]);

  const approve = async () => {
    setApproving(true);
    setDraftStatus("Sending...");
    try {
      const r = await fetch("/api/payroll-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messageId: email.id,
          threadId: email.threadId,
          to: email.from,
          subject: email.subject || "Payroll Approval",
        }),
      });
      const d = await r.json();
      if (d.success) {
        setApproveStep("done");
        showToast("Approval sent ✓");
      } else {
        setDraftStatus(d.error || "Could not send.");
      }
    } catch (e) { setDraftStatus("Error: " + e.message); }
    setApproving(false);
  };

  const diff = data ? getPayrollChanges(
    (data.current.text || "").split("\n"),
    (data.previous[0]?.text || "").split("\n")
  ) : null;

  const prevDate = data?.previous[0]?.date
    ? new Date(data.previous[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div style={{ background: T.card, border: `2px solid ${T.taskAmberBorder}`, borderRadius: 16, padding: 24, marginBottom: 26 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>💰</span>
          <span style={{ fontSize: 19, fontWeight: 700, color: T.taskAmber }}>Payroll Review</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textMuted }}>×</button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: "20px 0" }}>
          <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 10 }}>Fetching and parsing payroll documents...</div>
          <div style={{ height: 8, background: T.border, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", background: T.taskAmber, borderRadius: 4, width: `${loadProgress}%`, transition: "width 0.3s ease" }} />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{ padding: "14px 16px", background: T.dangerBg, color: T.danger, borderRadius: 8, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Diff view */}
      {!loading && data && diff && (
        <>
          {/* Summary bar */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "10px 0", marginBottom: 12, borderBottom: `1px solid ${T.borderLight}` }}>
            {diff.added.length > 0 && <span style={{ fontSize: 13, color: "#155724", fontWeight: 600 }}>+{diff.added.length} added</span>}
            {diff.removed.length > 0 && <span style={{ fontSize: 13, color: "#721C24", fontWeight: 600 }}>−{diff.removed.length} removed</span>}
            {diff.added.length === 0 && diff.removed.length === 0 && <span style={{ fontSize: 13, color: T.calGreen, fontWeight: 600 }}>✓ No changes from last payroll</span>}
            {prevDate && <span style={{ fontSize: 12, color: T.textMuted, marginLeft: "auto" }}>vs. {prevDate}</span>}
          </div>

          {/* Diff lines */}
          <div style={{ maxHeight: 240, overflowY: "auto", fontFamily: "monospace", fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 16 }}>
            {diff.added.map((line, i) => (
              <div key={`a${i}`} style={{ background: "#D4EDDA", color: "#155724", padding: "2px 10px", whiteSpace: "pre-wrap" }}>+ {line}</div>
            ))}
            {diff.removed.map((line, i) => (
              <div key={`r${i}`} style={{ background: "#F8D7DA", color: "#721C24", padding: "2px 10px", whiteSpace: "pre-wrap" }}>− {line}</div>
            ))}
            {diff.unchanged.length > 0 && (
              <div style={{ padding: "4px 10px", color: "#888", fontSize: 11, borderTop: diff.added.length + diff.removed.length > 0 ? `1px solid ${T.border}` : "none" }}>
                ── {diff.unchanged.length} unchanged lines ──
              </div>
            )}
            {diff.added.length === 0 && diff.removed.length === 0 && diff.unchanged.length === 0 && (
              <div style={{ padding: "12px 10px", color: T.textMuted, fontSize: 13, textAlign: "center" }}>No parseable content found in PDFs.</div>
            )}
          </div>

          {/* Previous payrolls context */}
          {data.previous.length > 1 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: T.textMuted, alignSelf: "center" }}>History:</span>
              {data.previous.map((p, i) => (
                <span key={i} style={{ fontSize: 12, padding: "3px 10px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 12 }}>
                  {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              ))}
            </div>
          )}

          {/* Approve flow */}
          {approveStep === "idle" && (
            <button onClick={() => setApproveStep("confirm")} style={{ padding: "10px 24px", background: T.taskAmber, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              Approve?
            </button>
          )}
          {approveStep === "confirm" && (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginTop: 4 }}>
              <div style={{ background: T.bg, padding: "10px 14px", fontSize: 13, color: T.textMuted, borderBottom: `1px solid ${T.borderLight}` }}>
                <div><strong>To:</strong> {email.from}</div>
                <div><strong>Subject:</strong> {(email.subject || "Payroll Approval").startsWith("Re: ") ? email.subject : `Re: ${email.subject || "Payroll Approval"}`}</div>
              </div>
              <div style={{ padding: "12px 14px", fontSize: 14, color: T.text }}>I approve, thank you</div>
              <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderTop: `1px solid ${T.borderLight}` }}>
                <button onClick={() => setApproveStep("idle")} style={{ padding: "7px 16px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                <button onClick={approve} disabled={approving} style={{ padding: "7px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: approving ? "default" : "pointer", opacity: approving ? 0.7 : 1 }}>
                  {approving ? "Sending..." : "Send ↗"}
                </button>
                {draftStatus && <span style={{ fontSize: 13, color: T.textMuted, alignSelf: "center" }}>{draftStatus}</span>}
              </div>
            </div>
          )}
          {approveStep === "done" && (
            <div style={{ fontSize: 14, color: "#155724", fontWeight: 600 }}>✓ Sent</div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  BOARD PREP PANEL
// ═══════════════════════════════════════════════
const BOARD_PREP_DEFAULTS = {
  meetingLabel: 'March',
  year: 2026,
  boardMeetingDate: '2026-04-06',
  financialsQuery: 'Feb 2026 Financials',
};

function BoardPrepPanel({ meeting, latestBoardReport, onClose, showToast }) {
  const [step, setStep] = useState('confirm'); // confirm | running | done | error
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [meetingLabel, setMeetingLabel] = useState(BOARD_PREP_DEFAULTS.meetingLabel);
  const [year] = useState(BOARD_PREP_DEFAULTS.year);
  const [boardMeetingDate] = useState(BOARD_PREP_DEFAULTS.boardMeetingDate);
  const [financialsQuery] = useState(BOARD_PREP_DEFAULTS.financialsQuery);

  // If meeting from API, derive defaults
  const meetingTitle = meeting ? (meeting.summary || 'FFC Board Meeting') : 'FFC Board Meeting';
  const meetingStart = meeting ? (meeting.start?.dateTime || meeting.start?.date || boardMeetingDate) : boardMeetingDate;

  async function runPrep() {
    setStep('running');
    try {
      const r = await fetch('/api/board-prep', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingLabel, year, boardMeetingDate: meetingStart, financialsQuery }),
      });
      const data = await r.json();
      if (!r.ok) { setErrorMsg(data.error || 'Board prep failed'); setStep('error'); return; }
      setResults(data);
      setStep('done');
      if (data.errors?.length) showToast(`Prep ran with ${data.errors.length} warning(s)`, true);
      else showToast('Board prep complete!');
    } catch (e) {
      console.error('BoardPrepPanel:runPrep', { message: e.message });
      setErrorMsg(e.message);
      setStep('error');
    }
  }

  return (
    <div style={{ background: T.surface, border: `2px solid ${T.emailBlue}`, borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: "0 4px 24px rgba(59,130,196,0.15)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>📋</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Board Meeting Prep</div>
            <div style={{ fontSize: 13, color: T.textMuted }}>{meetingTitle} · April 6, 2026</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.textMuted }}>✕</button>
      </div>

      {step === 'confirm' && (
        <>
          <div style={{ fontSize: 14, color: T.text, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>This will:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                `📄 Copy "${latestBoardReport?.name || 'latest Board Report'}" → rename to "${meetingLabel} ${year}- Board Report- FFC" → highlight all text grey`,
                "📨 Create staff draft email to Laura, Carmen, Gretchen, Adjoa with doc link and deadline",
                "📋 Read Jack & Kayla 1:1 notes (most recent) for agenda items",
                "📖 Read board agenda doc → surface rotation info",
                "💰 Search Drive for Feb 2026 Financials",
                "✉️ Create draft board email with all links",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: T.textMuted }}>
                  <span style={{ minWidth: 16 }}>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 4 }}>Meeting label (used in doc name and email subject)</label>
            <input
              value={meetingLabel}
              onChange={e => setMeetingLabel(e.target.value)}
              style={{ padding: "7px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, width: 200, color: T.text, background: T.bg }}
            />
          </div>
          <button onClick={runPrep} style={{ padding: "11px 32px", background: T.emailBlue, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            🚀 Run Board Prep
          </button>
        </>
      )}

      {step === 'running' && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>Running board prep…</div>
          <div style={{ fontSize: 13, color: T.textMuted }}>Copying doc, reading 1:1 notes, creating drafts. This takes about 15 seconds.</div>
        </div>
      )}

      {step === 'error' && (
        <div>
          <div style={{ color: T.danger, fontWeight: 700, marginBottom: 12 }}>Board prep failed: {errorMsg}</div>
          <button onClick={() => setStep('confirm')} style={{ padding: "8px 20px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", color: T.text }}>Try Again</button>
        </div>
      )}

      {step === 'done' && results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Board Report */}
          <div style={{ background: T.bg, borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 }}>📄 Board Report Copied</div>
            {results.boardReportUrl
              ? <a href={results.boardReportUrl} target="_blank" rel="noreferrer" style={{ color: T.emailBlue, fontSize: 13 }}>{meetingLabel} {year}- Board Report- FFC →</a>
              : <div style={{ color: T.danger, fontSize: 13 }}>{results.errors?.find(e => e.includes('report')) || 'Failed'}</div>}
          </div>

          {/* Staff Draft */}
          <div style={{ background: T.bg, borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 }}>📨 Staff Email Draft Created</div>
            {results.staffDraftId
              ? <a href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noreferrer" style={{ color: T.emailBlue, fontSize: 13 }}>View in Gmail Drafts →</a>
              : <div style={{ color: T.danger, fontSize: 13 }}>Draft not created — check errors below</div>}
          </div>

          {/* Jack 1:1 notes */}
          <div style={{ background: T.bg, borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 }}>📋 Recent Jack 1:1 Notes (review for agenda items)</div>
            {results.jack1on1Text
              ? <pre style={{ fontSize: 12, color: T.textMuted, whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto", margin: 0, fontFamily: "inherit" }}>{results.jack1on1Text}</pre>
              : <div style={{ fontSize: 13, color: T.textMuted }}>Could not read 1:1 doc</div>}
          </div>

          {/* Agenda rotation */}
          <div style={{ background: T.bg, borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 }}>📖 Agenda Doc — Rotation Info</div>
            {results.agendaDocUrl && <a href={results.agendaDocUrl} target="_blank" rel="noreferrer" style={{ color: T.emailBlue, fontSize: 12, display: "block", marginBottom: 6 }}>Open Agenda Doc →</a>}
            {results.agendaRotationText
              ? <pre style={{ fontSize: 12, color: T.textMuted, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto", margin: 0, fontFamily: "inherit" }}>{results.agendaRotationText}</pre>
              : <div style={{ fontSize: 13, color: T.textMuted }}>Could not read agenda doc</div>}
          </div>

          {/* Financials */}
          <div style={{ background: T.bg, borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 }}>💰 Financial Statements</div>
            {results.financialsUrl
              ? <a href={results.financialsUrl} target="_blank" rel="noreferrer" style={{ color: T.emailBlue, fontSize: 13 }}>Feb 2026 Financials →</a>
              : <div style={{ fontSize: 13, color: T.textMuted }}>Not found — search Drive manually for "Feb 2026 Financials"</div>}
          </div>

          {/* Board Draft */}
          <div style={{ background: T.bg, borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 }}>✉️ Board Email Draft Created</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Review and update links before sending.</div>
            {results.boardDraftId
              ? <a href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noreferrer" style={{ color: T.emailBlue, fontSize: 13 }}>View in Gmail Drafts →</a>
              : <div style={{ color: T.danger, fontSize: 13 }}>Draft not created</div>}
          </div>

          {/* Errors */}
          {results.errors?.length > 0 && (
            <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.danger, marginBottom: 6 }}>Warnings</div>
              {results.errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: T.danger }}>{e}</div>)}
            </div>
          )}

          <button onClick={onClose} style={{ alignSelf: "flex-start", padding: "8px 20px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", color: T.text, fontWeight: 600 }}>Done</button>
        </div>
      )}
    </div>
  );
}

function FinanceReviewPanel({ email, onClose, showToast }) {
  const [steps, setSteps] = useState([
    { id: "email", label: "Debbie's details email received", done: true, icon: "📧",
      detail: email ? `${email.from?.replace(/<.*>/, "").trim()} · "${email.subject}"` : "Email received" },
    { id: "budget", label: "Review Budget vs Actuals", done: false, icon: "📊",
      detail: "Open the monthly Budget vs Actuals Google Sheet" },
    { id: "grants", label: "Grant allocation review", done: false, icon: "🌱",
      detail: "Compare current allocations to previous months' detail sheets" },
    { id: "agenda", label: "Finance Committee agenda prep", done: false, icon: "📋",
      detail: "Find agenda folder and prep for upcoming meeting" },
    { id: "reminder", label: "Draft committee reminder", done: false, icon: "✉️",
      detail: "Create a draft reminder for finance committee members" },
  ]);
  const [drafting, setDrafting] = useState(false);
  const [draftStatus, setDraftStatus] = useState(null);

  const toggleDone = (id) => setSteps(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s));
  const doneCount = steps.filter(s => s.done).length;

  const draftReminder = async () => {
    setDrafting(true);
    try {
      const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const params = new URLSearchParams({
        action: "draftCommitteeReminder",
        to: "finance-committee@freshfoodconnect.org",
        agendaLink: "https://drive.google.com/",
        meetingDate: today,
      });
      const r = await fetch(`/api/finance-review?${params}`);
      const d = await r.json();
      if (d.draftId || d.success) {
        setDraftStatus("✓ Draft created — check your Drafts tab");
        toggleDone("reminder");
        showToast("Committee reminder draft created!");
      } else {
        setDraftStatus("Could not create draft. Try again.");
      }
    } catch { setDraftStatus("Error creating draft."); }
    setDrafting(false);
  };

  const btnStyle = { padding: "7px 16px", background: T.taskAmberBg, color: T.taskAmber, border: `1px solid ${T.taskAmberBorder}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" };

  return (
    <div style={{ background: T.card, border: `2px solid ${T.taskAmberBorder}`, borderRadius: 16, padding: 24, marginBottom: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>📊</span>
          <span style={{ fontSize: 19, fontWeight: 700, color: T.taskAmber }}>Monthly Finance Review</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 14, color: T.textMuted }}>{doneCount}/{steps.length} steps</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textMuted }}>×</button>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, background: T.border, borderRadius: 3, marginBottom: 20 }}>
        <div style={{ height: "100%", background: T.taskAmber, borderRadius: 3, width: `${(doneCount / steps.length) * 100}%`, transition: "width 0.4s" }} />
      </div>

      {steps.map((step, i) => (
        <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < steps.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
          <button onClick={() => step.id !== "email" && toggleDone(step.id)}
            style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${step.done ? T.taskAmber : T.border}`, background: step.done ? T.taskAmber : "transparent", cursor: step.id === "email" ? "default" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>
            {step.done ? "✓" : ""}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: step.done ? T.textMuted : T.text, textDecoration: step.done ? "line-through" : "none" }}>{step.icon} {step.label}</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>{step.detail}</div>
          </div>
          {step.id === "budget" && !step.done && (
            <button onClick={() => { window.open("https://drive.google.com/drive/search?q=Budget+Actuals", "_blank"); toggleDone("budget"); }} style={btnStyle}>Open Sheet →</button>
          )}
          {step.id === "grants" && !step.done && (
            <button onClick={() => { window.open("https://drive.google.com/drive/search?q=grant+allocation+detail", "_blank"); toggleDone("grants"); }} style={btnStyle}>Open Drive →</button>
          )}
          {step.id === "agenda" && !step.done && (
            <button onClick={() => { window.open("https://drive.google.com/drive/search?q=finance+committee+agenda", "_blank"); toggleDone("agenda"); }} style={btnStyle}>Find Agenda →</button>
          )}
          {step.id === "reminder" && !step.done && (
            <button onClick={draftReminder} disabled={drafting} style={{ ...btnStyle, opacity: drafting ? 0.6 : 1 }}>{drafting ? "Drafting..." : "Draft Reminder"}</button>
          )}
          {step.id === "reminder" && draftStatus && (
            <span style={{ fontSize: 13, color: T.calGreen, flexShrink: 0 }}>{draftStatus}</span>
          )}
        </div>
      ))}

      {doneCount === steps.length && (
        <div style={{ marginTop: 16, padding: "14px 20px", background: T.calGreenBg, borderRadius: 10, textAlign: "center", fontSize: 16, color: T.calGreen, fontWeight: 600 }}>
          🎉 Finance review complete!
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════
function MagicLoginScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    const r = await fetch("/api/auth/magic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const d = await r.json().catch(() => ({}));
    if (d.redirectUrl) { window.location.href = d.redirectUrl; return; }
    setErrorMsg(d.error || "Access restricted.");
    setStatus("error");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ textAlign: "center", maxWidth: 400, width: "100%", padding: "0 24px" }}>
        <LeafIcon size={52} style={{ marginBottom: 18 }} />
        <h1 style={{ fontSize: 28, color: T.text, marginBottom: 8, fontWeight: 700 }}>Fresh Food Connect</h1>
        <p style={{ color: T.textMuted, marginBottom: 36, fontSize: 16 }}>CEO Command Center</p>
        <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: T.text, display: "block", marginBottom: 8 }}>Your email address</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="kayla@freshfoodconnect.org" required autoFocus
            style={{ width: "100%", padding: "14px 16px", border: `1.5px solid ${T.border}`, borderRadius: 10,
              fontSize: 16, color: T.text, background: "#fff", marginBottom: 12, boxSizing: "border-box",
              outline: "none", fontFamily: "inherit" }}
          />
          {errorMsg && (
            <div style={{ color: T.danger, fontSize: 14, marginBottom: 12, padding: "10px 14px", background: T.dangerBg, borderRadius: 8 }}>
              {errorMsg}
            </div>
          )}
          <button type="submit" disabled={status === "sending" || !email.trim()}
            style={{ width: "100%", padding: "15px", background: email.trim() ? T.accent : T.border,
              color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 16,
              cursor: email.trim() ? "pointer" : "default", transition: "background 0.15s" }}>
            {status === "sending" ? "Signing you in..." : "Continue with Google →"}
          </button>
        </form>
        <p style={{ fontSize: 13, color: T.textDim, marginTop: 20 }}>Access restricted to authorized users only.</p>
      </div>
    </div>
  );
}

export default function Home() {
  // ── Dark mode — issue #83 ──
  // Always start false (SSR-safe) — useEffect reads saved preference after hydration.
  // Reading localStorage inside useState causes server/client hydration mismatch → crash.
  const [darkMode, setDarkMode] = useState(false);
  // Reassign module-level T so all sub-components (ComposeForm, EventForm, etc.) see the current theme.
  T = darkMode ? DARK_T : LIGHT_T;
  // BUCKETS defined here so it picks up the current T values
  const BUCKETS = {
    "needs-response": { label: "Important / Not Addressed", icon: "✉️", color: T.urgentCoral, bg: T.urgentCoralBg, border: T.urgentCoralBorder, priority: 1 },
    "to-do": { label: "To Do", icon: "☑️", color: T.accent, bg: T.accentBg, border: T.border, priority: 2 },
    "team": { label: "Team / Internal", icon: "👥", color: T.emailBlue, bg: T.emailBlueBg, border: T.emailBlueBorder, priority: 3 },
    "classy-onetime": { label: "Donation Alerts", icon: "💚", color: T.calGreen, bg: T.calGreenBg, border: T.calGreenBorder, priority: 4 },
    "invoices": { label: "Invoices & Receipts", icon: "🧾", color: T.taskAmber, bg: T.taskAmberBg, border: T.taskAmberBorder, priority: 5 },
    "fyi-mass": { label: "FYI / Mass Sends", icon: "📋", color: T.info, bg: T.infoBg, border: T.emailBlueBorder, priority: 6 },
    "classy-recurring": { label: "Classy Platform", icon: "🔄", color: T.driveViolet, bg: T.driveVioletBg, border: T.driveVioletBorder, priority: 7 },
    "financial": { label: "Financial / Donations", icon: "💰", color: T.taskAmber, bg: T.taskAmberBg, border: T.taskAmberBorder, priority: 4 },
    "calendar-notif": { label: "Calendar Notifications", icon: "📅", color: T.calGreen, bg: T.calGreenBg, border: T.calGreenBorder, priority: 8 },
    "docs-activity": { label: "Docs & Drive Activity", icon: "📄", color: T.driveViolet, bg: T.driveVioletBg, border: T.driveVioletBorder, priority: 9 },
    "automated": { label: "Automated / System", icon: "⚙️", color: T.textMuted, bg: darkMode ? "#1A1A1A" : "#F5F5F5", border: T.border, priority: 10 },
    "newsletter": { label: "Newsletters & Lists", icon: "📰", color: T.textMuted, bg: darkMode ? "#1A1A1A" : "#F5F5F5", border: T.border, priority: 11 },
    "sales": { label: "Likely Sales / Spam", icon: "🚫", color: T.danger, bg: T.dangerBg, border: `${T.danger}30`, priority: 12 },
    "payroll-approval": { label: "Payroll Approval", icon: "💰", color: T.taskAmber, bg: T.taskAmberBg, border: T.taskAmberBorder, priority: 2 },
  };

  const [auth, setAuth] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [tab, setTab] = useState("today");
  // User settings — localStorage-backed, configurable via Settings tab (#78)
  const [userSettings, setUserSettings] = useState(() => {
    try { return mergeSettings(JSON.parse(localStorage.getItem("ffc_user_settings") || "null")); } catch { return getDefaultSettings(); }
  });
  const [emailDropdownOpen, setEmailDropdownOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [events, setEvents] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [expandedEmail, setExpandedEmail] = useState(null);
  const [hoveredEmail, setHoveredEmail] = useState(null);
  const [emailBody, setEmailBody] = useState({});
  const [composing, setComposing] = useState(null);
  const [showSnooze, setShowSnooze] = useState(null);
  const [contactHistory, setContactHistory] = useState({});
  const [signature, setSignature] = useState("");
  const [forwardSuggestions, setForwardSuggestions] = useState({});

  const [calView, setCalView] = useState("today");
  const [weekEvents, setWeekEvents] = useState([]);
  const [nextWeekEvents, setNextWeekEvents] = useState([]);
  const [pastWeekEvents, setPastWeekEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(null);
  const [preppedEvents, setPreppedEvents] = useState(() => {
    if (typeof window !== "undefined") { try { return JSON.parse(localStorage.getItem("ffc_prepped") || "{}"); } catch { return {}; } }
    return {};
  });

  // Tasks with backup protection
  const [tasks, setTasks] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("ffc_tasks");
        const backup = localStorage.getItem("ffc_tasks_backup");
        if (stored) { const p = JSON.parse(stored); if (Array.isArray(p) && p.length > 0) return p; }
        if (backup) { const p = JSON.parse(backup); if (Array.isArray(p) && p.length > 0) return p; }
      } catch {}
    }
    return [];
  });
  const [showTaskForm, setShowTaskForm] = useState(null);
  const [customCategories, setCustomCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ffc_custom_cats") || "[]"); } catch { return []; }
  });
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [dragTask, setDragTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);
  const dragScrollRef = useRef({ raf: null, clientY: 0, active: false });
  const [teamOrder, setTeamOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ffc_team_order') || 'null') || []; } catch { return []; }
  });
  const [dragTeam, setDragTeam] = useState(null);
  const [dragOverTeam, setDragOverTeam] = useState(null);

  const [driveFiles, setDriveFiles] = useState([]);
  const [driveSearch, setDriveSearch] = useState("");
  const [driveView, setDriveView] = useState("recent");
  const [driveLayout, setDriveLayout] = useState(() => { try { return localStorage.getItem('ffc_drive_layout') || 'list'; } catch { return 'list'; } });
  const [driveFolderPath, setDriveFolderPath] = useState([]); // [{id, name}] breadcrumb stack
  const [emailDensity, setEmailDensity] = useState(() => { try { return localStorage.getItem('ffc_email_density') || 'comfortable'; } catch { return 'comfortable'; } });
  const [emailFilter, setEmailFilter] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [draftsTotal, setDraftsTotal] = useState(0);

  const [stickyNotes, setStickyNotes] = useState(() => {
    if (typeof window !== "undefined") { try { return JSON.parse(localStorage.getItem("ffc_stickies") || "[]"); } catch { return []; } }
    return [];
  });
  const [newStickyText, setNewStickyText] = useState("");
  const [showWeekPrep, setShowWeekPrep] = useState(false);
  const [weekPrepEvents, setWeekPrepEvents] = useState([]);
  const [digest, setDigest] = useState(null);
  const [financePanel, setFinancePanel] = useState(null); // null or email object
  const [payrollPanel, setPayrollPanel] = useState(null); // null or email object
  const [payrollCache, setPayrollCache] = useState({}); // keyed by email.id — avoids re-fetch
  const [boardPrepInfo, setBoardPrepInfo] = useState(null); // { meeting, latestBoardReport, ... }
  const [boardPrepPanel, setBoardPrepPanel] = useState(false);
  const [aiPrep, setAiPrep] = useState({}); // eventId → { loading, text, error }
  const [editingDraft, setEditingDraft] = useState(null); // { id, to, subject, body } or null
  const [draftSaving, setDraftSaving] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [draggingEmail, setDraggingEmail] = useState(null);
  const [dragOverEmailBucket, setDragOverEmailBucket] = useState(null);
  const [emailBucketOverrides, setEmailBucketOverrides] = useState({});
  const [bucketLabels, setBucketLabels] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ffc_bucket_labels") || "{}"); } catch { return {}; }
  });
  const [editingBucketLabel, setEditingBucketLabel] = useState(null); // bucketKey being renamed
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [movingEmailId, setMovingEmailId] = useState(null); // email id with open "Move to…" dropdown
  const [learnedBuckets, setLearnedBuckets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ffc_learned_buckets") || "{}"); } catch { return {}; }
  });
  const [emailActionHistory, setEmailActionHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ffc_action_history") || "{}"); } catch { return {}; }
  });
  const [selectedEmailIds, setSelectedEmailIds] = useState(new Set());
  const [bucketPages, setBucketPages] = useState({}); // bucket → current page index
  const [expandedCalEvent, setExpandedCalEvent] = useState(null); // event id expanded in Today's Schedule
  const [docModal, setDocModal] = useState(null); // { title, content } or null
  const [docModalMode, setDocModalMode] = useState("create"); // "create" | "link"
  const [docSaving, setDocSaving] = useState(false);
  const [docFolderUrl, setDocFolderUrl] = useState("");
  const [docFolderSearch, setDocFolderSearch] = useState("");
  const [docFolderResults, setDocFolderResults] = useState([]);
  const [docFolderSearching, setDocFolderSearching] = useState(false);
  const [docSelectedFolder, setDocSelectedFolder] = useState(null); // { id, name }
  const [docLinkSearch, setDocLinkSearch] = useState("");
  const [docLinkResults, setDocLinkResults] = useState([]);
  const [docLinkSearching, setDocLinkSearching] = useState(false);
  const [hsModal, setHsModal] = useState(null); // { note, subject } or null
  const [hsContacts, setHsContacts] = useState([]);
  const [hsContactSearch, setHsContactSearch] = useState("");
  const [hsContactId, setHsContactId] = useState("");
  const [hsSaving, setHsSaving] = useState(false);
  const [hsSearching, setHsSearching] = useState(false);
  const [hsSearchError, setHsSearchError] = useState("");
  const [hsSearchDone, setHsSearchDone] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(null); // emailId being drafted
  const [toDoEmailIds, setToDoEmailIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("ffc_todo_emails") || "[]")); } catch { return new Set(); }
  });
  const [grants, setGrants] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ffc_grants") || "[]"); } catch { return []; }
  });
  const [calendarGrants, setCalendarGrants] = useState([]);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantForm, setGrantForm] = useState({ name: "", deadline: "", amount: "" });
  const [pipeline, setPipeline] = useState([]); // HubSpot deal stages
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [teamNoteOpen, setTeamNoteOpen] = useState(null); // email of open team member
  const [teamNoteTexts, setTeamNoteTexts] = useState({}); // keyed by email
  const [teamNoteSaving, setTeamNoteSaving] = useState(null); // email currently saving
  const [scheduledEmails, setScheduledEmails] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ffc_scheduled_emails') || '[]'); } catch { return []; }
  });
  const [agendaItems, setAgendaItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ffc_agenda_items') || '[]'); } catch { return []; }
  });
  const [agendaInput, setAgendaInput] = useState('');
  const [agendaAssignee, setAgendaAssignee] = useState('');
  const [classDonations, setClassDonations] = useState([]); // Classy 7-day feed
  const [classDonationsLoading, setClassDonationsLoading] = useState(false);
  const [weeklyBrief, setWeeklyBrief] = useState(null); // { text, boardText } or null
  const [weeklyBriefLoading, setWeeklyBriefLoading] = useState(false);
  const [boardReportSaving, setBoardReportSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIdx, setSearchIdx] = useState(0); // keyboard nav index
  const [chatNotifs, setChatNotifs] = useState([]); // array of { id, sender, preview, spaceName, timestamp }
  const lastChatPollRef = useRef(Date.now()); // only show messages that arrive after page load
  const [emailActionConfig, setEmailActionConfig] = useState(() => {
    try { return getEmailActionConfig(JSON.parse(localStorage.getItem("ffc_email_action_config") || "null")); } catch { return getEmailActionConfig(null); }
  });

  // ── Persist ──
  useEffect(() => {
    if (typeof window !== "undefined" && tasks.length > 0) {
      localStorage.setItem("ffc_tasks", JSON.stringify(tasks));
      localStorage.setItem("ffc_tasks_backup", JSON.stringify(tasks));
    }
  }, [tasks]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("ffc_prepped", JSON.stringify(preppedEvents)); }, [preppedEvents]);
  useEffect(() => { if (typeof window !== "undefined" && stickyNotes.length >= 0) localStorage.setItem("ffc_stickies", JSON.stringify(stickyNotes)); }, [stickyNotes]);
  useEffect(() => {
    if (typeof window !== "undefined") { try { setForwardSuggestions(JSON.parse(localStorage.getItem("ffc_fwd_suggest") || "{}")); } catch {} }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(forwardSuggestions).length > 0) localStorage.setItem("ffc_fwd_suggest", JSON.stringify(forwardSuggestions));
  }, [forwardSuggestions]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ffc_grants", JSON.stringify(grants));
  }, [grants]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ffc_todo_emails", JSON.stringify([...toDoEmailIds]));
  }, [toDoEmailIds]);
  useEffect(() => {
    try { localStorage.setItem('ffc_agenda_items', JSON.stringify(agendaItems)); } catch {}
  }, [agendaItems]);
  useEffect(() => {
    try { localStorage.setItem('ffc_user_settings', JSON.stringify(userSettings)); } catch {}
  }, [userSettings]);
  // Read saved dark mode preference after hydration (cannot read localStorage during SSR)
  useEffect(() => {
    try { if (localStorage.getItem('ffc_dark_mode') === 'true') setDarkMode(true); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('ffc_dark_mode', darkMode ? 'true' : 'false'); } catch {}
  }, [darkMode]);
  useEffect(() => {
    try { localStorage.setItem('ffc_bucket_labels', JSON.stringify(bucketLabels)); } catch {}
  }, [bucketLabels]);
  useEffect(() => {
    try { localStorage.setItem('ffc_scheduled_emails', JSON.stringify(scheduledEmails)); } catch {}
  }, [scheduledEmails]);
  useEffect(() => {
    try { localStorage.setItem('ffc_email_action_config', JSON.stringify(emailActionConfig)); } catch {}
  }, [emailActionConfig]);
  const showToast = useCallback((msg, onUndo) => setToast({ message: msg, onUndo: onUndo || null }), []);

  // Check and send due scheduled emails every 60s
  useEffect(() => {
    const check = async () => {
      const now = Date.now();
      const due = scheduledEmails.filter(s => s.scheduledAt <= now);
      if (due.length === 0) return;
      for (const s of due) {
        try {
          await fetch("/api/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(s.payload) });
          showToast(`Scheduled email sent: ${s.payload.subject || '(no subject)'}`);
        } catch { /* silent — email stays in queue for retry */ }
      }
      setScheduledEmails(prev => prev.filter(s => s.scheduledAt > now));
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [scheduledEmails, showToast]);

  const startDragScroll = useCallback((initialClientY) => {
    const ref = dragScrollRef.current;
    ref.clientY = initialClientY ?? window.innerHeight / 2;
    ref.active = true;
    const tick = () => {
      if (!ref.active) return;
      const speed = getAutoScrollSpeed(ref.clientY, window.innerHeight);
      if (speed !== 0) window.scrollBy(0, speed);
      ref.raf = requestAnimationFrame(tick);
    };
    ref.raf = requestAnimationFrame(tick);
  }, []);

  const stopDragScroll = useCallback(() => {
    const ref = dragScrollRef.current;
    ref.active = false;
    if (ref.raf) { cancelAnimationFrame(ref.raf); ref.raf = null; }
  }, []);

  // ── Build contacts list from loaded emails (for autocomplete) — #75 ──
  const contacts = useMemo(() => {
    const seen = new Map();
    // Add team members first (highest priority)
    TEAM.forEach(t => { if (t.email) seen.set(t.email.toLowerCase(), t.name); });
    // Parse from, to, and cc fields so recipients Kayla sends to are included
    emails.forEach(e => {
      [`${e.from || ""}`, `${e.to || ""}`, `${e.cc || ""}`].forEach(field => {
        parseAddressField(field).forEach(({ name, email }) => {
          if (!seen.has(email)) seen.set(email, name);
        });
      });
    });
    return Array.from(seen.entries()).map(([email, name]) => ({ email, name }));
  }, [emails]);

  // ── Fetch data ──
  const fetchData = useCallback(async (pageToken) => {
    try {
      const url = pageToken ? `/api/data?page=${pageToken}` : "/api/data";
      const r = await fetch(url);
      if (r.status === 401) { setSessionExpired(true); setLoading(false); return; }
      const d = await r.json();
      if (!d.authenticated) { setAuth(false); setLoading(false); return; }
      setAuth(true);
      setSessionExpired(false);
      if (pageToken) { setEmails(prev => [...prev, ...d.emails.filter(e => e.unread)]); }
      else {
        setEmails(d.emails.filter(e => e.unread)); setEvents(d.events || []);
        if (d.deadlineEvents) setCalendarGrants(d.deadlineEvents);
      }
      setNextPage(d.nextPage);
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (auth) fetch("/api/signature").then(r => r.json()).then(d => { if (d.signature) setSignature(d.signature); }).catch(() => {}); }, [auth]);
  useEffect(() => { if (auth) fetch("/api/board-prep", { credentials: "include" }).then(r => r.json()).then(d => { if (d.meeting) setBoardPrepInfo(d); }).catch(() => {}); }, [auth]);

  // Google Chat notifications — poll every 30s, show popup for new messages
  useEffect(() => {
    if (!auth) return;
    const provider = chatProviderFor("google-chat");
    if (!provider) return;
    const poll = async () => {
      try {
        const r = await fetch(provider.apiPath, { credentials: "include" });
        if (!r.ok) return;
        const { messages } = await r.json();
        const now = Date.now();
        const newNotifs = buildChatNotifications(messages || [], lastChatPollRef.current);
        if (newNotifs.length > 0) setChatNotifs(prev => [...prev, ...newNotifs]);
        lastChatPollRef.current = now;
      } catch { /* silently ignore network errors */ }
    };
    const id = setInterval(poll, 30000);
    poll();
    return () => clearInterval(id);
  }, [auth]);

  // Monday digest
  useEffect(() => {
    if (auth && new Date().getDay() <= 1) {
      fetch("/api/monday-digest").then(r => r.json()).then(d => { if (d.digest) setDigest(d); }).catch(() => {});
    }
  }, [auth]);

  // Sprint 3: HubSpot pipeline + Classy donations (loaded with Today tab)
  useEffect(() => {
    if (!auth) return;
    setPipelineLoading(true);
    fetch("/api/hubspot-pipeline", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.deals) setPipeline(d.deals); })
      .catch(() => {})
      .finally(() => setPipelineLoading(false));
    setClassDonationsLoading(true);
    fetch("/api/classy-donations", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.donations) setClassDonations(d.donations); })
      .catch(() => {})
      .finally(() => setClassDonationsLoading(false));
  }, [auth]);

  // ── Actions ──
  const emailAction = async (action, messageId, extra = {}) => {
    const emailToUndo = (action === "trash" || action === "archive") ? emails.find(e => e.id === messageId) : null;
    const r = await fetch("/api/email-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, messageId, ...extra }) });
    const d = await r.json();
    if (d.success) {
      if (["markRead", "archive", "trash", "snooze"].includes(action)) setEmails(prev => prev.filter(e => e.id !== messageId));
      // Record action for learning + show label suggestion on archive/trash
      if (["archive", "trash", "markRead", "snooze"].includes(action)) {
        const email = emailToUndo || emails.find(e => e.id === messageId);
        if (email) {
          const bucket = emailBucketOverrides[email.id] || classifyEmail(email);
          setEmailActionHistory(prev => {
            const updated = recordEmailAction(prev, bucket, action);
            try { localStorage.setItem("ffc_action_history", JSON.stringify(updated)); } catch {}
            return updated;
          });
          if (action === "trash" || action === "archive") {
            const label = suggestArchiveLabel(email);
            const labels = { archive: "Archived", markRead: "Marked as read", trash: "Deleted", star: "Starred", unstar: "Unstarred", snooze: "Snoozed" };
            const undoAction = action === "trash" ? "untrash" : "unarchive";
            const onUndo = async () => {
              const ur = await fetch("/api/email-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: undoAction, messageId }) });
              const ud = await ur.json();
              if (ud.success) {
                if (emailToUndo) setEmails(prev => prev.some(e => e.id === emailToUndo.id) ? prev : [emailToUndo, ...prev]);
                showToast("Restored");
              } else {
                showToast("Restore failed");
              }
            };
            showToast(label ? `${labels[action] || "Done"} · ${label}` : (labels[action] || "Done"), onUndo);
          } else {
            const labels = { markRead: "Marked as read", snooze: "Snoozed" };
            showToast(labels[action] || "Done");
          }
          return d;
        }
      }
      const labels = { archive: "Archived", markRead: "Marked as read", trash: "Deleted", star: "Starred", unstar: "Unstarred", snooze: "Snoozed" };
      showToast(labels[action] || "Done");
    }
    return d;
  };

  const batchAction = async (action, ids) => {
    const r = await fetch("/api/email-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, messageIds: ids }) });
    const d = await r.json();
    if (d.success) {
      if (["markRead", "archive", "trash"].includes(action)) setEmails(prev => prev.filter(e => !ids.includes(e.id)));
      showToast(`${action === "trash" ? "Deleted" : action === "markRead" ? "Marked read" : "Archived"} ${ids.length} emails`);
    }
  };

  const sendEmail = async (payload) => {
    const r = await fetch("/api/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (d.success) {
      showToast("Email sent!");
      setComposing(null);
      if (payload.originalMessageId) {
        setEmails(prev => prev.filter(e => e.id !== payload.originalMessageId));
        fetch("/api/email-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markRead", messageId: payload.originalMessageId }) });
      }
    } else { showToast("Failed: " + (d.error || "Unknown error")); }
  };

  const scheduleEmail = (payload, scheduledAt) => {
    const entry = { id: `sch-${Date.now()}`, payload, scheduledAt };
    setScheduledEmails(prev => [...prev, entry]);
    showToast(`Scheduled: ${payload.subject || '(no subject)'} — ${getScheduledTimeLabel(scheduledAt)}`);
    setComposing(null);
  };

  const fetchAiDraft = async (email) => {
    setAiDraftLoading(email.id);
    try {
      const body = emailBody[email.id];
      const r = await fetch("/api/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          from: email.from,
          subject: email.subject,
          snippet: email.snippet,
          body: body?.body || body?.bodyHtml || email.snippet || "",
        }),
      });
      const d = await r.json();
      if (d.draft) {
        setComposing({ mode: "reply", email, prefillBody: d.draft });
        showToast("✨ AI draft ready — review before sending");
      } else {
        showToast("AI draft failed: " + (d.error || "Unknown error"));
      }
    } catch (err) {
      showToast("AI draft failed: " + err.message);
    } finally {
      setAiDraftLoading(null);
    }
  };

  const generateWeeklyBrief = async (boardMode = false) => {
    setWeeklyBriefLoading(true);
    try {
      const ctx = buildWeeklyBriefContext(emails, tasks, events, classDonations);
      const r = await fetch("/api/weekly-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ context: formatBriefContext(ctx), boardMode }),
      });
      const d = await r.json();
      if (d.brief) {
        setWeeklyBrief(prev => boardMode ? { ...(prev || {}), boardText: d.brief } : { ...(prev || {}), text: d.brief });
        showToast(boardMode ? "Board report draft ready" : "✨ Weekly brief generated");
      } else {
        showToast("Failed: " + (d.error || "Unknown error"));
      }
    } catch (err) {
      showToast("Brief generation failed: " + err.message);
    } finally {
      setWeeklyBriefLoading(false);
    }
  };

  const saveBriefToDoc = async (text, title) => {
    setBoardReportSaving(true);
    try {
      const r = await fetch("/api/create-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content: text }),
      });
      const d = await r.json();
      if (d.url) {
        window.open(d.url, "_blank");
        showToast("Saved to Google Drive!");
      } else {
        showToast("Failed: " + (d.error || "Unknown error"));
      }
    } catch (err) {
      showToast("Save failed: " + err.message);
    } finally {
      setBoardReportSaving(false);
    }
  };

  const fetchEmailBody = async (id) => {
    if (emailBody[id]) return;
    const r = await fetch(`/api/email-body?id=${id}`);
    const d = await r.json();
    setEmailBody(prev => ({ ...prev, [id]: d }));
  };

  const fetchContactHistory = async (email) => {
    const addr = email.match(/<(.+)>/)?.[1] || email;
    if (contactHistory[addr]) return;
    const r = await fetch(`/api/contact-history?email=${encodeURIComponent(addr)}`);
    const d = await r.json();
    setContactHistory(prev => ({ ...prev, [addr]: d }));
  };

  const fetchAiPrep = async (ev) => {
    if (aiPrep[ev.id]?.text || aiPrep[ev.id]?.loading) return;
    setAiPrep(prev => ({ ...prev, [ev.id]: { loading: true } }));
    try {
      const r = await fetch("/api/ai-prep", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: ev.title, date: ev.start, attendees: ev.attendees, location: ev.location, description: ev.description }),
      });
      const d = await r.json();
      if (d.prep) setAiPrep(prev => ({ ...prev, [ev.id]: { text: d.prep } }));
      else setAiPrep(prev => ({ ...prev, [ev.id]: { error: d.error || "Failed to generate prep" } }));
    } catch (e) {
      setAiPrep(prev => ({ ...prev, [ev.id]: { error: e.message } }));
    }
  };

  const calendarAction = async (action, data) => {
    const r = await fetch("/api/calendar-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...data }) });
    const d = await r.json();
    if (d.success) { showToast(action === "create" ? "Event created!" : action === "delete" ? "Event deleted" : "Event updated"); fetchData(); }
    return d;
  };

  // "This Week" — starts from TODAY, not Sunday
  const fetchWeekEvents = async () => {
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(now);
    const daysUntilSat = 6 - now.getDay();
    endOfWeek.setDate(now.getDate() + daysUntilSat); endOfWeek.setHours(23, 59, 59, 999);
    const r = await fetch("/api/calendar-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "range", startDate: today.toISOString(), endDate: endOfWeek.toISOString() }) });
    const d = await r.json();
    if (d.success) setWeekEvents(d.events || []);
  };

  const fetchNextWeekEvents = async () => {
    const now = new Date();
    const daysToMon = (8 - now.getDay()) % 7 || 7;
    const start = new Date(now); start.setDate(now.getDate() + daysToMon); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    const r = await fetch("/api/calendar-actions", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "range", startDate: start.toISOString(), endDate: end.toISOString() }) });
    const d = await r.json();
    if (d.success) setNextWeekEvents(d.events || []);
  };

  const fetchPastWeekEvents = async () => {
    const now = new Date();
    const end = new Date(now); end.setHours(0, 0, 0, 0);
    const start = new Date(end); start.setDate(end.getDate() - 7);
    const r = await fetch("/api/calendar-actions", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "range", startDate: start.toISOString(), endDate: end.toISOString() }) });
    const d = await r.json();
    if (d.success) setPastWeekEvents(d.events || []);
  };

  const fetchWeekPrep = async (prepNext = false) => {
    const now = new Date();
    let start, end;
    if (prepNext) {
      const daysToMon = (8 - now.getDay()) % 7 || 7;
      start = new Date(now); start.setDate(now.getDate() + daysToMon); start.setHours(0, 0, 0, 0);
      end = new Date(start); end.setDate(start.getDate() + 7);
    } else {
      start = new Date(now); start.setHours(0, 0, 0, 0);
      const sun = new Date(now); sun.setDate(now.getDate() + (7 - now.getDay())); sun.setHours(23, 59, 59);
      end = sun;
    }
    const r = await fetch("/api/calendar-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "range", startDate: start.toISOString(), endDate: end.toISOString() }) });
    const d = await r.json();
    if (d.success) { setWeekPrepEvents(d.events || []); setShowWeekPrep(true); }
  };

  const fetchDrive = async (action = "recent", q = "") => {
    const params = new URLSearchParams({ action }); if (q) params.set("q", q);
    const r = await fetch(`/api/drive?${params}`);
    const d = await r.json();
    if (d.files) setDriveFiles(d.files);
  };

  const browseDriveFolder = async (folder) => {
    // folder = { id, name } or null for root
    if (!folder) {
      setDriveFolderPath([]);
      fetchDrive("recent");
      setDriveView("recent");
      return;
    }
    setDriveFolderPath(prev => [...prev, folder]);
    const params = new URLSearchParams({ action: "browse", q: folder.id });
    const r = await fetch(`/api/drive?${params}`);
    const d = await r.json();
    if (d.files) setDriveFiles(d.files);
  };

  const browseDriveCrumb = async (idx) => {
    // Navigate to breadcrumb item at index idx; -1 = root
    if (idx < 0) {
      setDriveFolderPath([]);
      fetchDrive("recent");
      setDriveView("recent");
      return;
    }
    const newPath = driveFolderPath.slice(0, idx + 1);
    setDriveFolderPath(newPath);
    const folderId = newPath[newPath.length - 1].id;
    const params = new URLSearchParams({ action: "browse", q: folderId });
    const r = await fetch(`/api/drive?${params}`);
    const d = await r.json();
    if (d.files) setDriveFiles(d.files);
  };

  useEffect(() => { if (auth && tab === "drive") fetchDrive(driveView); }, [auth, tab, driveView]);
  // Close open forms/modals when switching tabs (#81)
  useEffect(() => { setShowEventForm(null); setComposing(null); setShowTaskForm(null); }, [tab]);

  const fetchDrafts = async () => {
    const r = await fetch("/api/drafts");
    const d = await r.json();
    if (d.drafts) { setDrafts(d.drafts); setDraftsTotal(d.total || d.drafts.length); }
  };
  useEffect(() => { if (auth && (tab === "drafts" || tab === "emails")) fetchDrafts(); }, [auth, tab]);

  // ── Keyboard shortcuts ──
  const TAB_IDS = ["today", "emails", "calendar", "tasks", "drive", "drafts", "sticky"];
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      if (e.key === "?") { setShowShortcuts(s => !s); return; }
      if (e.key === "Escape") { setShowShortcuts(false); setSearchOpen(false); setSearchQuery(""); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(s => !s); setSearchQuery(""); setSearchIdx(0); return; }
      if (tab === "emails") {
        if (e.key === "j") { setFocusedIdx(i => Math.min(i + 1, emails.length - 1)); return; }
        if (e.key === "k") { setFocusedIdx(i => Math.max(i - 1, 0)); return; }
        if (e.key === "e") { const em = emails[focusedIdx]; if (em) emailAction("trash", em.id); return; }
        if (e.key === "r") { const em = emails[focusedIdx]; if (em) setComposing({ mode: "reply", email: em }); return; }
      }
      const n = parseInt(e.key);
      if (n >= 1 && n <= TAB_IDS.length && !e.metaKey && !e.ctrlKey && !e.altKey) setTab(TAB_IDS[n - 1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, emails, focusedIdx]);

  // ── Derived state ──
  const BUCKET_ORDER = ['needs-response','to-do','team','financial','fyi-mass','calendar-notif','docs-activity','automated','newsletter','sales'];
  const emailsByBucket = {};
  emails.forEach(e => {
    // to-do takes priority over other buckets (and overrides)
    const senderKey = (e.from || "").toLowerCase().match(/[\w.-]+@[\w.-]+/)?.[0] || "";
    const learned = learnedBuckets[senderKey] || learnedBuckets[senderKey.split("@")[1]] || null;
    const b = toDoEmailIds.has(e.id) ? "to-do" : (emailBucketOverrides[e.id] || learned || classifyEmail(e));
    if (!emailsByBucket[b]) emailsByBucket[b] = [];
    emailsByBucket[b].push(e);
  });
  // Sort each bucket by most recent first
  for (const b of Object.keys(emailsByBucket)) {
    emailsByBucket[b].sort((a, x) => {
      const ta = a.internalDate ? parseInt(a.internalDate) : new Date(a.date || 0).getTime();
      const tx = x.internalDate ? parseInt(x.internalDate) : new Date(x.date || 0).getTime();
      return tx - ta;
    });
  }
  const FINANCIAL_KEYS = ["classy-onetime", "classy-recurring", "invoices"];
  const mergedBuckets = { ...emailsByBucket };
  const financialEmails = FINANCIAL_KEYS.flatMap(k => mergedBuckets[k] || []);
  FINANCIAL_KEYS.forEach(k => delete mergedBuckets[k]);
  mergedBuckets["financial"] = financialEmails; // always present (may be empty)
  // Always show every display bucket, even when empty (users can drag emails in)
  Object.keys(BUCKETS).filter(k => !FINANCIAL_KEYS.includes(k)).forEach(k => {
    if (!mergedBuckets[k]) mergedBuckets[k] = [];
  });
  const sortedBuckets = Object.entries(mergedBuckets).sort(([a], [b]) => {
    const ia = BUCKET_ORDER.indexOf(a); const ib = BUCKET_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const allCategories = [...CATEGORIES, ...customCategories];
  const needsReply = emailsByBucket["needs-response"] || [];
  const donationAlerts = emailsByBucket["classy-onetime"] || [];
  const todayMeetings = events.filter(isRealMeeting);
  const overdueTasks = tasks.filter(t => !t.done && t.due && new Date(t.due) < new Date());
  const pendingTasks = tasks.filter(t => !t.done).length;
  const oldestWaitingDays = (() => {
    const reply = emailsByBucket["needs-response"] || [];
    if (!reply.length) return null;
    const dates = reply.map(e => e.internalDate ? parseInt(e.internalDate) : new Date(e.date || 0).getTime()).filter(ts => ts > 0);
    if (!dates.length) return null;
    return Math.floor((Date.now() - Math.min(...dates)) / (1000 * 60 * 60 * 24));
  })();
  const dayOfWeek = new Date().getDay();
  const showPrepButton = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 5;

  // Detect Debbie's finance details email
  const debbieDetailsEmail = emails.find(e => {
    const from = (e.from || "").toLowerCase();
    const subj = (e.subject || "").toLowerCase();
    return (from.includes("debbie") || from.includes("nash")) &&
      (subj.includes("detail") || subj.includes("financial") || subj.includes("finance") || subj.includes("review") || subj.includes("statement"));
  });

  // Daily quote
  const dailyQuote = QUOTES[new Date().getDate() % QUOTES.length];

  // ── Formatters ──
  const fmtTime = (dt) => { if (!dt) return ""; return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }); };
  const fmtDate = (dt) => { if (!dt) return ""; return new Date(dt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
  const fmtRel = (ds) => { if (!ds) return ""; const d = new Date(ds); const diff = Date.now() - d; const m = Math.floor(diff / 60000); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const dy = Math.floor(h / 24); if (dy < 7) return `${dy}d ago`; return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
  const draftAge = (ds) => { if (!ds) return ""; const days = Math.floor((Date.now() - new Date(ds).getTime()) / 86400000); if (days === 0) return "Today"; if (days === 1) return "1 day"; return `${days} days`; };

  // ── Drag/drop tasks ──
  const handleTaskDragStart = (e, task) => { setDragTask(task); startDragScroll(e.clientY); };
  const handleTaskDragOver = (e, overTask, overCat) => { e.preventDefault(); setDragOverTask(overTask?.id || null); setDragOverCategory(overCat || null); };
  const handleTaskDrop = (e, targetTask, targetCategory) => {
    e.preventDefault();
    if (!dragTask) return;
    setTasks(prev => {
      let updated = [...prev];
      const dragIdx = updated.findIndex(t => t.id === dragTask.id);
      if (dragIdx === -1) return prev;
      if (targetCategory && dragTask.category !== targetCategory) updated[dragIdx] = { ...updated[dragIdx], category: targetCategory };
      if (targetTask && targetTask.id !== dragTask.id) { const moving = updated.splice(dragIdx, 1)[0]; const targetIdx = updated.findIndex(t => t.id === targetTask.id); updated.splice(targetIdx, 0, moving); }
      return updated.map((t, i) => ({ ...t, order: i }));
    });
    setDragTask(null); setDragOverTask(null); setDragOverCategory(null); stopDragScroll();
  };

  const abtn = (color, bg) => ({ padding: "4px 9px", background: bg, color, border: `1px solid ${color}30`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" });

  // ═══════════════════════════════════════════════
  //  RENDER EMAIL ROW
  //  - Hover to reveal quick action bar
  //  - Click row to expand full email + buttons
  //  - Calendar invites get RSVP buttons
  //  - Debbie finance emails get "Run Finance Review" button
  // ═══════════════════════════════════════════════
  const renderEmailRow = (email, idx, showActions = true) => {
    const isExp = expandedEmail === email.id;
    const isHov = hoveredEmail === email.id;
    const age = emailAge(email.date);
    const dot = ageDot(age);
    const bucket = classifyEmail(email);
    const isDonation = bucket === "classy-onetime";
    const isCalInvite = bucket === "calendar-notif" || (email.from || "").toLowerCase().includes("calendar-notification");
    const isDropboxSign = (email.from || "").toLowerCase().includes("dropboxsign") || (email.from || "").toLowerCase().includes("hellosign");
    const isDebbieFinance = (email.from || "").toLowerCase().includes("debbie") || (email.from || "").toLowerCase().includes("nash");
    const isPayrollApproval = (email.from || "").toLowerCase().includes("@dnatsi.com") && (email.subject || "").toLowerCase().includes("payroll approval");
    const fromName = email.from?.replace(/<.*>/, "").trim() || email.from || "";
    const fromAddr = email.from?.match(/<(.+)>/)?.[1] || email.from || "";
    const cInfo = contactHistory[fromAddr];
    const avatar = senderAvatar(email.from);
    const effectiveBucket = emailBucketOverrides[email.id] || classifyEmail(email);
    const suggestion = getSuggestedAction(emailActionHistory, effectiveBucket);
    const body = emailBody[email.id];
    const rsvpLinks = isCalInvite && body?.bodyHtml ? extractCalendarRsvpLinks(body.bodyHtml) : {};
    const score = effectiveBucket === "needs-response" ? priorityScore(email, contactHistory) : null;
    const relBadge = relationshipBadge(fromAddr, contactHistory);

    return (
      <div key={email.id}
        onMouseEnter={() => setHoveredEmail(email.id)}
        onMouseLeave={() => setHoveredEmail(null)}
        style={{
          background: isExp ? T.cardHover : T.card,
          border: `1px solid ${isDropboxSign ? T.urgentCoral : isDonation ? T.calGreenBorder : isExp ? T.accent : T.border}`,
          borderRadius: 10, marginBottom: 10, overflow: "visible",
          borderLeft: isDropboxSign ? `4px solid ${T.urgentCoral}` : isDonation ? `4px solid ${T.calGreen}` : isCalInvite ? `4px solid ${T.calGreen}` : dot ? `4px solid ${dot.color}` : undefined,
          transition: "all 0.15s",
          position: isExp ? "relative" : undefined, zIndex: isExp ? 2 : undefined,
        }}>

        {/* Row — click to expand */}
        <div onClick={() => { if (isExp) setExpandedEmail(null); else { setExpandedEmail(email.id); fetchEmailBody(email.id); fetchContactHistory(email.from); } }}
          style={{ padding: emailDensity === "compact" ? "8px 14px" : "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "background 0.15s" }}>
          {/* Checkbox — shown on hover or when anything is selected */}
          {(isHov || selectedEmailIds.size > 0) && (
            <div onClick={e => { e.stopPropagation(); setSelectedEmailIds(prev => { const n = new Set(prev); n.has(email.id) ? n.delete(email.id) : n.add(email.id); return n; }); }}
              style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 4, border: `2px solid ${selectedEmailIds.has(email.id) ? T.emailBlue : T.border}`, background: selectedEmailIds.has(email.id) ? T.emailBlue : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.1s" }}>
              {selectedEmailIds.has(email.id) && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
            </div>
          )}
          {/* Sender avatar */}
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatar.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0, position: "relative" }}>
            {avatar.initials}
            {isDropboxSign && <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 13 }}>🔏</span>}
            {isDonation && <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 13 }}>💚</span>}
            {isCalInvite && <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 13 }}>📅</span>}
            {dot && <div style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: dot.color, border: "2px solid #fff" }} title={dot.label} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fromName}</span>
              {email.unreadCount > 1 && <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: T.emailBlueBg, color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, flexShrink: 0 }}>{email.unreadCount}</span>}
              <span style={{ fontSize: 14, color: T.textDim, flexShrink: 0 }}>{fmtRel(email.date)}</span>
            </div>
            <div style={{ fontSize: 16, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{email.subject}</div>
            {!isExp && <div style={{ fontSize: 15, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>{email.snippet}</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            {score !== null && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: score >= 10 ? T.urgentCoralBg : score >= 5 ? T.taskAmberBg : T.bg, color: score >= 10 ? T.urgentCoral : score >= 5 ? T.taskAmber : T.textMuted, border: `1px solid ${score >= 10 ? T.urgentCoral : score >= 5 ? T.taskAmber : T.border}30` }} title="Priority score">P{score}</span>}
            {relBadge && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 8, background: relBadge === "Lapsed" ? T.dangerBg : relBadge === "Frequent" ? T.accentBg : T.infoBg, color: relBadge === "Lapsed" ? T.danger : relBadge === "Frequent" ? T.accent : T.info }}>{relBadge}</span>}
            {cInfo && !isExp && <div style={{ fontSize: 12, color: T.textDim, textAlign: "right", lineHeight: 1.4 }}><div>{cInfo.totalMessages} emails</div><div>Last: {fmtRel(cInfo.lastContact)}</div></div>}
          </div>
        </div>

        {/* Hover quick-action bar (collapsed only) */}
        {!isExp && isHov && showActions && (
          <div style={{ padding: "8px 20px 12px", borderTop: `1px solid ${T.borderLight}`, display: "flex", flexWrap: "wrap", gap: 6 }}
            onClick={e => e.stopPropagation()}>
            {isCalInvite ? (
              <>
                {rsvpLinks.accept && <a href={rsvpLinks.accept} target="_blank" rel="noopener noreferrer" style={abtn(T.calGreen, T.calGreenBg)}>✓ Accept</a>}
                {rsvpLinks.decline && <a href={rsvpLinks.decline} target="_blank" rel="noopener noreferrer" style={abtn(T.danger, T.dangerBg)}>✗ Decline</a>}
                {rsvpLinks.maybe && <a href={rsvpLinks.maybe} target="_blank" rel="noopener noreferrer" style={abtn(T.info, T.infoBg)}>? Maybe</a>}
                <a href="https://calendar.google.com/calendar/r" target="_blank" rel="noopener noreferrer" style={abtn(T.calGreen, T.calGreenBg)}>📅 View Calendar</a>
                <button onClick={() => emailAction("trash", email.id)} style={abtn(T.danger, T.dangerBg)}>🗑 Delete</button>
              </>
            ) : (
              <>
                {suggestion && (
                  <button onClick={() => emailAction(suggestion.action, email.id)}
                    style={{ ...abtn(T.accent, T.accentBg), fontWeight: 700 }}
                    title={`Suggested based on ${suggestion.count} similar emails`}>
                    ✨ {suggestion.action === "archive" ? "Archive" : suggestion.action === "trash" ? "Delete" : suggestion.action === "markRead" ? "Mark Read" : suggestion.action === "snooze" ? "Snooze" : suggestion.action}
                  </button>
                )}
                {isEmailActionVisible("reply", emailActionConfig) && <button onClick={() => { setExpandedEmail(email.id); fetchEmailBody(email.id); fetchContactHistory(email.from); setComposing({ mode: "reply", email }); }} style={abtn(T.emailBlue, T.emailBlueBg)}>↩ Reply</button>}
                {isEmailActionVisible("aiDraft", emailActionConfig) && <button onClick={() => { setExpandedEmail(email.id); fetchEmailBody(email.id); fetchContactHistory(email.from); fetchAiDraft(email); }} style={{ ...abtn(T.accent, T.accentBg), fontWeight: 700 }} disabled={aiDraftLoading === email.id} title="AI writes a first draft for you to review">{aiDraftLoading === email.id ? "✨ Drafting..." : "✨ Draft Reply"}</button>}
                {isEmailActionVisible("trash", emailActionConfig) && <button onClick={() => emailAction("trash", email.id)} style={abtn(T.danger, T.dangerBg)}>🗑 Delete</button>}
                {isEmailActionVisible("markRead", emailActionConfig) && <button onClick={() => emailAction("markRead", email.id)} style={abtn(T.textMuted, T.bg)}>✓ Read</button>}
                {isEmailActionVisible("star", emailActionConfig) && <button onClick={() => emailAction("star", email.id)} style={abtn(T.gold, T.goldBg)}>⭐ Star</button>}
                {isEmailActionVisible("makeTask", emailActionConfig) && <button onClick={() => setShowTaskForm({ prefillFromEmail: email })} style={abtn(T.taskAmber, T.taskAmberBg)}>📋 Make Task</button>}
                {isEmailActionVisible("toDo", emailActionConfig) && (effectiveBucket === "to-do"
                  ? <button onClick={() => setToDoEmailIds(prev => { const n = new Set(prev); n.delete(email.id); return n; })} style={abtn(T.calGreen, T.calGreenBg)}>✓ Done</button>
                  : <button onClick={() => setToDoEmailIds(prev => new Set([...prev, email.id]))} style={abtn(T.accent, T.accentBg)}>📌 To Do</button>
                )}
                {isDebbieFinance && <button onClick={() => setFinancePanel(email)} style={abtn(T.taskAmber, T.taskAmberBg)}>📊 Finance Review</button>}
                {isPayrollApproval && <button onClick={() => setPayrollPanel(email)} style={{ padding: "4px 9px", background: T.taskAmber, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>💰 Payroll Review</button>}
                {isEmailActionVisible("moveTo", emailActionConfig) && (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setMovingEmailId(movingEmailId === email.id ? null : email.id)} style={abtn(T.driveViolet, T.driveVioletBg)}>📂 Move to…</button>
                    {movingEmailId === email.id && (
                      <div style={{ position: "absolute", top: "110%", left: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 8, zIndex: 100, minWidth: 220, boxShadow: "0 4px 16px rgba(0,0,0,0.13)" }}>
                        {Object.entries(BUCKETS).map(([key, bInfo]) => (
                          <button key={key} onClick={() => { setEmailBucketOverrides(prev => ({ ...prev, [email.id]: key })); setMovingEmailId(null); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: effectiveBucket === key ? bInfo.bg : "transparent", color: effectiveBucket === key ? bInfo.color : T.text, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: effectiveBucket === key ? 700 : 400 }}>
                            {bInfo.icon} {bucketLabels[key] || bInfo.label}
                          </button>
                        ))}
                        {emailBucketOverrides[email.id] && (
                          <button onClick={() => { setEmailBucketOverrides(prev => { const u = { ...prev }; delete u[email.id]; return u; }); setMovingEmailId(null); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "transparent", color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 12, marginTop: 6 }}>
                            ↺ Reset to auto-classified
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Expanded email body + full actions */}
        {isExp && (
          <div style={{ padding: "0 20px 18px", borderTop: `1px solid ${T.borderLight}` }}>
            {cInfo && <div style={{ padding: "10px 0", fontSize: 14, color: T.textMuted, display: "flex", gap: 16, borderBottom: `1px solid ${T.borderLight}`, marginBottom: 12 }}>
              <span>📧 {cInfo.totalMessages} total messages</span><span>Last contact: {fmtRel(cInfo.lastContact)}</span>
            </div>}

            {/* Calendar RSVP bar */}
            {isCalInvite && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 0", borderBottom: `1px solid ${T.borderLight}`, marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: T.calGreen, fontWeight: 600, marginRight: 4 }}>📅 Calendar Invite:</span>
                {rsvpLinks.accept ? <a href={rsvpLinks.accept} target="_blank" rel="noopener noreferrer" style={{ ...abtn(T.calGreen, T.calGreenBg), textDecoration: "none" }}>✓ Accept</a> : null}
                {rsvpLinks.decline ? <a href={rsvpLinks.decline} target="_blank" rel="noopener noreferrer" style={{ ...abtn(T.danger, T.dangerBg), textDecoration: "none" }}>✗ Decline</a> : null}
                {rsvpLinks.maybe ? <a href={rsvpLinks.maybe} target="_blank" rel="noopener noreferrer" style={{ ...abtn(T.info, T.infoBg), textDecoration: "none" }}>? Maybe</a> : null}
                <a href="https://calendar.google.com/calendar/r" target="_blank" rel="noopener noreferrer" style={{ ...abtn(T.calGreen, T.calGreenBg), textDecoration: "none" }}>Open Calendar</a>
              </div>
            )}

            {/* Email body */}
            <div style={{ padding: "14px 0", fontSize: 16, lineHeight: 1.7, color: T.text, maxHeight: 420, overflowY: "auto" }}>
              {body?.bodyHtml ? (
                <div dangerouslySetInnerHTML={{ __html: body.bodyHtml }} style={{ wordBreak: "break-word" }} />
              ) : body?.body ? (
                <div style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: (body.body || "").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#3B82C4">$1</a>') }} />
              ) : (
                <div style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: (email.snippet || "Loading...").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#3B82C4">$1</a>') }} />
              )}
            </div>

            {/* Quick replies */}
            {showActions && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.textMuted, marginBottom: 8 }}>Quick Reply:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {getQuickReplies(email).map((qr, i) => (
                    <button key={i} onClick={() => setComposing({ mode: "reply", email, prefillBody: qr.text })}
                      style={{ padding: "9px 16px", background: T.accentBg, color: T.accent, border: `1px solid ${T.accent}30`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 500 }} title={qr.text}>
                      {qr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Full action buttons */}
            {showActions && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.borderLight}` }}>
                {isEmailActionVisible("reply", emailActionConfig) && <button onClick={() => setComposing({ mode: "reply", email })} style={abtn(T.emailBlue, T.emailBlueBg)}>↩ Reply</button>}
                {isEmailActionVisible("aiDraft", emailActionConfig) && <button onClick={() => fetchAiDraft(email)} style={{ ...abtn(T.accent, T.accentBg), fontWeight: 700 }} disabled={aiDraftLoading === email.id} title="AI writes a first draft for you to review">{aiDraftLoading === email.id ? "✨ Drafting..." : "✨ Draft Reply"}</button>}
                {isEmailActionVisible("forward", emailActionConfig) && <button onClick={() => { fetchEmailBody(email.id); setComposing({ mode: "forward", email }); }} style={abtn(T.driveViolet, T.driveVioletBg)}>↗ Forward</button>}
                {isEmailActionVisible("markRead", emailActionConfig) && <button onClick={() => emailAction("markRead", email.id)} style={abtn(T.textMuted, T.bg)}>✓ Mark Read</button>}
                {isEmailActionVisible("trash", emailActionConfig) && <button onClick={() => emailAction("trash", email.id)} style={abtn(T.danger, T.dangerBg)}>🗑 Delete</button>}
                {isEmailActionVisible("star", emailActionConfig) && <button onClick={() => emailAction("star", email.id)} style={abtn(T.gold, T.goldBg)}>⭐ Star</button>}
                {isEmailActionVisible("snooze", emailActionConfig) && (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setShowSnooze(showSnooze === email.id ? null : email.id)} style={abtn(T.info, T.infoBg)}>⏰ Snooze</button>
                    {showSnooze === email.id && <SnoozePicker onSnooze={(until) => { emailAction("snooze", email.id, { snoozeUntil: until }); setShowSnooze(null); }} onCancel={() => setShowSnooze(null)} />}
                  </div>
                )}
                {isEmailActionVisible("makeTask", emailActionConfig) && <button onClick={() => setShowTaskForm({ prefillFromEmail: email })} style={abtn(T.taskAmber, T.taskAmberBg)}>📋 Make Task</button>}
                {isEmailActionVisible("makeEvent", emailActionConfig) && <button onClick={() => setShowEventForm({ prefillFromEmail: email })} style={abtn(T.calGreen, T.calGreenBg)}>📅 Make Event</button>}
                {isDebbieFinance && <button onClick={() => setFinancePanel(email)} style={abtn(T.taskAmber, T.taskAmberBg)}>📊 Finance Review</button>}
                {isPayrollApproval && <button onClick={() => setPayrollPanel(email)} style={{ ...abtn(T.taskAmber, "#fff"), background: T.taskAmber, color: "#fff" }}>💰 Run Payroll Review</button>}
                {email.listUnsubscribe && <button onClick={() => { window.open(email.listUnsubscribe.replace(/[<>]/g, ""), "_blank"); showToast("Opening unsubscribe link..."); }} style={abtn(T.danger, T.dangerBg)}>🚫 Unsubscribe</button>}
              </div>
            )}

            {composing && composing.email?.id === email.id && (
              <div style={{ marginTop: 14 }}>
                <ComposeForm mode={composing.mode} email={email} onSend={sendEmail} onSchedule={scheduleEmail} onCancel={() => setComposing(null)} signature={signature} prefillBody={composing.prefillBody || ""} contacts={contacts} forwardAttachments={composing.mode === "forward" ? (emailBody[email.id]?.attachments || []) : []} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  //  TABS
  // ═══════════════════════════════════════════════
  const TABS = [
    { id: "today", label: "", color: T.accent, icon: "🏠" },
    { id: "emails", label: "Emails", color: T.emailBlue, icon: "✉️" },
    { id: "calendar", label: "Calendar", color: T.calGreen, icon: "📅" },
    { id: "tasks", label: "Tasks", color: T.taskAmber, icon: "📋" },
    { id: "drive", label: "Drive", color: T.driveViolet, icon: "📁" },
    { id: "settings", label: "Settings", color: T.textMuted, icon: "⚙️" },
  ];

  // ═══════════════════════════════════════════════
  //  LOADING / AUTH SCREENS
  // ═══════════════════════════════════════════════
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ textAlign: "center" }}><LeafIcon size={44} style={{ marginBottom: 12, opacity: 0.6 }} /><div style={{ color: T.textMuted, fontSize: 18 }}>Loading your command center...</div></div>
    </div>
  );

  if (auth === false) return <MagicLoginScreen />;

  return (
    <>
      <Head><title>FFC Command Center</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${T.bg}; color: ${T.text}; }
        @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .tab-content { animation: fadeIn 0.15s ease; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        button:hover { filter: brightness(0.95); }
        a { color: ${T.emailBlue}; }
      `}</style>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "22px 18px" }} onDragOver={e => { dragScrollRef.current.clientY = e.clientY; }} onDragEnd={stopDragScroll} onDrop={stopDragScroll}>

        {/* HEADER with daily quote */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <LeafIcon size={32} />
              <span style={{ fontSize: 24, fontWeight: 700, color: T.text }}>Fresh Food Connect</span>
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic", paddingLeft: 44 }}>"{dailyQuote.text}" <span style={{ fontStyle: "normal", fontWeight: 600 }}>— {dailyQuote.attr}</span></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setDarkMode(d => !d)} title={darkMode ? "Switch to light mode" : "Switch to dark mode"} style={{ padding: "10px 13px", background: darkMode ? T.card : T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>{darkMode ? "☀️" : "🌙"}</button>
            <button onClick={() => { setSearchOpen(true); setSearchQuery(""); setSearchIdx(0); }} style={{ padding: "10px 16px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>🔍 Search <span style={{ fontSize: 11, opacity: 0.7 }}>⌘K</span></button>
            <button onClick={() => setTab("sticky")} style={{ padding: "10px 18px", background: darkMode ? T.stickyYellowBg : "#FFF8E8", color: darkMode ? T.stickyYellow : "#B8A030", border: `1px solid ${darkMode ? T.stickyYellowBorder : "#E8D890"}`, borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>📌 Capture</button>
            <button onClick={() => setComposing("compose")} style={{ padding: "10px 22px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer" }}>+ Compose</button>
          </div>
        </div>

        {/* Payroll approval — sticky global alert, always visible regardless of tab (#94) */}
{!payrollPanel && emails.filter(e => (e.from || "").toLowerCase().includes("@dnatsi.com") && (e.subject || "").toLowerCase().includes("payroll approval")).map(e => (
          <div key={e.id} onClick={() => setPayrollPanel(e)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 22px", background: "#D45555", borderRadius: 12, marginBottom: 20, cursor: "pointer", boxShadow: "0 4px 20px rgba(212,85,85,0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>💰</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Payroll Approval Needed — Respond Today</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 1 }}>{e.from?.replace(/<.*>/, "").trim()} · {e.subject}</div>
              </div>
            </div>
            <div style={{ padding: "10px 24px", background: "#fff", color: "#D45555", borderRadius: 8, fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>Run Payroll Review →</div>
          </div>
        ))}

        {/* Board prep — sticky alert when board meeting is within 21 days */}
        {boardPrepInfo?.meeting && !boardPrepPanel && (
          <div onClick={() => setBoardPrepPanel(true)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 22px", background: T.emailBlue, borderRadius: 12, marginBottom: 12, cursor: "pointer", boxShadow: "0 4px 20px rgba(59,130,196,0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>📋</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Board Meeting Prep Due — April 6 is 5 days away</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 1 }}>Copy board report, draft staff email, draft board email, pull 1:1 agenda items</div>
              </div>
            </div>
            <div style={{ padding: "10px 24px", background: "#fff", color: T.emailBlue, borderRadius: 8, fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>Start Prep →</div>
          </div>
        )}

        {/* Board Prep Panel */}
        {boardPrepPanel && (
          <BoardPrepPanel meeting={boardPrepInfo?.meeting} latestBoardReport={boardPrepInfo?.latestBoardReport} onClose={() => setBoardPrepPanel(false)} showToast={showToast} />
        )}

        {/* Finance Review Panel (modal-style overlay) */}
        {financePanel && (
          <FinanceReviewPanel email={financePanel} onClose={() => setFinancePanel(null)} showToast={showToast} />
        )}

        {/* Payroll Review Panel (#94) */}
        {payrollPanel && (
          <PayrollReviewPanel email={payrollPanel} cache={payrollCache} onCacheUpdate={(id, data) => setPayrollCache(prev => ({ ...prev, [id]: data }))} onClose={() => setPayrollPanel(null)} showToast={showToast} />
        )}

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: `2px solid ${T.border}`, paddingBottom: 0, alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap" }}>
          {TABS.map(t => {
            if (t.id === "emails") {
              const isEmailActive = tab === "emails" || tab === "drafts";
              return (
                <div key="emails" style={{ position: "relative" }}
                  onMouseEnter={() => setEmailDropdownOpen(true)}
                  onMouseLeave={() => setEmailDropdownOpen(false)}>
                  <button onClick={() => setTab("emails")} style={{
                    padding: "13px 22px", background: isEmailActive ? t.color + "12" : "transparent",
                    color: isEmailActive ? t.color : T.textMuted, border: "none",
                    borderBottom: isEmailActive ? `3px solid ${t.color}` : "3px solid transparent",
                    borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 16, fontWeight: isEmailActive ? 700 : 500,
                    display: "flex", alignItems: "center", gap: 7, transition: "all 0.25s", whiteSpace: "nowrap",
                  }}>
                    <span>✉️</span> Emails
                    {emails.length > 0 && <span style={{ background: T.emailBlue, color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 13, fontWeight: 700 }}>{emails.length}</span>}
                    {draftsTotal > 0 && <span style={{ background: T.info, color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 13, fontWeight: 700 }}>✏️ {draftsTotal}</span>}
                    <span style={{ fontSize: 11, color: "currentColor", marginLeft: 2, opacity: 0.6 }}>▾</span>
                  </button>
                  {emailDropdownOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, zIndex: 200, minWidth: 150, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden" }}>
                      <button onClick={() => { setTab("emails"); setEmailDropdownOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 18px", background: tab === "emails" ? T.emailBlueBg : "transparent", color: T.text, border: "none", cursor: "pointer", fontSize: 15 }}>📥 Inbox</button>
                      <button onClick={() => { setTab("drafts"); setEmailDropdownOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 18px", background: tab === "drafts" ? T.infoBg : "transparent", color: T.text, border: "none", cursor: "pointer", fontSize: 15, borderTop: `1px solid ${T.border}` }}>✏️ Drafts{draftsTotal > 0 ? ` (${draftsTotal})` : ""}</button>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "13px 22px", background: tab === t.id ? t.color + "12" : "transparent",
                color: tab === t.id ? t.color : T.textMuted, border: "none",
                borderBottom: tab === t.id ? `3px solid ${t.color}` : "3px solid transparent",
                borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
                display: "flex", alignItems: "center", gap: 7, transition: "all 0.25s", whiteSpace: "nowrap",
              }}>
                <span style={{ fontSize: t.label ? 16 : 20 }}>{t.icon}</span>{t.label ? ` ${t.label}` : ""}
                {t.id === "tasks" && pendingTasks > 0 && <span style={{ background: T.taskAmber, color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 13, fontWeight: 700 }}>{pendingTasks}</span>}
                {t.id === "calendar" && countTodayMeetings(events) > 0 && <span style={{ background: T.calGreen, color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 13, fontWeight: 700 }}>{countTodayMeetings(events)}</span>}
              </button>
            );
          })}
        </div>

        {/* Session expiry banner */}
        {sessionExpired && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}`, borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>🔑</span>
            <span style={{ flex: 1, fontSize: 15, color: T.danger, fontWeight: 600 }}>Session expired — please reconnect to continue.</span>
            <a href="/api/auth/login" style={{ padding: "8px 20px", background: T.danger, color: "#fff", borderRadius: 7, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>Reconnect</a>
          </div>
        )}

        {/* Global compose */}
        {composing === "compose" && <ComposeForm mode="compose" onSend={sendEmail} onSchedule={scheduleEmail} onCancel={() => setComposing(null)} signature={signature} contacts={contacts} />}
        {showTaskForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowTaskForm(null)}>
            <div style={{ width: "100%", maxWidth: 500 }} onClick={e => e.stopPropagation()}>
              <TaskForm prefillFromEmail={showTaskForm.prefillFromEmail} initialCategory={showTaskForm.category || "admin"} categories={allCategories} onSave={(task) => { setTasks(prev => [...prev, task]); setShowTaskForm(null); showToast("Task created!"); }} onCancel={() => setShowTaskForm(null)} />
            </div>
          </div>
        )}
        {showEventForm && <EventForm event={showEventForm.event || null} prefillFromEmail={showEventForm.prefillFromEmail} contacts={contacts} onSave={(data) => { if (data.eventId) { calendarAction("update", { eventId: data.eventId, event: data }); } else { calendarAction("create", { event: data }); } setShowEventForm(null); }} onCancel={() => setShowEventForm(null)} />}

        {/* ═══════════ TODAY TAB ═══════════ */}
        {tab === "today" && (
          <div className="tab-content">
            {/* Morning Briefing */}
            <div style={{ background: T.accentBg, border: `1px solid ${T.accent}30`, borderLeft: `5px solid ${T.accent}`, borderRadius: 14, padding: "28px 32px", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <LeafIcon size={26} />
                <span style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {userSettings.userName} ✨</span>
              </div>
              <div style={{ fontSize: 17, lineHeight: 1.8, color: T.text }}>
                {needsReply.length > 0 && <span style={{ fontWeight: 600, color: T.urgentCoral }}>{needsReply.length} email{needsReply.length !== 1 ? "s" : ""} need your reply</span>}
                {needsReply.length > 0 && todayMeetings.length > 0 && <span style={{ color: T.textMuted }}> · </span>}
                {todayMeetings.length > 0 && <span style={{ fontWeight: 600, color: T.calGreen }}>{todayMeetings.length} meeting{todayMeetings.length !== 1 ? "s" : ""} today</span>}
                {(needsReply.length > 0 || todayMeetings.length > 0) && overdueTasks.length > 0 && <span style={{ color: T.textMuted }}> · </span>}
                {overdueTasks.length > 0 && <span style={{ fontWeight: 600, color: T.danger }}>{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""}</span>}
                {needsReply.length === 0 && todayMeetings.length === 0 && overdueTasks.length === 0 && <span style={{ color: T.calGreen }}>All clear — you're on top of things!</span>}
                {oldestWaitingDays !== null && oldestWaitingDays > 0 && <div style={{ marginTop: 8, fontSize: 14, color: oldestWaitingDays > 7 ? T.danger : T.gold }}> Oldest reply waiting: <strong>{oldestWaitingDays} day{oldestWaitingDays !== 1 ? "s" : ""}</strong></div>}
              </div>
              {digest && <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(255,255,255,0.7)", borderRadius: 8, fontSize: 15, color: T.text }}>{digest.digest}</div>}
            </div>

            {/* Urgent Box removed per issue #76 */}

            {/* ── Weekly Brief Generator ── */}
            <div style={{ background: T.card, border: `1px solid ${T.accentBg}`, borderRadius: 14, padding: "20px 24px", marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: weeklyBrief ? 16 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 19 }}>📋</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Weekly Intelligence</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => generateWeeklyBrief(false)} disabled={weeklyBriefLoading} style={{ padding: "7px 16px", background: T.accentBg, color: T.accent, border: `1px solid ${T.accent}30`, borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    {weeklyBriefLoading ? "✨ Generating..." : "✨ Weekly Brief"}
                  </button>
                  <button onClick={() => generateWeeklyBrief(true)} disabled={weeklyBriefLoading} style={{ padding: "7px 16px", background: T.infoBg, color: T.info, border: `1px solid ${T.info}30`, borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    📄 Board Report Draft
                  </button>
                  {weeklyBrief && <button onClick={() => setWeeklyBrief(null)} style={{ padding: "7px 12px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 16, lineHeight: 1 }} title="Close">×</button>}
                </div>
              </div>
              {weeklyBrief?.text && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, marginBottom: 8 }}>WEEKLY BRIEF</div>
                  <div style={{ fontSize: 15, lineHeight: 1.8, color: T.text, whiteSpace: "pre-wrap", padding: "14px 16px", background: T.accentBg, borderRadius: 8 }}>{weeklyBrief.text}</div>
                  <button onClick={() => saveBriefToDoc(weeklyBrief.text, `Weekly Brief — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`)} disabled={boardReportSaving} style={{ marginTop: 10, padding: "7px 16px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    📁 Save to Drive
                  </button>
                </div>
              )}
              {weeklyBrief?.boardText && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, marginBottom: 8 }}>BOARD REPORT DRAFT <span style={{ color: T.danger, fontWeight: 700 }}>— Review before sharing</span></div>
                  <div style={{ fontSize: 15, lineHeight: 1.8, color: T.text, whiteSpace: "pre-wrap", padding: "14px 16px", background: T.infoBg, borderRadius: 8 }}>{weeklyBrief.boardText}</div>
                  <button onClick={() => saveBriefToDoc(weeklyBrief.boardText, `DRAFT Board Report — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`)} disabled={boardReportSaving} style={{ marginTop: 10, padding: "7px 16px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    📁 Save Board Report to Drive
                  </button>
                </div>
              )}
            </div>

            {/* Finance review banner — shows when Debbie's details email is in inbox */}
            {debbieDetailsEmail && !financePanel && (
              <div style={{ background: T.taskAmberBg, border: `2px solid ${T.taskAmberBorder}`, borderRadius: 12, padding: "16px 22px", marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>📊</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: T.taskAmber }}>Finance details email from Debbie</div>
                    <div style={{ fontSize: 14, color: T.textMuted, marginTop: 2 }}>{debbieDetailsEmail.subject}</div>
                  </div>
                </div>
                <button onClick={() => setFinancePanel(debbieDetailsEmail)} style={{ padding: "10px 22px", background: T.taskAmber, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer", flexShrink: 0 }}>
                  Run Finance Review →
                </button>
              </div>
            )}

            {/* Prep for week button */}
            {showPrepButton && <button onClick={() => { if (dayOfWeek === 5) { setTab("calendar"); setCalView("nextWeek"); fetchNextWeekEvents(); } else { setTab("calendar"); setCalView("week"); fetchWeekEvents(); } }} style={{ width: "100%", padding: "15px 22px", marginBottom: 22, background: T.calGreenBg, color: T.calGreen, border: `2px solid ${T.calGreenBorder}`, borderRadius: 12, cursor: "pointer", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span>🗓</span> {dayOfWeek === 5 ? "Prep for Next Week" : "Week Ahead Prep"}
            </button>}

            {/* Week Prep Modal */}
            {showWeekPrep && (
              <div style={{ background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 14, padding: 24, marginBottom: 26 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span style={{ fontSize: 19, fontWeight: 700, color: T.calGreen }}>🗓 Week Ahead</span>
                  <button onClick={() => setShowWeekPrep(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: T.textMuted }}>×</button>
                </div>
                {weekPrepEvents.filter(isRealMeeting).map(ev => {
                  const prepped = preppedEvents[ev.id];
                  return (
                    <div key={ev.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: aiPrep[ev.id]?.text ? "none" : `1px solid ${T.borderLight}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 16, color: prepped ? T.calGreen : T.text }}>{ev.title}</div>
                          <div style={{ fontSize: 15, color: T.textMuted }}>{fmtDate(ev.start)} · {fmtTime(ev.start)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", background: T.calGreenBg, color: T.calGreen, border: `1px solid ${T.calGreenBorder}`, borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Join Call</a>}
                          {(() => { const docUrl = extractDocFromEvent(ev); return docUrl ? <a href={docUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>📄 Agenda Doc</a> : <button onClick={() => { setTab("drive"); setDriveSearch(ev.title); fetchDrive("search", ev.title); }} style={{ padding: "7px 16px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Find Agenda</button>; })()}
                          <button onClick={() => fetchAiPrep(ev)}
                            style={{ padding: "7px 16px", background: aiPrep[ev.id]?.text ? T.goldBg : T.accentBg, color: aiPrep[ev.id]?.text ? T.gold : T.accent, border: `1px solid ${aiPrep[ev.id]?.text ? T.taskAmberBorder : T.border}`, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                            {aiPrep[ev.id]?.loading ? "✨ Prepping..." : aiPrep[ev.id]?.text ? "✨ View Prep" : "✨ AI Prep"}
                          </button>
                          <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })}
                            style={{ padding: "7px 16px", background: prepped ? T.calGreenBg : T.bg, color: prepped ? T.calGreen : T.textMuted, border: `1px solid ${prepped ? T.calGreenBorder : T.border}`, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                            {prepped ? "✓ Prepped" : "Prep Done"}
                          </button>
                        </div>
                      </div>
                      {aiPrep[ev.id]?.text && (
                        <div style={{ background: T.goldBg, border: `1px solid ${T.taskAmberBorder}`, borderRadius: 10, padding: "16px 20px", marginBottom: 12, borderBottom: `1px solid ${T.borderLight}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <span>✨</span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: T.gold }}>AI Prep — {ev.title}</span>
                            <button onClick={() => setAiPrep(prev => { const n = { ...prev }; delete n[ev.id]; return n; })} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 18 }}>×</button>
                          </div>
                          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{aiPrep[ev.id].text}</div>
                        </div>
                      )}
                      {aiPrep[ev.id]?.error && (
                        <div style={{ color: T.danger, fontSize: 13, padding: "8px 12px", background: T.dangerBg, borderRadius: 8, marginBottom: 8 }}>{aiPrep[ev.id].error}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Donation Alerts */}
            {donationAlerts.length > 0 && (
              <div style={{ background: T.calGreenBg, border: `1px solid ${T.calGreenBorder}`, borderLeft: `5px solid ${T.calGreen}`, borderRadius: 14, padding: "20px 26px", marginBottom: 26 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 22 }}>💚</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.calGreen }}>Donation Alerts</span>
                  <span style={{ fontSize: 13, color: T.calGreen, background: "#fff", padding: "3px 11px", borderRadius: 8, fontWeight: 700, border: `1px solid ${T.calGreenBorder}` }}>{donationAlerts.length}</span>
                </div>
                {donationAlerts.slice(0, 3).map(e => {
                  const av = senderAvatar(e.from);
                  return (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 9, marginBottom: 6, cursor: "pointer" }} onClick={() => { setTab("emails"); setExpandedEmail(e.id); fetchEmailBody(e.id); }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: av.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{av.initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{e.from?.match(/^([^<]+)/)?.[1]?.trim() || e.from}</span>
                        <span style={{ fontSize: 13, color: T.textMuted, marginLeft: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</span>
                      </div>
                      <span style={{ fontSize: 12, color: T.textMuted, flexShrink: 0 }}>{fmtRel(e.date)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Needs Your Reply + Today's Schedule — 2 equal columns (#66: urgent section removed) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

              {/* Needs Your Reply — 1/2 */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px 28px", borderTop: `4px solid ${T.urgentCoral}`, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: needsReply.length ? 14 : 0 }}>
                  <span style={{ fontSize: 19 }}>✉️</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.urgentCoral }}>Needs Your Reply</span>
                  <span style={{ fontSize: 14, color: T.urgentCoral, background: T.urgentCoralBg, padding: "3px 11px", borderRadius: 8, fontWeight: 600 }}>{needsReply.length}</span>
                </div>
                {needsReply.length === 0 ? <div style={{ padding: "24px 0", textAlign: "center", color: T.calGreen, fontSize: 15 }}><div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>You're all caught up!</div>
                  : needsReply.slice(0, 10).map(e => {
                    const av = senderAvatar(e.from);
                    return (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: T.bg, border: `1px solid ${T.border}30`, borderRadius: 9, marginBottom: 6, cursor: "pointer", transition: "all 0.15s" }} onClick={() => { setTab("emails"); setExpandedEmail(e.id); fetchEmailBody(e.id); }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: av.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{av.initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.from?.match(/^([^<]+)/)?.[1]?.trim() || e.from}</div>
                          <div style={{ fontSize: 13, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: T.textMuted }}>{fmtRel(e.date)}</span>
                          <button onClick={ev => { ev.stopPropagation(); setComposing({ to: e.from, subject: `Re: ${e.subject}`, body: "" }); }} style={abtn(T.accent, T.accentBg)}>Reply</button>
                          <button onClick={ev => { ev.stopPropagation(); emailAction("archive", e.id); }} style={abtn(T.textMuted, T.bg)}>Archive</button>
                        </div>
                      </div>
                    );
                  })}
                {needsReply.length > 10 && <button onClick={() => setTab("emails")} style={{ width: "100%", padding: "9px", background: T.emailBlueBg, color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, marginTop: 6 }}>View all {needsReply.length} →</button>}
              </div>

              {/* Today's Schedule — 1/2 */}
              <div style={{ background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 14, padding: "24px 28px", borderTop: `4px solid ${T.calGreen}`, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 19 }}>📅</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.calGreen }}>Today's Schedule</span>
                </div>
                <div>
                  {events.length === 0 ? <div style={{ padding: "28px 16px", textAlign: "center", color: T.textMuted, fontSize: 15 }}><div style={{ fontSize: 44, marginBottom: 10 }}>📅</div>Nothing on the calendar today</div>
                    : events.map(ev => {
                    const real = isRealMeeting(ev);
                    const hasOthers = ev.attendees && ev.attendees.length > 1;
                    const linkedTask = !real && tasks.find(t => !t.done && t.title && ev.title.toLowerCase().includes(t.title.toLowerCase()));
                    const isExpanded = expandedCalEvent === ev.id;
                    return (
                    <div key={ev.id} style={{ borderBottom: `1px solid ${T.borderLight}`, opacity: real ? 1 : 0.7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", cursor: "pointer" }} onClick={() => setExpandedCalEvent(isExpanded ? null : ev.id)}>
                        <div style={{ width: 56, textAlign: "center", flexShrink: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: T.calGreen, letterSpacing: "0.02em" }}>{fmtTime(ev.start)}</div></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 15, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                          {ev.location && <div style={{ fontSize: 13, color: T.textMuted }}>📍 {ev.location}</div>}
                          {hasOthers && (
                            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                              {ev.attendees.slice(0, 5).map((a, i) => { const av = senderAvatar(a.name || a.email); return <div key={i} title={a.name || a.email} style={{ width: 20, height: 20, borderRadius: "50%", background: av.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, border: "1.5px solid #fff" }}>{av.initials}</div>; })}
                              {ev.attendees.length > 5 && <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.border, color: T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>+{ev.attendees.length - 5}</div>}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", background: T.calGreen, color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Join</a>}
                          {linkedTask && <button onClick={() => { setTab("drive"); setDriveSearch(linkedTask.title); fetchDrive("search", linkedTask.title); }} style={{ padding: "6px 12px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Do it →</button>}
                          {real && (
                            <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })} style={{ padding: "6px 10px", background: preppedEvents[ev.id] ? T.calGreenBg : T.bg, color: preppedEvents[ev.id] ? T.calGreen : T.textMuted, border: `1px solid ${preppedEvents[ev.id] ? T.calGreenBorder : T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                              {preppedEvents[ev.id] ? "✓" : "Prep"}
                            </button>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: "0 16px 14px 76px", fontSize: 13, color: T.textMuted }}>
                          {ev.description && <div style={{ marginBottom: 6, color: T.text }}>{ev.description}</div>}
                          {hasOthers && (
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ fontWeight: 600, color: T.text }}>Attendees: </span>
                              {ev.attendees.map(a => a.name || a.email).join(", ")}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                            {ev.htmlLink && <a href={ev.htmlLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: T.calGreen, fontWeight: 600, textDecoration: "none" }}>📅 See in Google Calendar →</a>}
                            <span style={{ color: T.textDim }}>{fmtTime(ev.start)} – {fmtTime(ev.end)}</span>
                            {real && !preppedEvents[ev.id] && (() => { const docUrl = extractDocFromEvent(ev); return docUrl ? <a href={docUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "5px 13px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>📄 Open Agenda</a> : <button onClick={() => { setTab("drive"); setDriveSearch(ev.title); fetchDrive("search", ev.title); }} style={{ padding: "5px 13px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📝 Find Agenda</button>; })()}
                            {real && (
                              <button onClick={() => fetchAiPrep(ev)} style={{ padding: "5px 13px", background: aiPrep[ev.id]?.text ? T.goldBg : T.accentBg, color: aiPrep[ev.id]?.text ? T.gold : T.accent, border: `1px solid ${aiPrep[ev.id]?.text ? T.taskAmberBorder : T.accent}30`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                {aiPrep[ev.id]?.loading ? "✨ Prepping..." : aiPrep[ev.id]?.text ? "✨ View Prep" : "✨ AI Prep"}
                              </button>
                            )}
                          </div>
                          {aiPrep[ev.id]?.text && (
                            <div style={{ marginTop: 10, padding: "12px 16px", background: T.goldBg, border: `1px solid ${T.taskAmberBorder}`, borderRadius: 8, fontSize: 13, color: T.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, color: T.taskAmber }}>✨ AI Meeting Prep</span>
                                <button onClick={() => setAiPrep(prev => { const n = { ...prev }; delete n[ev.id]; return n; })} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 16 }}>×</button>
                              </div>
                              {aiPrep[ev.id].text}
                            </div>
                          )}
                          {aiPrep[ev.id]?.error && (
                            <div style={{ marginTop: 6, color: T.danger, fontSize: 12, padding: "6px 10px", background: T.dangerBg, borderRadius: 6 }}>{aiPrep[ev.id].error}</div>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Grant Deadlines — condensed horizontal bar */}
            {(() => {
              const allGrants = [...grants, ...calendarGrants.filter(cg => !grants.some(g => g.name === cg.name && g.deadline === cg.deadline))].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
              return (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 22px", marginBottom: 26 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 18 }}>🏆</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: T.text, flexShrink: 0 }}>Grant Deadlines</span>
                    {allGrants.length === 0 && <span style={{ fontSize: 14, color: T.textMuted }}>No deadlines yet — add one or put "deadline" in a calendar event</span>}
                    {allGrants.map(g => {
                      const urgency = grantDeadlineUrgency(g.deadline);
                      const urgencyColor = urgency === "overdue" || urgency === "red" ? T.danger : urgency === "amber" ? T.taskAmber : T.calGreen;
                      const urgencyBg = urgency === "overdue" || urgency === "red" ? T.dangerBg : urgency === "amber" ? T.taskAmberBg : T.calGreenBg;
                      return (
                        <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 8px 14px", background: urgencyBg, border: `1px solid ${urgencyColor}40`, borderRadius: 10, borderLeft: `4px solid ${urgencyColor}` }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{g.name}</div>
                            <div style={{ fontSize: 12, color: urgencyColor, fontWeight: 600 }}>{formatGrantCountdown(g.deadline)} · {new Date(g.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                            {g.amount && <div style={{ fontSize: 12, color: T.textMuted }}>{g.amount}</div>}
                          </div>
                          {!g.source && <button onClick={() => setGrants(prev => prev.filter(x => x.id !== g.id))} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 18, lineHeight: 1, padding: "0 2px", marginLeft: 4 }} title="Remove">×</button>}
                        </div>
                      );
                    })}
                    <button onClick={() => setShowGrantForm(f => !f)} style={{ marginLeft: "auto", padding: "7px 14px", background: T.accentBg, color: T.accent, border: `1px solid ${T.accent}30`, borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>+ Add</button>
                  </div>
                  {showGrantForm && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <input value={grantForm.name} onChange={e => setGrantForm(f => ({ ...f, name: e.target.value }))} placeholder="Grant name" style={{ flex: "1 1 160px", padding: "7px 12px", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 14, background: T.bg }} />
                      <input value={grantForm.deadline} onChange={e => setGrantForm(f => ({ ...f, deadline: e.target.value }))} type="date" style={{ flex: "0 0 auto", padding: "7px 12px", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 14, background: T.bg }} />
                      <input value={grantForm.amount} onChange={e => setGrantForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount (optional)" style={{ flex: "1 1 130px", padding: "7px 12px", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 14, background: T.bg }} />
                      <button onClick={() => { if (!grantForm.name || !grantForm.deadline) return; setGrants(prev => [...prev, { id: Date.now(), ...grantForm }]); setGrantForm({ name: "", deadline: "", amount: "" }); setShowGrantForm(false); }} style={{ padding: "7px 16px", background: T.accent, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Save</button>
                      <button onClick={() => setShowGrantForm(false)} style={{ padding: "7px 12px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 14 }}>Cancel</button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Pipeline + Classy side by side ── */}
            <div style={{ display: "flex", gap: 20, marginBottom: 26, flexWrap: "wrap" }}>
              {(pipeline.length > 0 || pipelineLoading) && (
                <div style={{ flex: "1 1 320px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 19 }}>🎯</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Donor Pipeline</span>
                  </div>
                  {pipelineLoading ? (
                    <div style={{ color: T.textMuted, fontSize: 15 }}>Loading pipeline...</div>
                  ) : (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {parsePipelineStages(pipeline).map(({ stage, count, total }) => {
                        const isAskMade = stage === "Ask Made";
                        return (
                          <div key={stage} style={{ flex: "1 1 90px", background: isAskMade ? T.urgentCoralBg : T.bg, border: `1px solid ${isAskMade ? T.urgentCoral : T.border}30`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: isAskMade ? T.urgentCoral : T.accent }}>{count}</div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{stage}</div>
                            {total > 0 && <div style={{ fontSize: 11, color: isAskMade ? T.urgentCoral : T.accent, fontWeight: 600, marginTop: 2 }}>${total.toLocaleString()}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div style={{ flex: "1 1 320px", background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 14, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 19 }}>💚</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.calGreen }}>Recent Donations (7 days)</span>
                </div>
                {classDonationsLoading ? (
                  <div style={{ color: T.textMuted, fontSize: 15 }}>Loading donations...</div>
                ) : classDonations.length === 0 ? (
                  <div style={{ padding: "16px 0", color: T.textMuted, fontSize: 15 }}>
                    {process.env.NEXT_PUBLIC_HAS_CLASSY ? "No donations in the last 7 days." : "Connect Classy to see your recent donations. Add CLASSY_API_TOKEN to your environment variables."}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {classDonations.slice(0, 5).map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: T.calGreenBg, border: `1px solid ${T.calGreenBorder}`, borderRadius: 9 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.calGreen, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{(d.name || "?")[0].toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name || "Anonymous"}</div>
                          <div style={{ fontSize: 12, color: T.textMuted }}>{fmtRel(d.date)}</div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: T.calGreen, flexShrink: 0 }}>${(d.amount || 0).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Team Activity Digest ── */}
            {(() => {
              const teamActivity = buildTeamActivity(emails, tasks, TEAM);
              const activeUnsorted = teamActivity; // show all team members always
              const active = teamOrder.length
                ? [...activeUnsorted].sort((a, b) => {
                    const ia = teamOrder.indexOf(a.email); const ib = teamOrder.indexOf(b.email);
                    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                  })
                : activeUnsorted;
              return (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 26 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 19 }}>👥</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Team This Week</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {active.map(m => {
                      const isOpen = teamNoteOpen === m.email;
                      const teamMember = TEAM.find(t => t.email === m.email);
                      const style = teamMember?.meetingStyle || 'email';
                      const isDropTarget = dragOverTeam === m.email && dragTeam !== m.email;
                      return (
                      <div key={m.email}
                        draggable
                        onDragStart={e => { setDragTeam(m.email); startDragScroll(e.clientY); }}
                        onDragEnd={() => { setDragTeam(null); setDragOverTeam(null); stopDragScroll(); }}
                        onDragOver={e => { e.preventDefault(); setDragOverTeam(m.email); }}
                        onDrop={() => {
                          if (!dragTeam || dragTeam === m.email) return;
                          const order = active.map(x => x.email);
                          const from = order.indexOf(dragTeam); const to = order.indexOf(m.email);
                          order.splice(from, 1); order.splice(to, 0, dragTeam);
                          setTeamOrder(order);
                          try { localStorage.setItem('ffc_team_order', JSON.stringify(order)); } catch {}
                          setDragTeam(null); setDragOverTeam(null);
                        }}
                        style={{ flex: "1 1 140px", background: T.bg, border: `1px solid ${isDropTarget ? T.accent : style === 'notes' ? T.border : isOpen ? T.accent : T.border}`, borderRadius: 10, padding: "12px 14px", position: "relative", cursor: "grab", opacity: dragTeam === m.email ? 0.5 : 1, transition: "opacity 0.15s, border-color 0.15s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: senderAvatar(m.name).color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{m.initials}</div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{m.name.split(' ')[0]}</div>
                        </div>
                        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.8 }}>
                          {m.recentEmailCount > 0 && <div>✉️ {m.recentEmailCount} email{m.recentEmailCount !== 1 ? "s" : ""}</div>}
                          {m.completedTaskCount > 0 && <div style={{ color: T.calGreen }}>✓ {m.completedTaskCount} done</div>}
                          {m.pendingTaskCount > 0 && <div>📋 {m.pendingTaskCount} pending</div>}
                        </div>
                        {style === 'notes' && (() => {
                          const noteText = teamNoteTexts[m.email] || '';
                          const isSaving = teamNoteSaving === m.email;
                          return (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                              <textarea value={noteText} onChange={e => setTeamNoteTexts(prev => ({ ...prev, [m.email]: e.target.value }))} placeholder={`Add to 1:1 with ${m.name.split(' ')[0]}…`} rows={3} style={{ width: "100%", padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, resize: "vertical", fontFamily: "inherit", color: T.text, background: T.surface, boxSizing: "border-box" }} />
                              <button disabled={!noteText.trim() || isSaving} onClick={async () => {
                                setTeamNoteSaving(m.email);
                                try {
                                  const r = await fetch('/api/drive-note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ personName: m.name, note: noteText }) });
                                  const d = await r.json();
                                  if (r.ok) { showToast(`Added to ${d.docName}`); setTeamNoteTexts(prev => ({ ...prev, [m.email]: '' })); }
                                  else { showToast('Failed: ' + (d.error || 'Unknown error')); }
                                } catch (err) { showToast('Error: ' + err.message); }
                                finally { setTeamNoteSaving(null); }
                              }} style={{ marginTop: 6, width: "100%", padding: "6px 0", background: T.accent, color: "#fff", border: "none", borderRadius: 6, cursor: noteText.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}>{isSaving ? "Saving…" : "→ Google Doc"}</button>
                            </div>
                          );
                        })()}
                        {(style === 'email' || style === 'email-chat') && (() => {
                          const noteText = teamNoteTexts[m.email] || '';
                          return (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                              <textarea value={noteText} onChange={e => setTeamNoteTexts(prev => ({ ...prev, [m.email]: e.target.value }))} placeholder={`Quick message to ${m.name.split(' ')[0]}…`} rows={2} style={{ width: "100%", padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, resize: "vertical", fontFamily: "inherit", color: T.text, background: T.surface, boxSizing: "border-box" }} />
                              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                <button onClick={() => { setComposing({ to: m.email, subject: '', body: noteText }); setTeamNoteTexts(prev => ({ ...prev, [m.email]: '' })); }} style={{ flex: 1, padding: "6px 0", background: T.accentBg, color: T.accent, border: `1px solid ${T.accent}30`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>✉️ Email</button>
                                {style === 'email-chat' && <button onClick={() => window.open('https://chat.google.com/', '_blank')} style={{ flex: 1, padding: "6px 0", background: T.emailBlueBg, color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>💬 Chat</button>}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Team Meeting Agenda ── */}
            {(() => {
              const grouped = groupAgendaItems(agendaItems.filter(a => !a.done));
              const doneItems = agendaItems.filter(a => a.done);
              const teamFirstNames = TEAM.map(t => t.name.split(' ')[0]);
              return (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 26 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 19 }}>📋</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Team Meeting Agenda</span>
                    {agendaItems.filter(a => !a.done).length > 0 && <span style={{ fontSize: 13, color: T.accent, background: T.accentBg, padding: "2px 9px", borderRadius: 6, fontWeight: 600 }}>{agendaItems.filter(a => !a.done).length}</span>}
                  </div>
                  {/* Add item row */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <input
                      value={agendaInput}
                      onChange={e => setAgendaInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && agendaInput.trim()) {
                          const item = { id: `ag-${Date.now()}`, text: agendaInput.trim(), assignee: agendaAssignee, done: false };
                          setAgendaItems(prev => [...prev, item]);
                          setAgendaInput('');
                        }
                      }}
                      placeholder="Add agenda item..."
                      style={{ flex: 1, padding: "9px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, outline: "none", color: T.text, background: T.bg }}
                    />
                    <select value={agendaAssignee} onChange={e => setAgendaAssignee(e.target.value)} style={{ padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: agendaAssignee ? T.text : T.textMuted, background: T.bg, cursor: "pointer" }}>
                      <option value="">General</option>
                      {teamFirstNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button onClick={() => {
                      if (!agendaInput.trim()) return;
                      const item = { id: `ag-${Date.now()}`, text: agendaInput.trim(), assignee: agendaAssignee, done: false };
                      setAgendaItems(prev => [...prev, item]);
                      setAgendaInput('');
                    }} style={{ padding: "9px 18px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Add</button>
                  </div>
                  {/* Grouped items */}
                  {Object.keys(grouped).length === 0 && doneItems.length === 0 && (
                    <div style={{ padding: "28px 16px", textAlign: "center", color: T.textMuted, fontSize: 14 }}><div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>No agenda items yet — add items above</div>
                  )}
                  {Object.entries(grouped).map(([assignee, items]) => (
                    <div key={assignee} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{assignee}</div>
                      {items.map(item => (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, marginBottom: 4 }}>
                          <button onClick={() => setAgendaItems(prev => prev.map(a => a.id === item.id ? { ...a, done: true } : a))} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${T.border}`, background: "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }} title="Mark done">○</button>
                          <span style={{ flex: 1, fontSize: 14, color: T.text }}>{item.text}</span>
                          <button onClick={() => setAgendaItems(prev => prev.filter(a => a.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 16, lineHeight: 1, padding: "0 2px" }} title="Delete">×</button>
                        </div>
                      ))}
                    </div>
                  ))}
                  {doneItems.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Done ({doneItems.length})</div>
                      {doneItems.map(item => (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", opacity: 0.5 }}>
                          <span style={{ fontSize: 12, color: T.calGreen }}>✓</span>
                          <span style={{ flex: 1, fontSize: 13, color: T.textMuted, textDecoration: "line-through" }}>{item.text}</span>
                          <button onClick={() => setAgendaItems(prev => prev.filter(a => a.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 14, lineHeight: 1, padding: "0 2px" }}>×</button>
                        </div>
                      ))}
                      <button onClick={() => setAgendaItems(prev => prev.filter(a => !a.done))} style={{ marginTop: 6, fontSize: 12, color: T.textMuted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear done</button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* End of Day */}
            {new Date().getHours() >= 16 && (
              <div style={{ background: T.goldBg, border: `1px solid ${T.taskAmberBorder}`, borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>🌅</span><span style={{ fontSize: 17, fontWeight: 700, color: T.taskAmber }}>End of Day Wrap-Up</span>
                </div>
                <div style={{ fontSize: 16, lineHeight: 1.8, color: T.text }}>
                  <div>📧 Emails still needing reply: <strong>{needsReply.length}</strong></div>
                  <div>✅ Tasks completed today: <strong>{tasks.filter(t => t.done).length}</strong></div>
                  <div>📋 Tasks carrying over: <strong>{tasks.filter(t => !t.done).length}</strong></div>
                  <div>⚠️ Overdue: <strong style={{ color: overdueTasks.length > 0 ? T.danger : T.calGreen }}>{overdueTasks.length}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ EMAILS TAB ═══════════ */}
        {tab === "emails" && (
          <div className="tab-content">
            {/* Email search bar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: T.textMuted, pointerEvents: "none" }}>🔍</span>
                <input
                  value={emailFilter}
                  onChange={e => setEmailFilter(e.target.value)}
                  placeholder="Filter emails by sender, subject, or content..."
                  style={{ width: "100%", padding: "10px 12px 10px 36px", background: T.card, color: T.text, border: `1px solid ${emailFilter ? T.emailBlue : T.border}`, borderRadius: 9, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
                {emailFilter && (
                  <button onClick={() => setEmailFilter("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: T.textMuted, padding: 0, lineHeight: 1 }}>×</button>
                )}
              </div>
              <button onClick={() => { const q = emailFilter.trim(); if (q) window.open(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(q)}`, "_blank"); }} disabled={!emailFilter.trim()} style={{ padding: "10px 16px", background: emailFilter.trim() ? T.emailBlueBg : T.bg, color: emailFilter.trim() ? T.emailBlue : T.textMuted, border: `1px solid ${emailFilter.trim() ? T.emailBlueBorder : T.border}`, borderRadius: 9, cursor: emailFilter.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>Search Gmail →</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: 15, color: T.textMuted }}>{emailFilter ? `${searchEmails(emails, emailFilter).length} matching · ` : ""}{emails.length} unread · sorted by most recent · drag to reclassify</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {/* Density toggle */}
                {[{ id: "comfortable", icon: "≡", title: "Comfortable" }, { id: "compact", icon: "⊟", title: "Compact" }].map(d => (
                  <button key={d.id} onClick={() => { setEmailDensity(d.id); try { localStorage.setItem('ffc_email_density', d.id); } catch {} }} title={d.title} style={{ padding: "5px 10px", background: emailDensity === d.id ? T.emailBlueBg : T.bg, color: emailDensity === d.id ? T.emailBlue : T.textMuted, border: `1px solid ${emailDensity === d.id ? T.emailBlueBorder : T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 16 }}>{d.icon}</button>
                ))}
                {nextPage && <button onClick={() => fetchData(nextPage)} style={{ padding: "6px 16px", background: T.emailBlueBg, color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Load More</button>}
              </div>
            </div>
            {/* Payroll approval urgent banner (#94) */}
            {emails.filter(e => (e.from || "").toLowerCase().includes("@dnatsi.com") && (e.subject || "").toLowerCase().includes("payroll approval")).map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 22px", background: "#D45555", borderRadius: 12, marginBottom: 16, boxShadow: "0 4px 16px rgba(212,85,85,0.35)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28 }}>💰</span>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Payroll Approval Needed</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>{e.from?.replace(/<.*>/, "").trim()} · {e.subject} · Must respond within hours</div>
                  </div>
                </div>
                <button onClick={() => setPayrollPanel(e)} style={{ padding: "12px 28px", background: "#fff", color: "#D45555", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 16, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                  💰 Run Payroll Review
                </button>
              </div>
            ))}

            {/* Selection action toolbar */}
            {selectedEmailIds.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: T.emailBlueBg, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.emailBlue }}>{selectedEmailIds.size} selected</span>
                <button onClick={async () => { await batchAction("trash", [...selectedEmailIds]); setSelectedEmailIds(new Set()); }} style={{ padding: "7px 16px", background: T.danger, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>🗑 Delete selected</button>
                <button onClick={async () => { await batchAction("markRead", [...selectedEmailIds]); setSelectedEmailIds(new Set()); }} style={{ padding: "7px 16px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✓ Mark read</button>
                <button onClick={() => setSelectedEmailIds(new Set())} style={{ marginLeft: "auto", padding: "7px 14px", background: "transparent", color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 14 }}>✕ Clear</button>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 18 }}>
              {sortedBuckets.map(([bucket, bucketEmails]) => {
                const info = BUCKETS[bucket] || { label: bucket, icon: "📧", color: T.textMuted, bg: T.bg, border: T.border };
                const isOver = dragOverEmailBucket === bucket;
                const canBatchDelete = ["automated", "calendar-notif", "docs-activity", "classy-recurring", "newsletter", "sales", "fyi-mass"].includes(bucket);
                const filteredBucketEmails = emailFilter.trim() ? searchEmails(bucketEmails, emailFilter) : bucketEmails;
                const page = bucketPages[bucket] || 0;
                const totalPages = Math.ceil(filteredBucketEmails.length / PAGE_SIZE);
                const visibleEmails = filteredBucketEmails.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
                return (
                  <div key={bucket}
                    onDragOver={e => { e.preventDefault(); setDragOverEmailBucket(bucket); }}
                    onDragLeave={() => setDragOverEmailBucket(null)}
                    onDrop={e => {
                      e.preventDefault();
                      if (draggingEmail && draggingEmail.id) {
                        setEmailBucketOverrides(prev => ({ ...prev, [draggingEmail.id]: bucket }));
                        // Learn: save sender email + domain → bucket for future emails
                        const senderEmail = (draggingEmail.from || "").toLowerCase().match(/[\w.-]+@[\w.-]+/)?.[0] || "";
                        const senderDomain = senderEmail.split("@")[1] || "";
                        if (senderEmail || senderDomain) {
                          setLearnedBuckets(prev => {
                            const updated = { ...prev };
                            if (senderEmail) updated[senderEmail] = bucket;
                            if (senderDomain) updated[senderDomain] = bucket;
                            try { localStorage.setItem("ffc_learned_buckets", JSON.stringify(updated)); } catch {}
                            return updated;
                          });
                        }
                      }
                      setDraggingEmail(null); setDragOverEmailBucket(null);
                    }}
                    style={{
                      background: isOver ? info.bg : T.card,
                      border: `2px solid ${isOver ? info.color : T.border}`,
                      borderTop: `4px solid ${info.color}`,
                      borderRadius: 14, padding: 18, minHeight: 120,
                      transition: "all 0.15s",
                    }}>
                    {/* Bucket header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 17 }}>{info.icon}</span>
                        {editingBucketLabel === bucket ? (
                          <form onSubmit={e => { e.preventDefault(); setBucketLabels(prev => { const updated = { ...prev }; if (editingLabelValue.trim()) updated[bucket] = editingLabelValue.trim(); else delete updated[bucket]; return updated; }); setEditingBucketLabel(null); }} style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}>
                            <input autoFocus value={editingLabelValue} onChange={e => setEditingLabelValue(e.target.value)} onBlur={() => { setBucketLabels(prev => { const updated = { ...prev }; if (editingLabelValue.trim()) updated[bucket] = editingLabelValue.trim(); else delete updated[bucket]; return updated; }); setEditingBucketLabel(null); }}
                              style={{ fontSize: 15, fontWeight: 700, color: info.color, border: `1px solid ${info.color}`, borderRadius: 6, padding: "2px 8px", background: T.bg, outline: "none", width: "100%" }} />
                          </form>
                        ) : (
                          <>
                            <span style={{ fontWeight: 700, fontSize: 16, color: info.color }}>{bucketLabels[bucket] || info.label}</span>
                            <span style={{ fontSize: 13, color: info.color, background: info.bg, padding: "2px 9px", borderRadius: 6, fontWeight: 600 }}>{bucketEmails.length}</span>
                            <button onClick={() => { setEditingBucketLabel(bucket); setEditingLabelValue(bucketLabels[bucket] || info.label); }} title="Rename section" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.textDim, padding: "0 2px", lineHeight: 1 }}>✏️</button>
                            {bucketLabels[bucket] && <button onClick={() => setBucketLabels(prev => { const u = { ...prev }; delete u[bucket]; return u; })} title="Reset to default name" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.textDim, padding: "0 2px" }}>↺</button>}
                          </>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => {
                          const allSelected = visibleEmails.length > 0 && visibleEmails.every(e => selectedEmailIds.has(e.id));
                          setSelectedEmailIds(prev => {
                            const n = new Set(prev);
                            if (allSelected) visibleEmails.forEach(e => n.delete(e.id));
                            else visibleEmails.forEach(e => n.add(e.id));
                            return n;
                          });
                        }} style={{ padding: "4px 10px", background: "transparent", color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 5, cursor: "pointer", fontSize: 12 }}>
                          {visibleEmails.every(e => selectedEmailIds.has(e.id)) && visibleEmails.length > 0 ? "✓ All" : "☐ Select"}
                        </button>
                        <button onClick={() => batchAction("markRead", bucketEmails.map(e => e.id))} style={{ padding: "4px 10px", background: "transparent", color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 5, cursor: "pointer", fontSize: 12 }}>Read all</button>
                        {canBatchDelete && <button onClick={() => batchAction("trash", visibleEmails.map(e => e.id))} style={{ padding: "4px 10px", background: "transparent", color: T.danger, border: `1px solid ${T.urgentCoralBorder}`, borderRadius: 5, cursor: "pointer", fontSize: 12 }}>Delete {totalPages > 1 ? "page" : "all"}</button>}
                      </div>
                    </div>
                    {/* Email cards */}
                    {bucketEmails.length === 0 && (
                      <div style={{ fontSize: 14, color: T.textDim, textAlign: "center", padding: "16px 0" }}>Drop emails here</div>
                    )}
                    {visibleEmails.map((e, i) => (
                      <div key={e.id}
                        draggable
                        onDragStart={ev => { setDraggingEmail(e); startDragScroll(ev.clientY); }}
                        onDragEnd={() => { setDraggingEmail(null); setDragOverEmailBucket(null); stopDragScroll(); }}
                        style={{ cursor: "grab" }}>
                        {renderEmailRow(e, i)}
                      </div>
                    ))}
                    {/* Pagination controls */}
                    {totalPages > 1 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.borderLight}` }}>
                        <button onClick={() => setBucketPages(prev => ({ ...prev, [bucket]: Math.max(0, page - 1) }))} disabled={page === 0} style={{ padding: "4px 12px", background: page === 0 ? T.bg : T.emailBlueBg, color: page === 0 ? T.textDim : T.emailBlue, border: `1px solid ${page === 0 ? T.border : T.emailBlueBorder}`, borderRadius: 6, cursor: page === 0 ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}>← Prev</button>
                        <span style={{ fontSize: 12, color: T.textMuted }}>{page + 1} / {totalPages}</span>
                        <button onClick={() => setBucketPages(prev => ({ ...prev, [bucket]: Math.min(totalPages - 1, page + 1) }))} disabled={page >= totalPages - 1} style={{ padding: "4px 12px", background: page >= totalPages - 1 ? T.bg : T.emailBlueBg, color: page >= totalPages - 1 ? T.textDim : T.emailBlue, border: `1px solid ${page >= totalPages - 1 ? T.border : T.emailBlueBorder}`, borderRadius: 6, cursor: page >= totalPages - 1 ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}>Next →</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════ CALENDAR TAB ═══════════ */}
        {tab === "calendar" && (
          <div className="tab-content">
            <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
              <button onClick={() => setCalView("today")} style={{ padding: "11px 24px", background: calView === "today" ? T.calGreenBg : T.bg, color: calView === "today" ? T.calGreen : T.textMuted, border: `1px solid ${calView === "today" ? T.calGreenBorder : T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>Today</button>
              <button onClick={() => { setCalView("week"); fetchWeekEvents(); }} style={{ padding: "11px 24px", background: calView === "week" ? T.calGreenBg : T.bg, color: calView === "week" ? T.calGreen : T.textMuted, border: `1px solid ${calView === "week" ? T.calGreenBorder : T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>This Week</button>
              <button onClick={() => { setCalView("nextWeek"); fetchNextWeekEvents(); }} style={{ padding: "11px 24px", background: calView === "nextWeek" ? T.calGreenBg : T.bg, color: calView === "nextWeek" ? T.calGreen : T.textMuted, border: `1px solid ${calView === "nextWeek" ? T.calGreenBorder : T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>Next Week</button>
              <button onClick={() => { setCalView("pastWeek"); fetchPastWeekEvents(); }} style={{ padding: "11px 24px", background: calView === "pastWeek" ? T.calGreenBg : T.bg, color: calView === "pastWeek" ? T.calGreen : T.textMuted, border: `1px solid ${calView === "pastWeek" ? T.calGreenBorder : T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>Past Week</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowEventForm({})} style={{ padding: "11px 24px", background: T.calGreen, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>+ New Event</button>
            </div>
            {showEventForm && !showEventForm.prefillFromEmail && <EventForm event={showEventForm.event || null} contacts={contacts} onSave={(data) => { if (data.eventId) { calendarAction("update", { eventId: data.eventId, event: data }); } else { calendarAction("create", { event: data }); } setShowEventForm(null); }} onCancel={() => setShowEventForm(null)} />}

            {calView === "today" && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: T.calGreen, marginBottom: 16 }}>Today — {fmtDate(new Date())}</h3>
                {(() => {
                  const emptyState = calendarEmptyStateMessage(events);
                  if (emptyState) {
                    return (
                      <div style={{ padding: "48px 32px", textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 15 }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>🌿</div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: T.text, marginBottom: 6 }}>{emptyState.text}</div>
                        {emptyState.subtext && <div style={{ fontSize: 13, color: T.textDim }}>{emptyState.subtext}</div>}
                      </div>
                    );
                  }
                  return events.map(ev => {
                    const evStatus = getEventStatus(ev);
                    const isNow = evStatus === "inprogress";
                    const isSoon = evStatus === "soon";
                    const isPast = evStatus === "past";
                    const real = isRealMeeting(ev);
                    const duration = formatDuration(ev.start, ev.end);
                    const mapsUrl = !isVideoCallLocation(ev.location) ? buildMapsUrl(ev.location) : null;
                    return (
                  <div key={ev.id} style={{ background: isNow ? T.calGreenBg : T.card, border: `2px solid ${isNow ? T.calGreen : isSoon ? T.calGreenBorder : T.calGreenBorder}`, borderLeft: isNow ? `5px solid ${T.calGreen}` : isSoon ? `5px solid ${T.taskAmber}` : undefined, borderRadius: 10, padding: "18px 22px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16, opacity: (real || isNow) ? 1 : 0.5, transition: "all 0.15s" }}>
                    <div style={{ minWidth: 66, textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.calGreen }}>{fmtTime(ev.start)}</div>
                      <div style={{ fontSize: 13, color: T.textMuted }}>{fmtTime(ev.end)}</div>
                      {duration && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{duration}</div>}
                      {isNow && <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: "#fff", background: T.calGreen, borderRadius: 4, padding: "2px 6px" }}>▶ NOW</div>}
                      {isSoon && <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: T.taskAmber, background: T.taskAmberBg, borderRadius: 4, padding: "2px 6px" }}>{minsUntil(ev)}</div>}
                      {isPast && <div style={{ marginTop: 4, fontSize: 11, color: T.textMuted }}>Done</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 17, color: T.text }}>{ev.title}</div>
                      {ev.location && (
                        <div style={{ fontSize: 14, color: T.textMuted, marginTop: 3 }}>
                          📍 {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: T.calGreen, textDecoration: "none", fontWeight: 500 }}>{ev.location}</a> : ev.location}
                        </div>
                      )}
                      {ev.description && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4, lineHeight: 1.5, maxHeight: 40, overflow: "hidden" }}>{ev.description.replace(/<[^>]*>/g, "").slice(0, 120)}{ev.description.length > 120 ? "…" : ""}</div>}
                      {ev.attendees?.length > 1 && (
                        <div style={{ display: "flex", gap: 4, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                          {ev.attendees.slice(0, 6).map((a, i) => {
                            const av = senderAvatar(a.name || a.email);
                            const rsvpIcon = getAttendeeRsvpIcon(a.status);
                            const rsvpCol = getAttendeeRsvpColor(a.status);
                            const rsvpColor = rsvpCol === 'accepted' ? T.calGreen : rsvpCol === 'declined' ? T.danger : rsvpCol === 'tentative' ? T.gold : T.textDim;
                            return (
                              <div key={i} title={`${a.name || a.email} — ${a.status || 'pending'}`} style={{ display: "flex", alignItems: "center", gap: 3, background: T.bg, borderRadius: 12, padding: "2px 7px 2px 2px", border: `1px solid ${T.border}` }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: av.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{av.initials}</div>
                                <span style={{ fontSize: 11, color: rsvpColor, fontWeight: 700 }}>{rsvpIcon}</span>
                              </div>
                            );
                          })}
                          {ev.attendees.length > 6 && <span style={{ fontSize: 12, color: T.textMuted }}>+{ev.attendees.length - 6} more</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "9px 18px", background: isNow ? T.calGreen : T.calGreenBg, color: isNow ? "#fff" : T.calGreen, borderRadius: 7, textDecoration: "none", fontSize: 15, fontWeight: 700, border: `1px solid ${T.calGreenBorder}` }}>📹 {isNow ? "Join Now!" : "Join Call"}</a>}
                      {real && !preppedEvents[ev.id] && (() => { const docUrl = extractDocFromEvent(ev); return docUrl ? <a href={docUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "9px 16px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 7, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>📄 Open Agenda</a> : <button onClick={() => { setTab("drive"); setDriveSearch(ev.title); fetchDrive("search", ev.title); }} style={{ padding: "9px 16px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Prepare</button>; })()}
                      {real && <button onClick={() => setShowEventForm({ event: ev })} style={{ padding: "9px 16px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✏️ Edit</button>}
                      {real && <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })} style={{ padding: "9px 16px", background: preppedEvents[ev.id] ? T.calGreenBg : T.bg, color: preppedEvents[ev.id] ? T.calGreen : T.textMuted, border: `1px solid ${preppedEvents[ev.id] ? T.calGreenBorder : T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{preppedEvents[ev.id] ? "✓ Prepped" : "Prep Done"}</button>}
                    </div>
                  </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* This Week — only remaining days */}
            {calView === "week" && (
              <div>{(() => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const days = {};
                weekEvents.forEach(ev => {
                  if (new Date(ev.start) < today) return; // skip past days
                  const day = new Date(ev.start).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
                  if (!days[day]) days[day] = [];
                  days[day].push(ev);
                });
                const entries = Object.entries(days);
                if (entries.length === 0) return <div style={{ padding: 32, textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 16 }}>No more events this week</div>;
                return entries.map(([day, dayEvents]) => (
                  <div key={day} style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 17, fontWeight: 700, color: T.calGreen, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${T.calGreenBorder}` }}>{day}</h4>
                    {dayEvents.map(ev => {
                      const wkStatus = getEventStatus(ev);
                      const wkNow = wkStatus === "inprogress";
                      const wkSoon = wkStatus === "soon";
                      const wkDuration = formatDuration(ev.start, ev.end);
                      const wkMapsUrl = !isVideoCallLocation(ev.location) ? buildMapsUrl(ev.location) : null;
                      return (
                      <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", marginBottom: 6, background: wkNow ? T.calGreenBg : T.card, border: `1px solid ${wkNow ? T.calGreen : T.border}`, borderLeft: wkNow ? `4px solid ${T.calGreen}` : wkSoon ? `4px solid ${T.taskAmber}` : undefined, borderRadius: 8, opacity: isRealMeeting(ev) ? 1 : 0.5 }}>
                        <div style={{ minWidth: 70, textAlign: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: T.calGreen, display: "block" }}>{fmtTime(ev.start)}</span>
                          {wkDuration && <span style={{ fontSize: 11, color: T.textDim, display: "block" }}>{wkDuration}</span>}
                          {wkNow && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: T.calGreen, borderRadius: 3, padding: "1px 5px", display: "inline-block", marginTop: 2 }}>▶ NOW</span>}
                          {wkSoon && <span style={{ fontSize: 10, fontWeight: 700, color: T.taskAmber, display: "block", marginTop: 2 }}>{minsUntil(ev)}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, color: T.text, fontWeight: wkNow ? 700 : 400 }}>{ev.title}</div>
                          {ev.location && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>📍 {wkMapsUrl ? <a href={wkMapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: T.calGreen, textDecoration: "none" }}>{ev.location}</a> : ev.location}</div>}
                          {ev.attendees?.length > 1 && (
                            <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                              {ev.attendees.slice(0, 5).map((a, i) => {
                                const av = senderAvatar(a.name || a.email);
                                const rsvpIcon = getAttendeeRsvpIcon(a.status);
                                const rsvpCol = getAttendeeRsvpColor(a.status);
                                const rsvpColor = rsvpCol === 'accepted' ? T.calGreen : rsvpCol === 'declined' ? T.danger : rsvpCol === 'tentative' ? T.gold : T.textDim;
                                return (
                                  <div key={i} title={`${a.name || a.email} — ${a.status || 'pending'}`} style={{ display: "flex", alignItems: "center", gap: 2, background: T.bg, borderRadius: 10, padding: "1px 5px 1px 2px", border: `1px solid ${T.border}` }}>
                                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: av.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700 }}>{av.initials}</div>
                                    <span style={{ fontSize: 10, color: rsvpColor, fontWeight: 700 }}>{rsvpIcon}</span>
                                  </div>
                                );
                              })}
                              {ev.attendees.length > 5 && <span style={{ fontSize: 11, color: T.textMuted }}>+{ev.attendees.length - 5}</span>}
                            </div>
                          )}
                        </div>
                        {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 14px", background: wkNow ? T.calGreen : T.calGreenBg, color: wkNow ? "#fff" : T.calGreen, borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600, border: `1px solid ${T.calGreenBorder}` }}>📹 {wkNow ? "Join Now" : "Join"}</a>}
                        <button onClick={() => setShowEventForm({ event: ev })} style={{ padding: "6px 12px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>✏️</button>
                        <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })} style={{ padding: "6px 14px", background: preppedEvents[ev.id] ? T.calGreenBg : T.bg, color: preppedEvents[ev.id] ? T.calGreen : T.textMuted, border: `1px solid ${preppedEvents[ev.id] ? T.calGreenBorder : T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{preppedEvents[ev.id] ? "✓ Prepped" : "Prep Done"}</button>
                      </div>
                    ); })}
                  </div>
                ));
              })()}</div>
            )}

            {/* Next Week */}
            {calView === "nextWeek" && (
              <div>{(() => {
                const days = {};
                nextWeekEvents.forEach(ev => {
                  const day = new Date(ev.start).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
                  if (!days[day]) days[day] = [];
                  days[day].push(ev);
                });
                const entries = Object.entries(days);
                if (entries.length === 0) return <div style={{ padding: "48px 32px", textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 15 }}><div style={{ fontSize: 48, marginBottom: 12 }}>📆</div>No events next week</div>;
                return entries.map(([day, dayEvents]) => (
                  <div key={day} style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 17, fontWeight: 700, color: T.calGreen, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${T.calGreenBorder}` }}>{day}</h4>
                    {dayEvents.map(ev => {
                      const nwDuration = formatDuration(ev.start, ev.end);
                      const nwMapsUrl = !isVideoCallLocation(ev.location) ? buildMapsUrl(ev.location) : null;
                      return (
                      <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", marginBottom: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, opacity: isRealMeeting(ev) ? 1 : 0.5 }}>
                        <div style={{ minWidth: 66, textAlign: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: 15, color: T.calGreen, display: "block" }}>{fmtTime(ev.start)}</span>
                          {nwDuration && <span style={{ fontSize: 11, color: T.textDim, display: "block" }}>{nwDuration}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 16, color: T.text }}>{ev.title}</span>
                          {ev.location && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>📍 {nwMapsUrl ? <a href={nwMapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: T.calGreen, textDecoration: "none" }}>{ev.location}</a> : ev.location}</div>}
                        </div>
                        {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 14px", background: T.calGreen, color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Join</a>}
                        <button onClick={() => setShowEventForm({ event: ev })} style={{ padding: "6px 12px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>✏️</button>
                        <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })} style={{ padding: "6px 14px", background: preppedEvents[ev.id] ? T.calGreenBg : T.bg, color: preppedEvents[ev.id] ? T.calGreen : T.textMuted, border: `1px solid ${preppedEvents[ev.id] ? T.calGreenBorder : T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{preppedEvents[ev.id] ? "✓ Prepped" : "Prep Done"}</button>
                      </div>
                    ); })}
                  </div>
                ));
              })()}</div>
            )}

            {/* Past Week — for meeting follow-ups (#70) */}
            {calView === "pastWeek" && (
              <div>
                <div style={{ padding: "10px 16px", background: T.accentBg, border: `1px solid ${T.accent}30`, borderRadius: 10, marginBottom: 20, fontSize: 14, color: T.accent, fontWeight: 500 }}>
                  📋 Use this view to follow up on last week's meetings — send notes, log outcomes, or create tasks.
                </div>
                {(() => {
                  const days = {};
                  pastWeekEvents.filter(isRealMeeting).forEach(ev => {
                    const day = new Date(ev.start).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
                    if (!days[day]) days[day] = [];
                    days[day].push(ev);
                  });
                  const entries = Object.entries(days).reverse(); // most recent first
                  if (entries.length === 0) return <div style={{ padding: "48px 32px", textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 15 }}><div style={{ fontSize: 48, marginBottom: 12 }}>📆</div>No meetings last week</div>;
                  return entries.map(([day, dayEvents]) => (
                    <div key={day} style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 17, fontWeight: 700, color: T.calGreen, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${T.calGreenBorder}` }}>{day}</h4>
                      {dayEvents.map(ev => (
                        <div key={ev.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                            <span style={{ fontWeight: 600, fontSize: 15, color: T.calGreen, minWidth: 66 }}>{fmtTime(ev.start)}</span>
                            <span style={{ fontSize: 16, color: T.text, fontWeight: 600, flex: 1 }}>{ev.title}</span>
                            {ev.attendees?.length > 1 && <span style={{ fontSize: 12, color: T.textMuted }}>{ev.attendees.length} attendees</span>}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => setComposing({ to: ev.attendees?.filter(a => !a.self).map(a => a.email).join(', ') || '', subject: `Follow-up: ${ev.title}`, body: '' })} style={{ padding: "6px 14px", background: T.accentBg, color: T.accent, border: `1px solid ${T.accent}30`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>✉️ Send follow-up</button>
                            <button onClick={() => setShowTaskForm({ title: `Follow up: ${ev.title}`, category: "admin" })} style={{ padding: "6px 14px", background: T.taskAmberBg, color: T.taskAmber, border: `1px solid ${T.taskAmberBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📋 Create task</button>
                            <button onClick={() => setDocModal({ title: `Notes: ${ev.title} — ${day}`, content: `Meeting: ${ev.title}\nDate: ${day}\nAttendees: ${ev.attendees?.map(a => a.name || a.email).join(', ') || ''}\n\nNotes:\n` })} style={{ padding: "6px 14px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📝 Log notes to Doc</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TASKS TAB ═══════════ */}
        {tab === "tasks" && (
          <div className="tab-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.taskAmber }}>Task Board</span>
              <button onClick={() => setShowTaskForm({})} style={{ padding: "10px 22px", background: T.taskAmber, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>+ New Task</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 26 }}>
              {allCategories.map(cat => {
                const catTasks = tasks.filter(t => t.category === cat.id && !t.done).sort((a, b) => (a.order || 0) - (b.order || 0));
                const doneTasks = tasks.filter(t => t.category === cat.id && t.done);
                return (
                  <div key={cat.id} onDragOver={(e) => handleTaskDragOver(e, null, cat.id)} onDrop={(e) => handleTaskDrop(e, null, cat.id)}
                    style={{ background: dragOverCategory === cat.id ? cat.bg : T.card, border: `2px solid ${dragOverCategory === cat.id ? cat.color : T.border}`, borderRadius: 14, padding: 22, minHeight: 130, borderTop: `4px solid ${cat.color}`, transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                      <span style={{ fontWeight: 700, fontSize: 17, color: cat.color }}>{cat.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, color: T.textMuted, background: cat.bg, padding: "4px 12px", borderRadius: 6, fontWeight: 600 }}>{catTasks.length}</span>
                        <button onClick={() => setShowTaskForm({ category: cat.id })} title={`Add task to ${cat.label}`} style={{ background: "none", border: `1px solid ${cat.color}`, color: cat.color, borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, padding: 0 }}>+</button>
                      </div>
                    </div>
                    {catTasks.map(task => {
                      const urg = URGENCY.find(u => u.id === task.urgency);
                      return (
                        <div key={task.id} draggable onDragStart={e => handleTaskDragStart(e, task)} onDragOver={(e) => handleTaskDragOver(e, task, cat.id)} onDrop={(e) => handleTaskDrop(e, task, cat.id)}
                          style={{ background: dragOverTask === task.id ? T.cardHover : T.surface, border: `1px solid ${dragOverTask === task.id ? cat.color : T.border}`, borderRadius: 8, padding: "16px 18px", marginBottom: 10, cursor: "grab", borderLeft: `4px solid ${urg?.dot || T.border}`, transition: "all 0.1s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <input type="checkbox" checked={task.done} onChange={() => { const wasDone = task.done; setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t)); if (wasDone) { showToast("Task reopened"); } else { showToast("Task completed!", () => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: false } : t))); } }} style={{ cursor: "pointer", width: 20, height: 20, accentColor: cat.color }} />
                            <span style={{ flex: 1, fontWeight: 600, fontSize: 16, color: T.text }}>{task.title}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            {urg && <span style={{ fontSize: 13, padding: "3px 9px", borderRadius: 4, background: urg.bg, color: urg.color, fontWeight: 600 }}>{urg.label}</span>}
                            {task.due && <span style={{ fontSize: 13, padding: "3px 9px", borderRadius: 4, background: new Date(task.due) < new Date() ? T.dangerBg : T.bg, color: new Date(task.due) < new Date() ? T.danger : T.textMuted }}>{task.due}</span>}
                          </div>
                          {task.notes && <div style={{ fontSize: 14, color: T.textMuted, marginTop: 7, lineHeight: 1.4 }}>{task.notes}</div>}
                        </div>
                      );
                    })}
                    {doneTasks.length > 0 && <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${T.border}` }}>
                      <div style={{ fontSize: 13, color: T.textDim, marginBottom: 6 }}>{doneTasks.length} completed</div>
                      {doneTasks.slice(0, 2).map(task => <div key={task.id} style={{ fontSize: 14, color: T.textDim, textDecoration: "line-through", padding: "3px 0" }}>{task.title}</div>)}
                    </div>}
                    {catTasks.length === 0 && doneTasks.length === 0 && <div style={{ fontSize: 15, color: T.textDim, textAlign: "center", padding: 18 }}>Drop tasks here</div>}
                  </div>
                );
              })}
              {/* Add Section card */}
              <div style={{ background: T.card, border: `2px dashed ${T.border}`, borderRadius: 14, padding: 20, minHeight: 130, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                {showAddSection ? (
                  <>
                    <input autoFocus value={newSectionName} onChange={e => setNewSectionName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { if (!newSectionName.trim()) return; const palette = CUSTOM_CAT_PALETTE[customCategories.length % CUSTOM_CAT_PALETTE.length]; const nc = { id: `custom-${Date.now()}`, label: newSectionName.trim(), ...palette }; const next = [...customCategories, nc]; setCustomCategories(next); try { localStorage.setItem("ffc_custom_cats", JSON.stringify(next)); } catch {} setNewSectionName(""); setShowAddSection(false); } if (e.key === "Escape") { setNewSectionName(""); setShowAddSection(false); } }} placeholder="Section name..." style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, background: T.bg, color: T.text, boxSizing: "border-box", outline: "none" }} />
                    <div style={{ display: "flex", gap: 8, width: "100%" }}>
                      <button onClick={() => { if (!newSectionName.trim()) return; const palette = CUSTOM_CAT_PALETTE[customCategories.length % CUSTOM_CAT_PALETTE.length]; const nc = { id: `custom-${Date.now()}`, label: newSectionName.trim(), ...palette }; const next = [...customCategories, nc]; setCustomCategories(next); try { localStorage.setItem("ffc_custom_cats", JSON.stringify(next)); } catch {} setNewSectionName(""); setShowAddSection(false); }} style={{ flex: 1, padding: "8px 0", background: T.taskAmber, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Add</button>
                      <button onClick={() => { setNewSectionName(""); setShowAddSection(false); }} style={{ padding: "8px 14px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 14 }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => setShowAddSection(true)} style={{ padding: "12px 22px", background: "transparent", color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 9, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>+ Add Section</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ DRIVE TAB ═══════════ */}
        {tab === "drive" && (
          <div className="tab-content">
            <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
              <input placeholder="Search Drive..." value={driveSearch} onChange={e => setDriveSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && driveSearch) { setDriveFolderPath([]); setDriveView("search"); fetchDrive("search", driveSearch); } }}
                style={{ flex: 1, padding: "12px 18px", border: `1px solid ${T.driveVioletBorder}`, borderRadius: 8, fontSize: 16, background: T.surface, color: T.text, outline: "none" }} />
              <button onClick={() => { setDriveFolderPath([]); setDriveView("search"); fetchDrive("search", driveSearch); }} style={{ padding: "12px 22px", background: T.driveViolet, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 16 }}>Search</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
              {[{ id: "recent", label: "🕐 Recent" }, { id: "starred", label: "⭐ Starred" }].map(v => (
                <button key={v.id} onClick={() => { setDriveView(v.id); setDriveFolderPath([]); fetchDrive(v.id); }} style={{ padding: "8px 18px", background: driveView === v.id && driveFolderPath.length === 0 ? T.driveVioletBg : T.bg, color: driveView === v.id && driveFolderPath.length === 0 ? T.driveViolet : T.textMuted, border: `1px solid ${driveView === v.id && driveFolderPath.length === 0 ? T.driveVioletBorder : T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>{v.label}</button>
              ))}
              <div style={{ flex: 1 }} />
              {/* Layout toggle */}
              {[{ id: "list", icon: "☰" }, { id: "grid", icon: "⊞" }].map(l => (
                <button key={l.id} onClick={() => { setDriveLayout(l.id); try { localStorage.setItem('ffc_drive_layout', l.id); } catch {} }} title={l.id === "list" ? "List view" : "Grid view"} style={{ padding: "8px 12px", background: driveLayout === l.id ? T.driveVioletBg : T.bg, color: driveLayout === l.id ? T.driveViolet : T.textMuted, border: `1px solid ${driveLayout === l.id ? T.driveVioletBorder : T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 17 }}>{l.icon}</button>
              ))}
            </div>
            {/* Breadcrumb */}
            {driveFolderPath.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, padding: "10px 14px", background: T.driveVioletBg, borderRadius: 8, flexWrap: "wrap" }}>
                <button onClick={() => browseDriveCrumb(-1)} style={{ background: "none", border: "none", color: T.driveViolet, cursor: "pointer", fontWeight: 600, fontSize: 14, padding: 0 }}>My Drive</button>
                {driveFolderPath.map((seg, i) => (
                  <span key={seg.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: T.textMuted, fontSize: 13 }}>›</span>
                    {i < driveFolderPath.length - 1
                      ? <button onClick={() => browseDriveCrumb(i)} style={{ background: "none", border: "none", color: T.driveViolet, cursor: "pointer", fontWeight: 600, fontSize: 14, padding: 0 }}>{seg.name}</button>
                      : <span style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{seg.name}</span>
                    }
                  </span>
                ))}
              </div>
            )}
            {driveLayout === "list" ? (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                {driveFiles.length === 0 ? <div style={{ padding: "40px 32px", textAlign: "center", color: T.textMuted, fontSize: 15 }}><div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>No files found</div>
                  : driveFiles.map(f => {
                    const isFolder = f.mimeType === "application/vnd.google-apps.folder";
                    if (isFolder) {
                      return (
                        <div key={f.id} onClick={() => browseDriveFolder({ id: f.id, name: f.name })} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: `1px solid ${T.borderLight}`, cursor: "pointer", color: T.text }}>
                          <span style={{ fontSize: 22 }}>📁</span>
                          <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 16 }}>{f.name}</div><div style={{ fontSize: 14, color: T.textMuted }}>Folder · Modified {fmtRel(f.modifiedTime)}</div></div>
                          <span style={{ color: T.textMuted, fontSize: 18 }}>›</span>
                        </div>
                      );
                    }
                    return (
                      <a key={f.id} href={f.webViewLink} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: `1px solid ${T.borderLight}`, textDecoration: "none", color: T.text }}>
                        <img src={f.iconLink} alt="" style={{ width: 24, height: 24 }} />
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: 16 }}>{f.name}</div><div style={{ fontSize: 14, color: T.textMuted }}>Modified {fmtRel(f.modifiedTime)}</div></div>
                        {f.starred && <span>⭐</span>}
                      </a>
                    );
                  })}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                {driveFiles.length === 0 ? <div style={{ gridColumn: "1/-1", padding: "40px 32px", textAlign: "center", color: T.textMuted, fontSize: 16 }}><div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>No files found</div>
                  : driveFiles.map(f => {
                    const isFolder = f.mimeType === "application/vnd.google-apps.folder";
                    if (isFolder) {
                      return (
                        <div key={f.id} onClick={() => browseDriveFolder({ id: f.id, name: f.name })} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 16px", background: T.driveVioletBg, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
                          <span style={{ fontSize: 48 }}>📁</span>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: T.textMuted }}>{fmtRel(f.modifiedTime)}</div>
                        </div>
                      );
                    }
                    return (
                      <a key={f.id} href={f.webViewLink} target="_blank" rel="noopener noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 16px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, textDecoration: "none", color: T.text, textAlign: "center", transition: "all 0.15s" }}>
                        <img src={f.iconLink} alt="" style={{ width: 48, height: 48 }} />
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>{fmtRel(f.modifiedTime)}</div>
                        {f.starred && <span style={{ fontSize: 12 }}>⭐</span>}
                      </a>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ DRAFTS TAB ═══════════ */}
        {tab === "drafts" && (
          <div className="tab-content">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: T.info }}>Drafts</span>
                {draftsTotal > 0 && <span style={{ fontSize: 14, color: T.info, background: T.infoBg, padding: "3px 11px", borderRadius: 8, fontWeight: 600 }}>{draftsTotal} total</span>}
              </div>
              <button onClick={fetchDrafts} style={{ padding: "8px 18px", background: T.infoBg, color: T.info, border: `1px solid ${T.info}30`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>Refresh</button>
            </div>
            {drafts.length === 0 ? (
              <div style={{ padding: "52px 32px", textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>✍️</div>
                <div style={{ fontSize: 17, marginBottom: 8, fontWeight: 600 }}>Loading drafts...</div>
                <div style={{ fontSize: 15 }}>If nothing appears, click Refresh above</div>
              </div>
            ) : drafts.map(d => {
              const isEditing = editingDraft?.id === d.id;
              return (
              <div key={d.id} style={{ background: T.card, border: `1px solid ${isEditing ? T.info : T.border}`, borderRadius: 12, padding: "20px 26px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, color: T.text }}>{d.subject || "(No subject)"}</div>
                    <div style={{ fontSize: 15, color: T.textMuted }}>To: {d.to || "(no recipient)"}</div>
                  </div>
                  <div style={{ fontSize: 14, color: T.textDim, textAlign: "right" }}>Sitting for <strong style={{ color: emailAge(d.date) > 48 ? T.danger : T.textMuted }}>{draftAge(d.date)}</strong></div>
                </div>
                {isEditing ? (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, display: "block", marginBottom: 4 }}>To</label>
                      <input value={editingDraft.to} onChange={e => setEditingDraft(prev => ({ ...prev, to: e.target.value }))}
                        style={{ width: "100%", padding: "9px 13px", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 15, boxSizing: "border-box", outline: "none", color: T.text, background: T.bg }} />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, display: "block", marginBottom: 4 }}>Subject</label>
                      <input value={editingDraft.subject} onChange={e => setEditingDraft(prev => ({ ...prev, subject: e.target.value }))}
                        style={{ width: "100%", padding: "9px 13px", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 15, boxSizing: "border-box", outline: "none", color: T.text, background: T.bg }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, display: "block", marginBottom: 4 }}>Body</label>
                      <textarea value={editingDraft.body} onChange={e => setEditingDraft(prev => ({ ...prev, body: e.target.value }))}
                        rows={8} style={{ width: "100%", padding: "9px 13px", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 15, boxSizing: "border-box", outline: "none", color: T.text, background: T.bg, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button disabled={draftSaving} onClick={async () => {
                        setDraftSaving(true);
                        const r = await fetch("/api/drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: d.id, to: editingDraft.to, subject: editingDraft.subject, body: editingDraft.body }) });
                        const res = await r.json();
                        setDraftSaving(false);
                        if (res.success) { showToast("Draft saved!"); setEditingDraft(null); fetchDrafts(); }
                        else { showToast("Save failed: " + (res.error || "Unknown error")); }
                      }} style={{ padding: "9px 22px", background: T.accent, color: "#fff", border: "none", borderRadius: 7, cursor: draftSaving ? "default" : "pointer", fontWeight: 600, fontSize: 15 }}>{draftSaving ? "Saving..." : "Save Draft"}</button>
                      <button onClick={() => setEditingDraft(null)} style={{ padding: "9px 18px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 15 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 15, color: T.textMuted, marginBottom: 14 }}>{d.snippet}</div>
                )}
                {!isEditing && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={async () => { const r = await fetch("/api/drafts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: d.id }) }); const res = await r.json(); if (res.success) { showToast("Draft sent!"); fetchDrafts(); } else { showToast("Send failed — try Edit & Send"); } }} style={{ padding: "8px 18px", background: T.accent, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>Send Now</button>
                    <button onClick={() => setEditingDraft({ id: d.id, to: d.to || "", subject: d.subject || "", body: d.body || d.snippet || "" })} style={{ padding: "8px 18px", background: T.infoBg, color: T.info, border: `1px solid ${T.info}30`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>✏️ Edit</button>
                    <button onClick={() => window.open(`https://mail.google.com/mail/#drafts/${d.messageId}`, "_blank")} style={{ padding: "8px 18px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>Edit in Gmail</button>
                    <button onClick={() => setDocModal({ title: d.subject || "Draft", content: `To: ${d.to || ""}\nSubject: ${d.subject || ""}\n\n${d.snippet || ""}` })} style={{ padding: "8px 18px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>📄 Google Doc</button>
                    <button onClick={() => setHsModal({ note: `Draft email\nTo: ${d.to || ""}\nSubject: ${d.subject || ""}\n\n${d.snippet || ""}`, subject: d.subject || "Draft" })} style={{ padding: "8px 18px", background: "#FFF4F0", color: "#FF7A59", border: "1px solid #FFB8A0", borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>🏢 HubSpot</button>
                    <button onClick={async () => { const r = await fetch(`/api/drafts?id=${d.id}`, { method: "DELETE" }); const res = await r.json(); if (res.success) { showToast("Draft deleted"); fetchDrafts(); } }} style={{ padding: "8px 18px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.urgentCoralBorder}`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>Delete</button>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* ═══════════ STICKY / QUICK CAPTURE TAB ═══════════ */}
        {/* ═══════════ SETTINGS TAB (#78) ═══════════ */}
        {tab === "settings" && (
          <div className="tab-content">
            <div style={{ maxWidth: 560, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
                <span style={{ fontSize: 22 }}>⚙️</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Settings</span>
                <span style={{ fontSize: 14, color: T.textMuted, marginLeft: 4 }}>Personalize your command center</span>
              </div>

              {/* Profile */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 18 }}>👤 Profile</div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, display: "block", marginBottom: 6 }}>Your name</label>
                  <input value={userSettings.userName} onChange={e => setUserSettings(s => ({ ...s, userName: e.target.value }))}
                    placeholder="Your name" style={{ width: "100%", padding: "11px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box" }} />
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 5 }}>Shown in the greeting on your home screen</div>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, display: "block", marginBottom: 6 }}>Organization name</label>
                  <input value={userSettings.orgName} onChange={e => setUserSettings(s => ({ ...s, orgName: e.target.value }))}
                    placeholder="Organization name" style={{ width: "100%", padding: "11px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box" }} />
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 5 }}>Your nonprofit or company name</div>
                </div>
              </div>

              {/* Email Action Buttons */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>📧 Email Action Buttons</div>
                <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 18 }}>Choose which buttons appear on email cards. Changes apply instantly.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {EMAIL_ACTION_BUTTONS.map(btn => (
                    <label key={btn.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "10px 14px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>{btn.label}</span>
                      <input
                        type="checkbox"
                        checked={isEmailActionVisible(btn.id, emailActionConfig)}
                        onChange={e => setEmailActionConfig(prev => ({ ...prev, [btn.id]: e.target.checked }))}
                        style={{ width: 18, height: 18, accentColor: T.accent, cursor: "pointer" }}
                      />
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setEmailActionConfig(getEmailActionConfig(null))}
                  style={{ marginTop: 14, padding: "8px 16px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                  ↺ Reset to defaults
                </button>
              </div>

              {/* Data */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 18 }}>🗂 Data & Privacy</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button onClick={() => { if (confirm("Clear all tasks, notes, and local preferences? This cannot be undone.")) { localStorage.clear(); showToast("Local data cleared — reload the page"); } }} style={{ padding: "10px 20px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.danger}30`, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Clear all local data</button>
                  <button onClick={() => { const data = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("ffc_")) data[k] = localStorage.getItem(k); } const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ffc-settings-backup.json"; a.click(); }} style={{ padding: "10px 20px", background: T.accentBg, color: T.accent, border: `1px solid ${T.accent}30`, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Export settings backup</button>
                </div>
              </div>

              {/* About */}
              <div style={{ background: T.accentBg, border: `1px solid ${T.accent}20`, borderRadius: 14, padding: "20px 28px", textAlign: "center" }}>
                <LeafIcon size={28} />
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginTop: 8 }}>{userSettings.orgName} Command Center</div>
                <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Built for executive directors who run fast and care deeply.</div>
              </div>
            </div>
          </div>
        )}

        {tab === "sticky" && (
          <div className="tab-content">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
              <span style={{ fontSize: 19 }}>📌</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#B8A030" }}>Quick Capture</span>
              <span style={{ fontSize: 14, color: T.textMuted, marginLeft: 8 }}>Jot it down now, sort it out later</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <textarea placeholder="Type anything — a thought, a to-do, a reminder, whatever's in your head..." value={newStickyText} onChange={e => setNewStickyText(e.target.value)} rows={2}
                style={{ flex: 1, padding: "14px 18px", border: `2px solid ${T.stickyYellowBorder}`, borderRadius: 10, fontSize: 16, background: T.stickyYellowBg, color: T.text, outline: "none", resize: "vertical", fontFamily: "inherit" }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && newStickyText.trim()) { e.preventDefault(); setStickyNotes(prev => [{ id: Date.now().toString(), text: newStickyText.trim(), createdAt: new Date().toISOString(), processed: false }, ...prev]); setNewStickyText(""); showToast("Captured!"); } }} />
              <button onClick={() => { if (!newStickyText.trim()) return; setStickyNotes(prev => [{ id: Date.now().toString(), text: newStickyText.trim(), createdAt: new Date().toISOString(), processed: false }, ...prev]); setNewStickyText(""); showToast("Captured!"); }}
                style={{ padding: "14px 24px", background: "#B8A030", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 16, alignSelf: "flex-end" }}>Capture</button>
            </div>
            {stickyNotes.length === 0 ? <div style={{ padding: "48px 32px", textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 15 }}><div style={{ fontSize: 48, marginBottom: 12 }}>💭</div>Nothing here yet. Type something above to capture a quick thought.</div>
              : stickyNotes.map(note => (
              <div key={note.id} style={{ background: note.processed ? T.bg : T.stickyYellowBg, border: `1px solid ${note.processed ? T.border : T.stickyYellowBorder}`, borderRadius: 10, padding: "16px 20px", marginBottom: 10, opacity: note.processed ? 0.6 : 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{note.text}</div>
                    <div style={{ fontSize: 13, color: T.textDim, marginTop: 6 }}>{fmtRel(note.createdAt)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => { setShowTaskForm({ prefillFromEmail: { subject: note.text } }); setStickyNotes(prev => prev.map(n => n.id === note.id ? { ...n, processed: true } : n)); }} style={{ padding: "6px 12px", background: T.taskAmberBg, color: T.taskAmber, border: `1px solid ${T.taskAmberBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>→ Task</button>
                    <button onClick={() => { setComposing("compose"); }} style={{ padding: "6px 12px", background: T.emailBlueBg, color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>→ Email</button>
                    <button onClick={() => { setShowEventForm({ prefillFromEmail: { subject: note.text } }); setStickyNotes(prev => prev.map(n => n.id === note.id ? { ...n, processed: true } : n)); }} style={{ padding: "6px 12px", background: T.calGreenBg, color: T.calGreen, border: `1px solid ${T.calGreenBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>→ Event</button>
                    <button onClick={() => setDocModal({ title: note.text.slice(0, 60) || "Quick Capture", content: note.text })} style={{ padding: "6px 12px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>📄 Doc</button>
                    <button onClick={() => setHsModal({ note: note.text, subject: note.text.slice(0, 60) || "Quick Capture" })} style={{ padding: "6px 12px", background: "#FFF4F0", color: "#FF7A59", border: "1px solid #FFB8A0", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>🏢 HubSpot</button>
                    <button onClick={() => setStickyNotes(prev => prev.filter(n => n.id !== note.id))} style={{ padding: "6px 12px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.urgentCoralBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} onDone={() => setToast(null)} />}

      {/* ═══════════ CHAT NOTIFICATIONS ═══════════ */}
      {chatNotifs.slice(-3).map((notif, i) => (
        <ChatPopup
          key={notif.id}
          notif={notif}
          offsetBottom={28 + i * 96}
          onDismiss={() => setChatNotifs(prev => prev.filter(n => n.id !== notif.id))}
        />
      ))}

      {/* ═══════════ GOOGLE DOC MODAL ═══════════ */}
      {docModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setDocModal(null); setDocModalMode("create"); setDocFolderUrl(""); setDocFolderSearch(""); setDocFolderResults([]); setDocSelectedFolder(null); setDocLinkSearch(""); setDocLinkResults([]); }}>
          <div style={{ background: T.card, borderRadius: 14, padding: "28px 32px", width: 500, maxWidth: "92vw", boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>📄 Google Doc</div>
            <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 16 }}>"{docModal.title}"</div>

            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, background: T.bg, borderRadius: 8, padding: 4 }}>
              {[{ id: "create", label: "Create new doc" }, { id: "link", label: "Link to existing" }].map(m => (
                <button key={m.id} onClick={() => setDocModalMode(m.id)} style={{ flex: 1, padding: "8px 0", background: docModalMode === m.id ? T.card : "transparent", color: docModalMode === m.id ? T.text : T.textMuted, border: docModalMode === m.id ? `1px solid ${T.border}` : "1px solid transparent", borderRadius: 6, cursor: "pointer", fontWeight: docModalMode === m.id ? 600 : 400, fontSize: 14 }}>{m.label}</button>
              ))}
            </div>

            {docModalMode === "link" ? (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    autoFocus
                    value={docLinkSearch}
                    onChange={e => setDocLinkSearch(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === "Enter" && docLinkSearch.trim()) {
                        setDocLinkSearching(true);
                        try {
                          const r = await fetch(`/api/drive?action=search&q=${encodeURIComponent(docLinkSearch.trim())}`, { credentials: "include" });
                          const d = await r.json();
                          setDocLinkResults(d.files || []);
                        } catch { setDocLinkResults([]); }
                        setDocLinkSearching(false);
                      }
                    }}
                    placeholder="Search Drive files..."
                    style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, boxSizing: "border-box", outline: "none", color: T.text, background: T.bg }}
                  />
                  <button disabled={docLinkSearching} onClick={async () => {
                    if (!docLinkSearch.trim()) return;
                    setDocLinkSearching(true);
                    try {
                      const r = await fetch(`/api/drive?action=search&q=${encodeURIComponent(docLinkSearch.trim())}`, { credentials: "include" });
                      const d = await r.json();
                      setDocLinkResults(d.files || []);
                    } catch { setDocLinkResults([]); }
                    setDocLinkSearching(false);
                  }} style={{ padding: "10px 16px", background: T.driveViolet, color: "#fff", border: "none", borderRadius: 8, cursor: docLinkSearching ? "default" : "pointer", fontWeight: 600, fontSize: 14 }}>
                    {docLinkSearching ? "..." : "Search"}
                  </button>
                </div>
                {docLinkResults.length > 0 && (
                  <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 8, maxHeight: 260, overflowY: "auto" }}>
                    {docLinkResults.map(f => (
                      <div key={f.id} onClick={() => { window.open(f.webViewLink, "_blank"); setDocModal(null); setDocModalMode("create"); setDocFolderUrl(""); setDocFolderSearch(""); setDocFolderResults([]); setDocSelectedFolder(null); setDocLinkSearch(""); setDocLinkResults([]); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, cursor: "pointer", background: T.bg }}>
                        <span style={{ fontSize: 18 }}>{driveFileIcon(f.mimeType)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, color: T.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                          <div style={{ fontSize: 12, color: T.textMuted }}>{new Date(f.modifiedTime).toLocaleDateString()}</div>
                        </div>
                        <span style={{ fontSize: 12, color: T.driveViolet, fontWeight: 600 }}>Open →</span>
                      </div>
                    ))}
                  </div>
                )}
                {docLinkResults.length === 0 && docLinkSearch && !docLinkSearching && (
                  <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 8 }}>No files found — try a different search</div>
                )}
                <button onClick={() => { setDocModal(null); setDocModalMode("create"); setDocFolderUrl(""); setDocFolderSearch(""); setDocFolderResults([]); setDocSelectedFolder(null); setDocLinkSearch(""); setDocLinkResults([]); }} style={{ width: "100%", marginTop: 8, padding: "11px 20px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15 }}>Cancel</button>
              </>
            ) : (
              <>
            {/* Folder search */}
            <label style={{ fontSize: 14, fontWeight: 600, color: T.text, display: "block", marginBottom: 6 }}>
              Save to folder <span style={{ fontWeight: 400, color: T.textMuted }}>(search or leave blank for My Drive)</span>
            </label>
            {docSelectedFolder ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.driveVioletBg, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 16 }}>📁</span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: T.driveViolet }}>{docSelectedFolder.name}</span>
                <button onClick={() => { setDocSelectedFolder(null); setDocFolderResults([]); setDocFolderSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 18 }}>×</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    value={docFolderSearch}
                    onChange={e => setDocFolderSearch(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === "Enter" && docFolderSearch.trim()) {
                        setDocFolderSearching(true);
                        try {
                          const r = await fetch(`/api/drive?action=folders&q=${encodeURIComponent(docFolderSearch.trim())}`, { credentials: "include" });
                          const d = await r.json();
                          setDocFolderResults(d.files || []);
                        } catch { setDocFolderResults([]); }
                        setDocFolderSearching(false);
                      }
                    }}
                    placeholder="Search for a folder..."
                    style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, boxSizing: "border-box", outline: "none", color: T.text, background: T.bg }}
                  />
                  <button disabled={docFolderSearching} onClick={async () => {
                    if (!docFolderSearch.trim()) return;
                    setDocFolderSearching(true);
                    try {
                      const r = await fetch(`/api/drive?action=folders&q=${encodeURIComponent(docFolderSearch.trim())}`, { credentials: "include" });
                      const d = await r.json();
                      setDocFolderResults(d.files || []);
                    } catch { setDocFolderResults([]); }
                    setDocFolderSearching(false);
                  }} style={{ padding: "10px 16px", background: T.driveViolet, color: "#fff", border: "none", borderRadius: 8, cursor: docFolderSearching ? "default" : "pointer", fontWeight: 600, fontSize: 14 }}>
                    {docFolderSearching ? "..." : "Search"}
                  </button>
                </div>
                {docFolderResults.length > 0 && (
                  <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
                    {docFolderResults.map(f => (
                      <div key={f.id} onClick={() => { setDocSelectedFolder({ id: f.id, name: f.name }); setDocFolderResults([]); setDocFolderSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, cursor: "pointer", background: T.bg }}>
                        <span style={{ fontSize: 16 }}>📁</span>
                        <span style={{ fontSize: 14, color: T.text }}>{f.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {docFolderResults.length === 0 && docFolderSearch && !docFolderSearching && (
                  <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 8 }}>No folders found — try a different search</div>
                )}
              </>
            )}

                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button
                    disabled={docSaving}
                    onClick={async () => {
                      setDocSaving(true);
                      let folderId = docSelectedFolder?.id || null;
                      if (!folderId) {
                        const m = docFolderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
                        if (m) folderId = m[1];
                      }
                      const r = await fetch("/api/create-doc", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: docModal.title, content: docModal.content, folderId }),
                      });
                      const data = await r.json();
                      setDocSaving(false);
                      if (data.url) {
                        showToast("Doc created!");
                        window.open(data.url, "_blank");
                        setDocModal(null); setDocModalMode("create"); setDocFolderUrl(""); setDocFolderSearch(""); setDocFolderResults([]); setDocSelectedFolder(null); setDocLinkSearch(""); setDocLinkResults([]);
                      } else {
                        showToast("Failed: " + (data.error || "Unknown error"));
                      }
                    }}
                    style={{ flex: 1, padding: "11px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, cursor: docSaving ? "default" : "pointer", fontWeight: 600, fontSize: 15 }}
                  >{docSaving ? "Creating..." : "Create Doc & Open"}</button>
                  <button onClick={() => { setDocModal(null); setDocModalMode("create"); setDocFolderUrl(""); setDocFolderSearch(""); setDocFolderResults([]); setDocSelectedFolder(null); setDocLinkSearch(""); setDocLinkResults([]); }} style={{ padding: "11px 20px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15 }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ HUBSPOT NOTE MODAL ═══════════ */}
      {hsModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: T.card, borderRadius: 14, padding: "28px 32px", width: 500, maxWidth: "92vw", boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>🏢 Log to HubSpot</div>
            <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 20 }}>Log as a note under a contact in HubSpot</div>
            <label style={{ fontSize: 14, fontWeight: 600, color: T.text, display: "block", marginBottom: 6 }}>Search contact</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={hsContactSearch}
                onChange={e => { setHsContactSearch(e.target.value); setHsSearchDone(false); setHsSearchError(""); }}
                placeholder="Name or email..."
                onKeyDown={async e => {
                  if (e.key === "Enter" && hsContactSearch.trim()) {
                    setHsSearching(true); setHsSearchError(""); setHsSearchDone(false);
                    try {
                      const r = await fetch(`/api/hubspot-search?q=${encodeURIComponent(hsContactSearch)}`, { credentials: "include" });
                      const d = await r.json();
                      if (!r.ok) { setHsSearchError(d.error || "Search failed"); setHsContacts([]); }
                      else { setHsContacts(d.contacts || []); }
                    } catch (err) { setHsSearchError("Network error"); }
                    finally { setHsSearching(false); setHsSearchDone(true); }
                  }
                }}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, outline: "none", color: T.text, background: T.bg }}
              />
              <button onClick={async () => {
                if (!hsContactSearch.trim()) return;
                setHsSearching(true); setHsSearchError(""); setHsSearchDone(false);
                try {
                  const r = await fetch(`/api/hubspot-search?q=${encodeURIComponent(hsContactSearch)}`, { credentials: "include" });
                  const d = await r.json();
                  if (!r.ok) { setHsSearchError(d.error || "Search failed"); setHsContacts([]); }
                  else { setHsContacts(d.contacts || []); }
                } catch (err) { setHsSearchError("Network error"); }
                finally { setHsSearching(false); setHsSearchDone(true); }
              }} style={{ padding: "10px 16px", background: T.infoBg, color: T.info, border: `1px solid ${T.info}30`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>{hsSearching ? "…" : "Search"}</button>
            </div>
            {hsSearchError && <div style={{ fontSize: 13, color: T.danger, marginBottom: 10 }}>⚠ {hsSearchError}</div>}
            {hsSearchDone && !hsSearchError && hsContacts.length === 0 && !hsSearching && <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 10 }}>No contacts found.</div>}
            {hsContacts.length > 0 && (
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 16, maxHeight: 180, overflowY: "auto" }}>
                {hsContacts.map(c => (
                  <div key={c.id} onClick={() => { setHsContactId(c.id); setHsContacts([]); setHsContactSearch(c.label); setHsSearchDone(false); }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${T.borderLight}`, fontSize: 15, color: T.text, background: hsContactId === c.id ? T.accentBg : "transparent" }}>
                    {c.label}
                  </div>
                ))}
              </div>
            )}
            {hsContactId && <div style={{ fontSize: 13, color: T.calGreen, marginBottom: 14, fontWeight: 600 }}>✓ Contact selected: {hsContactSearch}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                disabled={hsSaving || !hsContactId}
                onClick={async () => {
                  setHsSaving(true);
                  const r = await fetch("/api/hubspot-note", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contactId: hsContactId, note: hsModal.note, subject: hsModal.subject }),
                  });
                  const data = await r.json();
                  setHsSaving(false);
                  if (data.id || data.status === "ok") {
                    showToast("Logged to HubSpot!");
                    setHsModal(null);
                    setHsContactId(""); setHsContactSearch(""); setHsSearchDone(false); setHsSearchError("");
                  } else {
                    showToast("Failed: " + (data.error || "Unknown error"));
                  }
                }}
                style={{ flex: 1, padding: "11px", background: hsContactId ? "#FF7A59" : T.border, color: hsContactId ? "#fff" : T.textMuted, border: "none", borderRadius: 8, cursor: hsContactId && !hsSaving ? "pointer" : "default", fontWeight: 600, fontSize: 15 }}
              >{hsSaving ? "Logging..." : "Log Note"}</button>
              <button onClick={() => { setHsModal(null); setHsContactId(""); setHsContactSearch(""); setHsContacts([]); setHsSearchDone(false); setHsSearchError(""); }} style={{ padding: "11px 20px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ KEYBOARD SHORTCUTS OVERLAY ═══════════ */}
      {showShortcuts && (
        <div onClick={() => setShowShortcuts(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, padding: "28px 36px", width: 420, maxWidth: "92vw", boxShadow: "0 12px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>⌨️ Keyboard Shortcuts</span>
              <button onClick={() => setShowShortcuts(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textMuted }}>×</button>
            </div>
            {[
              { section: "Navigation" },
              { key: "1 – 7", desc: "Switch tabs (Today → Quick Capture)" },
              { key: "?", desc: "Toggle this shortcuts panel" },
              { key: "Esc", desc: "Close overlays" },
              { section: "Email (Emails tab)" },
              { key: "j / k", desc: "Move focus down / up through emails" },
              { key: "e", desc: "Delete focused email" },
              { key: "r", desc: "Reply to focused email" },
            ].map((row, i) => row.section ? (
              <div key={i} style={{ fontSize: 12, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: i === 0 ? 0 : 14, marginBottom: 6 }}>{row.section}</div>
            ) : (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                <code style={{ background: T.bg, padding: "3px 10px", borderRadius: 6, fontSize: 14, fontWeight: 700, color: T.text, fontFamily: "monospace" }}>{row.key}</code>
                <span style={{ fontSize: 14, color: T.textMuted }}>{row.desc}</span>
              </div>
            ))}
            <div style={{ marginTop: 18, fontSize: 13, color: T.textDim, textAlign: "center" }}>Shortcuts disabled when typing in inputs</div>
          </div>
        </div>
      )}

      {/* ── Click-away to collapse expanded email ── */}
      {expandedEmail && (
        <div onClick={() => setExpandedEmail(null)} style={{ position: "fixed", inset: 0, zIndex: 1, cursor: "default" }} />
      )}

      {/* ── Cmd+K Global Search Palette ── */}
      {searchOpen && (
        <div onClick={() => { setSearchOpen(false); setSearchQuery(""); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 640, boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${T.borderLight}`, gap: 12 }}>
              <span style={{ fontSize: 18, color: T.textMuted }}>🔍</span>
              <input
                autoFocus
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchIdx(0); }}
                onKeyDown={e => {
                  const results = [...searchEmails(emails, searchQuery).slice(0,4), ...searchTasks(tasks, searchQuery).slice(0,4), ...searchDraftsData(drafts, searchQuery).slice(0,3)];
                  if (e.key === "ArrowDown") { e.preventDefault(); setSearchIdx(i => Math.min(i + 1, results.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setSearchIdx(i => Math.max(i - 1, 0)); }
                  if (e.key === "Enter" && results[searchIdx]) {
                    const r = results[searchIdx];
                    if (r.subject !== undefined && r.to !== undefined) { setTab("emails"); } // draft
                    else if (r.subject !== undefined) { setTab("emails"); setExpandedEmail(r.id); fetchEmailBody(r.id); } // email
                    else { setTab("tasks"); } // task
                    setSearchOpen(false); setSearchQuery("");
                  }
                  if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
                }}
                placeholder="Search emails, tasks, drafts... (⌘K to close)"
                style={{ flex: 1, fontSize: 17, background: "none", border: "none", outline: "none", color: T.text }}
              />
              <span style={{ fontSize: 13, color: T.textMuted, flexShrink: 0 }}>Esc to close</span>
            </div>
            {searchQuery.trim() ? (() => {
              const emailResults = searchEmails(emails, searchQuery).slice(0, 4);
              const taskResults = searchTasks(tasks, searchQuery).slice(0, 4);
              const draftResults = searchDraftsData(drafts, searchQuery).slice(0, 3);
              const allResults = [...emailResults, ...taskResults, ...draftResults];
              if (allResults.length === 0) return <div style={{ padding: "24px 20px", color: T.textMuted, textAlign: "center", fontSize: 15 }}>No results for "{searchQuery}"</div>;
              let globalIdx = 0;
              return (
                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                  {emailResults.length > 0 && <div>
                    <div style={{ padding: "8px 20px 4px", fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Emails</div>
                    {emailResults.map((e, i) => { const idx = globalIdx++; return <div key={e.id} onClick={() => { setTab("emails"); setExpandedEmail(e.id); fetchEmailBody(e.id); setSearchOpen(false); setSearchQuery(""); }} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: idx === searchIdx ? T.accentBg : "transparent" }}><span style={{ fontSize: 15 }}>✉️</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject || "(no subject)"}</div><div style={{ fontSize: 12, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.from}</div></div></div>; })}
                  </div>}
                  {taskResults.length > 0 && <div>
                    <div style={{ padding: "8px 20px 4px", fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Tasks</div>
                    {taskResults.map((t, i) => { const idx = globalIdx++; return <div key={t.id} onClick={() => { setTab("tasks"); setSearchOpen(false); setSearchQuery(""); }} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: idx === searchIdx ? T.accentBg : "transparent" }}><span style={{ fontSize: 15 }}>📋</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div><div style={{ fontSize: 12, color: T.textMuted }}>{t.done ? "✓ Done" : t.due ? `Due ${new Date(t.due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No due date"}</div></div></div>; })}
                  </div>}
                  {draftResults.length > 0 && <div>
                    <div style={{ padding: "8px 20px 4px", fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Drafts</div>
                    {draftResults.map((d, i) => { const idx = globalIdx++; return <div key={d.id} onClick={() => { setTab("emails"); setSearchOpen(false); setSearchQuery(""); }} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: idx === searchIdx ? T.accentBg : "transparent" }}><span style={{ fontSize: 15 }}>✏️</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.subject || "(no subject)"}</div><div style={{ fontSize: 12, color: T.textMuted }}>To: {d.to || "?"}</div></div></div>; })}
                  </div>}
                </div>
              );
            })() : (
              <div style={{ padding: "16px 20px", color: T.textMuted, fontSize: 14 }}>
                <div style={{ marginBottom: 8 }}>Search across all emails, tasks, and drafts</div>
                <div style={{ fontSize: 12, color: T.textDim }}>↑↓ to navigate · Enter to open · Esc to close</div>
              </div>
            )}
          </div>
        </div>
      )}

      {expandedEmail && (
        <div onClick={() => setExpandedEmail(null)} style={{ position: "fixed", inset: 0, zIndex: 1, cursor: "default" }} />
      )}

      <LightbulbFAB />
    </>
  );
}
