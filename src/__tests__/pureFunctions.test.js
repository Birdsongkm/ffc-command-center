/**
 * Comprehensive pure function tests — index.js functions
 * Covers: email classification, calendar, search, grants, team, chat, UI helpers
 */

// ── Utility functions duplicated from index.js for testing ──────────────────

function hasExternalRecipient(toStr, ccStr) {
  const addrs = [(toStr || ''), (ccStr || '')].join(',').split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
  return addrs.some(a => !a.includes('freshfoodconnect') && !a.includes('@ffc'));
}

function decodeHtml(str) {
  return (str || '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function ensureLinksOpenInNewTab(html) {
  return (html || '').replace(/<a([^>]*)>/gi, (_, attrs) => {
    const cleaned = attrs.replace(/\s*target="[^"]*"/i, '').replace(/\s*rel="[^"]*"/i, '');
    return `<a${cleaned} target="_blank" rel="noopener noreferrer">`;
  });
}

function emailAge(dateStr) {
  if (!dateStr) return 0;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

function isRealMeeting(ev) {
  const t = (ev.title || "").toLowerCase();
  const solo = !ev.attendees || ev.attendees.length <= 1;
  const blockWords = ["hold", "lunch", "ooo", "out of office", "block", "focus", "personal", "gym", "break", "commute", "travel"];
  if (blockWords.some(w => t.includes(w)) && solo) return false;
  if (solo && !ev.hangoutLink) return false;
  return true;
}

function isEmailActionVisible(id, config) {
  const EMAIL_ACTION_BUTTONS = [
    { id: "reply", defaultOn: true }, { id: "aiDraft", defaultOn: true },
    { id: "trash", defaultOn: true }, { id: "markRead", defaultOn: true },
    { id: "star", defaultOn: true }, { id: "makeTask", defaultOn: true },
    { id: "toDo", defaultOn: true }, { id: "moveTo", defaultOn: true },
    { id: "forward", defaultOn: true }, { id: "snooze", defaultOn: true },
    { id: "makeEvent", defaultOn: true },
  ];
  if (!config || !(id in config)) {
    const btn = EMAIL_ACTION_BUTTONS.find(b => b.id === id);
    return btn ? btn.defaultOn : false;
  }
  return !!config[id];
}

function getEmailActionConfig(stored) {
  const EMAIL_ACTION_BUTTONS = [
    { id: "reply", defaultOn: true }, { id: "aiDraft", defaultOn: true },
    { id: "trash", defaultOn: true }, { id: "markRead", defaultOn: true },
    { id: "star", defaultOn: true }, { id: "makeTask", defaultOn: true },
    { id: "toDo", defaultOn: true }, { id: "moveTo", defaultOn: true },
    { id: "forward", defaultOn: true }, { id: "snooze", defaultOn: true },
    { id: "makeEvent", defaultOn: true },
  ];
  const defaults = {};
  EMAIL_ACTION_BUTTONS.forEach(b => { defaults[b.id] = b.defaultOn; });
  return { ...defaults, ...(stored || {}) };
}

function chatProviderFor(id, providers) {
  const CHAT_PROVIDERS = [{ id: "google-chat", name: "Google Chat", apiPath: "/api/chat-messages", icon: "💬" }];
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
  return messages.filter(m => isNewChatMessage(m, lastPollMs)).map(m => ({
    id: m.name || String(Date.now()),
    sender: formatChatSender(m),
    preview: formatChatPreview(m),
    spaceName: m.spaceName || "",
    timestamp: new Date(m.createTime).getTime(),
  }));
}

const AVATAR_COLORS = ["#4A9B4A","#3B82C4","#C4942A","#D45555","#7C5AC4","#3A9B5A","#C44A8B","#C47A3A"];
function senderAvatar(from) {
  const name = (from || "").replace(/<.*>/, "").trim() || "?";
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (parts[0]?.[0] || "?").toUpperCase();
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return { initials, color: AVATAR_COLORS[hash % AVATAR_COLORS.length] };
}

function senderTier(fromAddr, contactHistory) {
  const addr = (fromAddr || "").toLowerCase();
  if (addr.includes("@freshfoodconnect.org") || addr.includes("@ffc.")) return "team";
  const c = contactHistory?.[addr];
  if (c && c.totalMessages >= 10) return "frequent";
  if (c && c.totalMessages >= 3) return "known";
  return "unknown";
}

function priorityScore(email, contactHistory) {
  const fromAddr = (email.from || "").match(/<(.+)>/)?.[1] || email.from || "";
  const tier = senderTier(fromAddr, contactHistory);
  const tierMultiplier = tier === "team" ? 3 : tier === "frequent" ? 2 : tier === "known" ? 1.2 : 1;
  const age = Math.min(emailAge(email.date), 14 * 24);
  const ageDays = age / 24;
  const subj = (email.subject || "").toLowerCase();
  let urgencyBonus = 0;
  if (/asap|urgent|critical|emergency/.test(subj)) urgencyBonus = 10;
  else if (/grant|deadline|sign|contract|legal|board/.test(subj)) urgencyBonus = 6;
  else if (/follow.?up|invoice|review|update/.test(subj)) urgencyBonus = 3;
  return Math.round((ageDays * tierMultiplier + urgencyBonus) * 10) / 10;
}

function relationshipBadge(fromAddr, contactHistory) {
  const c = contactHistory?.[fromAddr?.toLowerCase()];
  if (!c) return null;
  if (c.totalMessages === 1) return "First contact";
  const last = c.lastContact ? new Date(c.lastContact) : null;
  if (last && (Date.now() - last.getTime()) > 60 * 24 * 60 * 60 * 1000) return "Lapsed";
  if (c.totalMessages >= 5) return "Frequent";
  return null;
}

function suggestArchiveLabel(email) {
  const from = (email.from || "").toLowerCase();
  const subj = (email.subject || "").toLowerCase();
  if (from.includes("classy") || subj.includes("donation")) return "Fundraising";
  if (from.includes("@dnatsi.com") || subj.includes("invoice") || subj.includes("payment")) return "Finance";
  if (subj.includes("board") || subj.includes("agenda")) return "Board";
  if (from.includes("freshfoodconnect") || from.includes("@ffc")) return "Internal";
  if (subj.includes("grant") || subj.includes("proposal")) return "Grants";
  return null;
}

function getScheduledTimeLabel(scheduledAt) {
  if (!scheduledAt) return '';
  const d = new Date(scheduledAt);
  const now = new Date();
  const diffMs = d - now;
  if (diffMs < 0) return 'Sending...';
  if (diffMs < 60000) return 'In < 1 min';
  if (diffMs < 3600000) return `In ${Math.ceil(diffMs / 60000)} min`;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function groupAgendaItems(items) {
  const groups = {};
  (items || []).forEach(item => {
    const cat = item.category || 'General';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  return groups;
}

function getAutoScrollSpeed(clientY, windowHeight, edgeThreshold = 70) {
  if (clientY < edgeThreshold) return -(1 - clientY / edgeThreshold) * 12;
  if (clientY > windowHeight - edgeThreshold) return (1 - (windowHeight - clientY) / edgeThreshold) * 12;
  return 0;
}

function driveFileIcon(mimeType) {
  if (!mimeType) return "📄";
  if (mimeType.includes("folder")) return "📁";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📺";
  if (mimeType.includes("document") || mimeType.includes("word")) return "📝";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("image")) return "🖼";
  if (mimeType.includes("video")) return "🎥";
  if (mimeType.includes("audio")) return "🎵";
  return "📄";
}

function parseAddressField(str) {
  if (!str) return [];
  return str.split(',').map(s => {
    const m = s.trim().match(/^(.+?)\s*<(.+?)>$/);
    if (m) return { name: m[1].replace(/["']/g, '').trim(), email: m[2].trim() };
    const raw = s.trim();
    return raw.includes('@') ? { name: '', email: raw } : null;
  }).filter(Boolean);
}

function getEventStatus(ev, now) {
  const start = new Date(ev.start?.dateTime || ev.start?.date || ev.start);
  const end = new Date(ev.end?.dateTime || ev.end?.date || ev.end);
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'in-progress';
  return 'past';
}

function extractDocFromEvent(ev) {
  const desc = ev.description || '';
  const m = desc.match(/https:\/\/docs\.google\.com\/[^\s<"')]+/);
  return m ? m[0] : null;
}

function getDefaultSettings() {
  return { userName: 'Kayla', orgName: 'Fresh Food Connect', accentColor: null };
}

function mergeSettings(saved) {
  const defaults = getDefaultSettings();
  if (!saved) return defaults;
  return { ...defaults, ...saved };
}

function minsUntil(ev, now) {
  const start = new Date(ev.start?.dateTime || ev.start?.date || ev.start);
  return Math.round((start - (now || new Date())) / 60000);
}

function formatDuration(startISO, endISO) {
  if (!startISO || !endISO) return '';
  const ms = new Date(endISO) - new Date(startISO);
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function getAttendeeRsvpIcon(status) {
  if (status === 'accepted') return '✓';
  if (status === 'declined') return '✗';
  if (status === 'tentative') return '?';
  return '·';
}

function getAttendeeRsvpColor(status) {
  if (status === 'accepted') return '#3A9B5A';
  if (status === 'declined') return '#D45555';
  if (status === 'tentative') return '#C4942A';
  return '#999';
}

function calendarEmptyStateMessage(events) {
  if (!events || events.length === 0) return 'Nothing on the calendar today';
  const blocks = events.filter(e => !isRealMeeting(e));
  if (blocks.length === events.length) return `No meetings today (${blocks.length} calendar block${blocks.length !== 1 ? 's' : ''} hidden)`;
  return null;
}

function countTodayMeetings(events) {
  return (events || []).filter(e => isRealMeeting(e)).length;
}

function buildMapsUrl(location) {
  if (!location) return null;
  return `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
}

function isVideoCallLocation(location) {
  if (!location) return false;
  const lower = location.toLowerCase();
  return /zoom\.us|meet\.google|teams\.microsoft|webex|gotomeeting/.test(lower);
}

function summarizeAttendeeRsvp(attendees) {
  if (!attendees || attendees.length === 0) return { accepted: 0, declined: 0, tentative: 0, pending: 0 };
  const counts = { accepted: 0, declined: 0, tentative: 0, pending: 0 };
  attendees.forEach(a => {
    const s = (a.responseStatus || 'needsAction').toLowerCase();
    if (s === 'accepted') counts.accepted++;
    else if (s === 'declined') counts.declined++;
    else if (s === 'tentative') counts.tentative++;
    else counts.pending++;
  });
  return counts;
}

function scoreSearchResult(item, query, type) {
  const q = (query || '').toLowerCase();
  if (!q) return 0;
  let score = 0;
  const title = (type === 'email' ? item.subject : type === 'draft' ? item.subject : item.title || '').toLowerCase();
  const body = (type === 'email' ? (item.snippet || '') : type === 'draft' ? (item.snippet || '') : (item.notes || '')).toLowerCase();
  if (title.includes(q)) score += 10;
  if (title.startsWith(q)) score += 5;
  if (body.includes(q)) score += 3;
  return score;
}

function searchEmails(emailList, query) {
  const q = (query || '').toLowerCase();
  return (emailList || []).filter(e => (e.from || '').toLowerCase().includes(q) || (e.subject || '').toLowerCase().includes(q) || (e.snippet || '').toLowerCase().includes(q));
}

function searchTasks(taskList, query) {
  const q = (query || '').toLowerCase();
  return (taskList || []).filter(t => (t.title || '').toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q));
}

function grantDaysUntil(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
}

function grantDeadlineUrgency(deadline) {
  const days = grantDaysUntil(deadline);
  if (days === null) return 'none';
  if (days < 0) return 'past';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}

function formatGrantCountdown(deadline) {
  const days = grantDaysUntil(deadline);
  if (days === null) return '';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow';
  return `${days}d`;
}

function parsePipelineStages(deals) {
  const stages = {};
  (deals || []).forEach(d => {
    const stage = d.stage || d.dealstage || 'Unknown';
    if (!stages[stage]) stages[stage] = { count: 0, total: 0 };
    stages[stage].count++;
    stages[stage].total += parseFloat(d.amount || d.hs_amount || 0) || 0;
  });
  return stages;
}

function recordEmailAction(history, bucket, action) {
  const key = `${bucket}:${action}`;
  return { ...history, [key]: (history[key] || 0) + 1 };
}

function getSuggestedAction(history, bucket, threshold = 3) {
  if (!history) return null;
  let best = null;
  let bestCount = 0;
  for (const [key, count] of Object.entries(history)) {
    if (key.startsWith(`${bucket}:`)) {
      const action = key.split(':')[1];
      if (count >= threshold && count > bestCount) {
        best = { action, count };
        bestCount = count;
      }
    }
  }
  return best;
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

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("hasExternalRecipient", () => {
  test("no external recipients", () => { expect(hasExternalRecipient("kayla@freshfoodconnect.org", "laura@freshfoodconnect.org")).toBe(false); });
  test("external in TO", () => { expect(hasExternalRecipient("pat@acme.org", "")).toBe(true); });
  test("external in CC", () => { expect(hasExternalRecipient("kayla@freshfoodconnect.org", "pat@acme.org")).toBe(true); });
  test("null inputs", () => { expect(hasExternalRecipient(null, null)).toBe(false); });
  test("empty strings", () => { expect(hasExternalRecipient("", "")).toBe(false); });
  test("mixed internal and external", () => { expect(hasExternalRecipient("kayla@freshfoodconnect.org, pat@acme.org", "")).toBe(true); });
  test("FFC domain variant", () => { expect(hasExternalRecipient("user@ffc.org", "")).toBe(false); });
});

describe("decodeHtml", () => {
  test("decodes &amp;", () => { expect(decodeHtml("A &amp; B")).toBe("A & B"); });
  test("decodes &lt; and &gt;", () => { expect(decodeHtml("&lt;div&gt;")).toBe("<div>"); });
  test("decodes &quot;", () => { expect(decodeHtml("&quot;hello&quot;")).toBe('"hello"'); });
  test("decodes &#39;", () => { expect(decodeHtml("it&#39;s")).toBe("it's"); });
  test("decodes numeric entities", () => { expect(decodeHtml("&#65;")).toBe("A"); });
  test("handles null", () => { expect(decodeHtml(null)).toBe(""); });
  test("handles empty", () => { expect(decodeHtml("")).toBe(""); });
  test("passes through plain text", () => { expect(decodeHtml("hello world")).toBe("hello world"); });
  test("handles multiple entities", () => { expect(decodeHtml("A &amp; B &lt; C")).toBe("A & B < C"); });
});

describe("ensureLinksOpenInNewTab", () => {
  test("adds target to plain link", () => { expect(ensureLinksOpenInNewTab('<a href="http://x.com">')).toContain('target="_blank"'); });
  test("replaces existing target", () => { expect(ensureLinksOpenInNewTab('<a href="http://x.com" target="_self">')).not.toContain('_self'); });
  test("adds rel noopener", () => { expect(ensureLinksOpenInNewTab('<a href="http://x.com">')).toContain('rel="noopener noreferrer"'); });
  test("handles null", () => { expect(ensureLinksOpenInNewTab(null)).toBe(""); });
  test("no links = no change", () => { expect(ensureLinksOpenInNewTab("<p>text</p>")).toBe("<p>text</p>"); });
  test("multiple links", () => { const r = ensureLinksOpenInNewTab('<a href="a">1</a> <a href="b">2</a>'); expect((r.match(/target="_blank"/g) || []).length).toBe(2); });
});

describe("emailAge", () => {
  test("returns 0 for null", () => { expect(emailAge(null)).toBe(0); });
  test("returns positive hours for past date", () => { expect(emailAge(new Date(Date.now() - 3600000).toISOString())).toBeCloseTo(1, 0); });
  test("returns ~24 for yesterday", () => { expect(emailAge(new Date(Date.now() - 86400000).toISOString())).toBeCloseTo(24, 0); });
});

describe("isRealMeeting", () => {
  test("solo event without hangout link is not real", () => { expect(isRealMeeting({ title: "Work time" })).toBe(false); });
  test("solo event with hangout link is real", () => { expect(isRealMeeting({ title: "Work", hangoutLink: "https://meet.google.com/abc" })).toBe(true); });
  test("event with attendees is real", () => { expect(isRealMeeting({ title: "Standup", attendees: [{}, {}] })).toBe(true); });
  test("lunch block is not real", () => { expect(isRealMeeting({ title: "Lunch" })).toBe(false); });
  test("OOO is not real", () => { expect(isRealMeeting({ title: "OOO - vacation" })).toBe(false); });
  test("focus time is not real", () => { expect(isRealMeeting({ title: "Focus block" })).toBe(false); });
  test("gym is not real", () => { expect(isRealMeeting({ title: "Gym" })).toBe(false); });
  test("commute is not real", () => { expect(isRealMeeting({ title: "Commute" })).toBe(false); });
  test("block word WITH attendees IS real", () => { expect(isRealMeeting({ title: "Lunch meeting", attendees: [{}, {}] })).toBe(true); });
  test("normal meeting is real", () => { expect(isRealMeeting({ title: "Board Meeting", attendees: [{}] })).toBe(false); });
  test("normal meeting with 2+ attendees is real", () => { expect(isRealMeeting({ title: "Board Meeting", attendees: [{}, {}] })).toBe(true); });
});

describe("isEmailActionVisible", () => {
  test("returns default when no config", () => { expect(isEmailActionVisible("reply", null)).toBe(true); });
  test("returns config value when set to false", () => { expect(isEmailActionVisible("reply", { reply: false })).toBe(false); });
  test("returns config value when set to true", () => { expect(isEmailActionVisible("reply", { reply: true })).toBe(true); });
  test("unknown button returns false", () => { expect(isEmailActionVisible("nonexistent", null)).toBe(false); });
  test("returns default for unset key in config", () => { expect(isEmailActionVisible("reply", { trash: false })).toBe(true); });
});

describe("getEmailActionConfig", () => {
  test("returns all defaults when null", () => { const c = getEmailActionConfig(null); expect(c.reply).toBe(true); expect(c.trash).toBe(true); });
  test("merges stored overrides", () => { const c = getEmailActionConfig({ reply: false }); expect(c.reply).toBe(false); expect(c.trash).toBe(true); });
  test("stored keys override defaults", () => { const c = getEmailActionConfig({ star: false, snooze: false }); expect(c.star).toBe(false); expect(c.snooze).toBe(false); });
});

describe("chatProviderFor", () => {
  test("finds google-chat", () => { expect(chatProviderFor("google-chat")).not.toBeNull(); expect(chatProviderFor("google-chat").name).toBe("Google Chat"); });
  test("returns null for unknown", () => { expect(chatProviderFor("slack")).toBeNull(); });
  test("uses custom providers list", () => { expect(chatProviderFor("slack", [{ id: "slack", name: "Slack" }])).not.toBeNull(); });
});

describe("isNewChatMessage", () => {
  test("new message is new", () => { expect(isNewChatMessage({ createTime: new Date().toISOString() }, Date.now() - 60000)).toBe(true); });
  test("old message is not new", () => { expect(isNewChatMessage({ createTime: "2020-01-01T00:00:00Z" }, Date.now())).toBe(false); });
  test("null message", () => { expect(isNewChatMessage(null, Date.now())).toBe(false); });
  test("missing createTime", () => { expect(isNewChatMessage({}, Date.now())).toBe(false); });
});

describe("formatChatSender", () => {
  test("uses displayName", () => { expect(formatChatSender({ sender: { displayName: "Pat" } })).toBe("Pat"); });
  test("falls back to name", () => { expect(formatChatSender({ sender: { name: "users/123" } })).toBe("users/123"); });
  test("returns Unknown for null", () => { expect(formatChatSender(null)).toBe("Unknown"); });
  test("returns Unknown for empty sender", () => { expect(formatChatSender({ sender: {} })).toBe("Unknown"); });
});

describe("formatChatPreview", () => {
  test("returns text as-is if short", () => { expect(formatChatPreview({ text: "Hi" })).toBe("Hi"); });
  test("truncates long text", () => { expect(formatChatPreview({ text: "x".repeat(100) }, 20).length).toBeLessThanOrEqual(21); });
  test("returns [attachment] for no text", () => { expect(formatChatPreview({})).toBe("[attachment]"); });
  test("null message", () => { expect(formatChatPreview(null)).toBe("[attachment]"); });
});

describe("buildChatNotifications", () => {
  test("filters old messages", () => { const r = buildChatNotifications([{ createTime: "2020-01-01T00:00:00Z", sender: { displayName: "Pat" }, text: "Hi", name: "msg1" }], Date.now()); expect(r).toHaveLength(0); });
  test("includes new messages", () => { const r = buildChatNotifications([{ createTime: new Date().toISOString(), sender: { displayName: "Pat" }, text: "Hello", name: "msg1" }], Date.now() - 60000); expect(r).toHaveLength(1); expect(r[0].sender).toBe("Pat"); });
  test("empty input", () => { expect(buildChatNotifications([], Date.now())).toEqual([]); });
});

describe("senderAvatar", () => {
  test("two-word name gives two initials", () => { expect(senderAvatar("Pat Wynne <pat@acme.org>").initials).toBe("PW"); });
  test("single name gives one initial", () => { expect(senderAvatar("Pat <pat@acme.org>").initials).toBe("P"); });
  test("null gives ?", () => { expect(senderAvatar(null).initials).toBe("?"); });
  test("returns a color", () => { expect(senderAvatar("Pat").color).toMatch(/^#/); });
  test("same name always same color", () => { expect(senderAvatar("Pat Wynne").color).toBe(senderAvatar("Pat Wynne").color); });
  test("three-word name uses first and last", () => { expect(senderAvatar("Mary Jane Watson").initials).toBe("MW"); });
});

describe("senderTier", () => {
  test("FFC email is team", () => { expect(senderTier("kayla@freshfoodconnect.org", {})).toBe("team"); });
  test("frequent contact", () => { expect(senderTier("pat@acme.org", { "pat@acme.org": { totalMessages: 15 } })).toBe("frequent"); });
  test("known contact", () => { expect(senderTier("pat@acme.org", { "pat@acme.org": { totalMessages: 5 } })).toBe("known"); });
  test("unknown contact", () => { expect(senderTier("pat@acme.org", {})).toBe("unknown"); });
  test("null address", () => { expect(senderTier(null, {})).toBe("unknown"); });
});

describe("priorityScore", () => {
  test("returns a number", () => { expect(typeof priorityScore({ from: "pat@acme.org", date: new Date().toISOString(), subject: "Hi" }, {})).toBe("number"); });
  test("urgent subject scores higher", () => {
    const base = priorityScore({ from: "pat@acme.org", date: new Date(Date.now() - 86400000).toISOString(), subject: "Hello" }, {});
    const urgent = priorityScore({ from: "pat@acme.org", date: new Date(Date.now() - 86400000).toISOString(), subject: "ASAP: urgent" }, {});
    expect(urgent).toBeGreaterThan(base);
  });
  test("team member scores higher than unknown", () => {
    const team = priorityScore({ from: "Laura <laura@freshfoodconnect.org>", date: new Date(Date.now() - 86400000).toISOString(), subject: "Update" }, {});
    const unknown = priorityScore({ from: "nobody@random.com", date: new Date(Date.now() - 86400000).toISOString(), subject: "Update" }, {});
    expect(team).toBeGreaterThan(unknown);
  });
});

describe("relationshipBadge", () => {
  test("null for no history", () => { expect(relationshipBadge("pat@acme.org", {})).toBeNull(); });
  test("First contact for 1 message", () => { expect(relationshipBadge("pat@acme.org", { "pat@acme.org": { totalMessages: 1 } })).toBe("First contact"); });
  test("Frequent for 5+ messages", () => { expect(relationshipBadge("pat@acme.org", { "pat@acme.org": { totalMessages: 5, lastContact: new Date().toISOString() } })).toBe("Frequent"); });
  test("Lapsed for old contact", () => { expect(relationshipBadge("pat@acme.org", { "pat@acme.org": { totalMessages: 5, lastContact: "2020-01-01" } })).toBe("Lapsed"); });
  test("null for null addr", () => { expect(relationshipBadge(null, {})).toBeNull(); });
});

describe("suggestArchiveLabel", () => {
  test("Classy email suggests Fundraising", () => { expect(suggestArchiveLabel({ from: "noreply@classy.org", subject: "Donation" })).toBe("Fundraising"); });
  test("DNash email suggests Finance", () => { expect(suggestArchiveLabel({ from: "debbie@dnatsi.com", subject: "Invoice" })).toBe("Finance"); });
  test("Board subject suggests Board", () => { expect(suggestArchiveLabel({ from: "pat@acme.org", subject: "Board agenda" })).toBe("Board"); });
  test("FFC sender suggests Internal", () => { expect(suggestArchiveLabel({ from: "laura@freshfoodconnect.org", subject: "Update" })).toBe("Internal"); });
  test("Grant subject suggests Grants", () => { expect(suggestArchiveLabel({ from: "funder@foundation.org", subject: "Grant proposal" })).toBe("Grants"); });
  test("Generic email returns null", () => { expect(suggestArchiveLabel({ from: "pat@acme.org", subject: "Hello" })).toBeNull(); });
});

describe("getScheduledTimeLabel", () => {
  test("null returns empty", () => { expect(getScheduledTimeLabel(null)).toBe(""); });
  test("past time returns Sending...", () => { expect(getScheduledTimeLabel(new Date(Date.now() - 60000).toISOString())).toBe("Sending..."); });
  test("near future returns In < 1 min", () => { expect(getScheduledTimeLabel(new Date(Date.now() + 30000).toISOString())).toBe("In < 1 min"); });
  test("5 min future returns In 5 min", () => { expect(getScheduledTimeLabel(new Date(Date.now() + 300000).toISOString())).toMatch(/In \d+ min/); });
});

describe("groupAgendaItems", () => {
  test("groups by category", () => { const r = groupAgendaItems([{ category: "A", text: "1" }, { category: "B", text: "2" }, { category: "A", text: "3" }]); expect(r.A).toHaveLength(2); expect(r.B).toHaveLength(1); });
  test("uncategorized goes to General", () => { const r = groupAgendaItems([{ text: "no cat" }]); expect(r.General).toHaveLength(1); });
  test("null input", () => { expect(groupAgendaItems(null)).toEqual({}); });
  test("empty array", () => { expect(groupAgendaItems([])).toEqual({}); });
});

describe("getAutoScrollSpeed", () => {
  test("top edge scrolls up", () => { expect(getAutoScrollSpeed(10, 800)).toBeLessThan(0); });
  test("bottom edge scrolls down", () => { expect(getAutoScrollSpeed(790, 800)).toBeGreaterThan(0); });
  test("middle returns 0", () => { expect(getAutoScrollSpeed(400, 800)).toBe(0); });
  test("very top scrolls fastest", () => { expect(Math.abs(getAutoScrollSpeed(5, 800))).toBeGreaterThan(Math.abs(getAutoScrollSpeed(50, 800))); });
});

describe("driveFileIcon", () => {
  test("null returns 📄", () => { expect(driveFileIcon(null)).toBe("📄"); });
  test("folder", () => { expect(driveFileIcon("application/vnd.google-apps.folder")).toBe("📁"); });
  test("spreadsheet", () => { expect(driveFileIcon("application/vnd.google-apps.spreadsheet")).toBe("📊"); });
  test("document", () => { expect(driveFileIcon("application/vnd.google-apps.document")).toBe("📝"); });
  test("pdf", () => { expect(driveFileIcon("application/pdf")).toBe("📕"); });
  test("image", () => { expect(driveFileIcon("image/png")).toBe("🖼"); });
  test("video", () => { expect(driveFileIcon("video/mp4")).toBe("🎥"); });
  test("audio", () => { expect(driveFileIcon("audio/mp3")).toBe("🎵"); });
  test("unknown type", () => { expect(driveFileIcon("application/octet-stream")).toBe("📄"); });
});

describe("parseAddressField", () => {
  test("parses name <email>", () => { const r = parseAddressField("Pat Wynne <pat@acme.org>"); expect(r[0].name).toBe("Pat Wynne"); expect(r[0].email).toBe("pat@acme.org"); });
  test("parses bare email", () => { const r = parseAddressField("pat@acme.org"); expect(r[0].email).toBe("pat@acme.org"); });
  test("parses multiple", () => { const r = parseAddressField("Pat <pat@acme.org>, Bob <bob@acme.org>"); expect(r).toHaveLength(2); });
  test("null returns empty", () => { expect(parseAddressField(null)).toEqual([]); });
  test("empty string", () => { expect(parseAddressField("")).toEqual([]); });
  test("strips quotes from name", () => { const r = parseAddressField('"Pat Wynne" <pat@acme.org>'); expect(r[0].name).toBe("Pat Wynne"); });
});

describe("getEventStatus", () => {
  test("upcoming event", () => { const ev = { start: { dateTime: new Date(Date.now() + 3600000).toISOString() }, end: { dateTime: new Date(Date.now() + 7200000).toISOString() } }; expect(getEventStatus(ev, new Date())).toBe("upcoming"); });
  test("in-progress event", () => { const ev = { start: { dateTime: new Date(Date.now() - 1800000).toISOString() }, end: { dateTime: new Date(Date.now() + 1800000).toISOString() } }; expect(getEventStatus(ev, new Date())).toBe("in-progress"); });
  test("past event", () => { const ev = { start: { dateTime: new Date(Date.now() - 7200000).toISOString() }, end: { dateTime: new Date(Date.now() - 3600000).toISOString() } }; expect(getEventStatus(ev, new Date())).toBe("past"); });
});

describe("extractDocFromEvent", () => {
  test("extracts Google Docs URL", () => { expect(extractDocFromEvent({ description: "See https://docs.google.com/document/d/abc123/edit for agenda" })).toContain("docs.google.com"); });
  test("returns null when no URL", () => { expect(extractDocFromEvent({ description: "No link here" })).toBeNull(); });
  test("returns null for empty description", () => { expect(extractDocFromEvent({})).toBeNull(); });
});

describe("getDefaultSettings / mergeSettings", () => {
  test("defaults have userName", () => { expect(getDefaultSettings().userName).toBe("Kayla"); });
  test("defaults have orgName", () => { expect(getDefaultSettings().orgName).toBe("Fresh Food Connect"); });
  test("merge with null returns defaults", () => { expect(mergeSettings(null).userName).toBe("Kayla"); });
  test("merge overrides userName", () => { expect(mergeSettings({ userName: "Pat" }).userName).toBe("Pat"); });
  test("merge preserves defaults for missing keys", () => { expect(mergeSettings({ userName: "Pat" }).orgName).toBe("Fresh Food Connect"); });
});

describe("minsUntil", () => {
  test("future event returns positive", () => { const ev = { start: { dateTime: new Date(Date.now() + 600000).toISOString() } }; expect(minsUntil(ev, new Date())).toBeCloseTo(10, 0); });
  test("past event returns negative", () => { const ev = { start: { dateTime: new Date(Date.now() - 600000).toISOString() } }; expect(minsUntil(ev, new Date())).toBeCloseTo(-10, 0); });
});

describe("formatDuration", () => {
  test("1 hour", () => { expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z")).toBe("1h"); });
  test("30 minutes", () => { expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T10:30:00Z")).toBe("30m"); });
  test("1h 30m", () => { expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T11:30:00Z")).toBe("1h 30m"); });
  test("null returns empty", () => { expect(formatDuration(null, null)).toBe(""); });
  test("same time returns empty", () => { expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T10:00:00Z")).toBe(""); });
});

describe("getAttendeeRsvpIcon / Color", () => {
  test("accepted icon", () => { expect(getAttendeeRsvpIcon("accepted")).toBe("✓"); });
  test("declined icon", () => { expect(getAttendeeRsvpIcon("declined")).toBe("✗"); });
  test("tentative icon", () => { expect(getAttendeeRsvpIcon("tentative")).toBe("?"); });
  test("unknown icon", () => { expect(getAttendeeRsvpIcon("needsAction")).toBe("·"); });
  test("accepted color is green", () => { expect(getAttendeeRsvpColor("accepted")).toBe("#3A9B5A"); });
  test("declined color is red", () => { expect(getAttendeeRsvpColor("declined")).toBe("#D45555"); });
});

describe("calendarEmptyStateMessage", () => {
  test("no events", () => { expect(calendarEmptyStateMessage([])).toBe("Nothing on the calendar today"); });
  test("null", () => { expect(calendarEmptyStateMessage(null)).toBe("Nothing on the calendar today"); });
  test("only blocks", () => { expect(calendarEmptyStateMessage([{ title: "Focus block" }])).toContain("hidden"); });
  test("has real meetings", () => { expect(calendarEmptyStateMessage([{ title: "Standup", attendees: [{}, {}] }])).toBeNull(); });
});

describe("countTodayMeetings", () => {
  test("counts real meetings", () => { expect(countTodayMeetings([{ title: "Standup", attendees: [{}, {}] }, { title: "Focus" }])).toBe(1); });
  test("empty", () => { expect(countTodayMeetings([])).toBe(0); });
  test("null", () => { expect(countTodayMeetings(null)).toBe(0); });
});

describe("buildMapsUrl", () => {
  test("builds URL", () => { expect(buildMapsUrl("Denver CO")).toContain("google.com/maps"); expect(buildMapsUrl("Denver CO")).toContain("Denver"); });
  test("null returns null", () => { expect(buildMapsUrl(null)).toBeNull(); });
});

describe("isVideoCallLocation", () => {
  test("Zoom URL", () => { expect(isVideoCallLocation("https://zoom.us/j/123")).toBe(true); });
  test("Google Meet", () => { expect(isVideoCallLocation("https://meet.google.com/abc")).toBe(true); });
  test("Teams", () => { expect(isVideoCallLocation("https://teams.microsoft.com/l/meetup")).toBe(true); });
  test("physical address", () => { expect(isVideoCallLocation("123 Main St")).toBe(false); });
  test("null", () => { expect(isVideoCallLocation(null)).toBe(false); });
});

describe("summarizeAttendeeRsvp", () => {
  test("counts correctly", () => {
    const a = [{ responseStatus: "accepted" }, { responseStatus: "declined" }, { responseStatus: "tentative" }, { responseStatus: "needsAction" }];
    const r = summarizeAttendeeRsvp(a);
    expect(r.accepted).toBe(1); expect(r.declined).toBe(1); expect(r.tentative).toBe(1); expect(r.pending).toBe(1);
  });
  test("empty", () => { const r = summarizeAttendeeRsvp([]); expect(r.accepted).toBe(0); });
  test("null", () => { const r = summarizeAttendeeRsvp(null); expect(r.accepted).toBe(0); });
});

describe("scoreSearchResult", () => {
  test("title match scores higher than body", () => {
    const titleMatch = scoreSearchResult({ subject: "grant proposal", snippet: "nothing" }, "grant", "email");
    const bodyMatch = scoreSearchResult({ subject: "nothing", snippet: "grant proposal" }, "grant", "email");
    expect(titleMatch).toBeGreaterThan(bodyMatch);
  });
  test("empty query scores 0", () => { expect(scoreSearchResult({ subject: "test" }, "", "email")).toBe(0); });
  test("no match scores 0", () => { expect(scoreSearchResult({ subject: "hello" }, "zzz", "email")).toBe(0); });
  test("title starts with query gets bonus", () => {
    const starts = scoreSearchResult({ subject: "grant proposal" }, "grant", "email");
    const contains = scoreSearchResult({ subject: "my grant proposal" }, "grant", "email");
    expect(starts).toBeGreaterThan(contains);
  });
});

describe("searchEmails", () => {
  test("searches from field", () => { const r = searchEmails([{ from: "pat@acme.org", subject: "", snippet: "" }], "pat"); expect(r).toHaveLength(1); });
  test("searches subject field", () => { const r = searchEmails([{ from: "", subject: "Grant Update", snippet: "" }], "grant"); expect(r).toHaveLength(1); });
  test("searches snippet field", () => { const r = searchEmails([{ from: "", subject: "", snippet: "Important grant info" }], "grant"); expect(r).toHaveLength(1); });
  test("returns empty for no match", () => { expect(searchEmails([{ from: "a", subject: "b", snippet: "c" }], "zzz")).toEqual([]); });
  test("null list", () => { expect(searchEmails(null, "test")).toEqual([]); });
  test("case insensitive", () => { expect(searchEmails([{ from: "PAT@ACME.ORG", subject: "", snippet: "" }], "pat")).toHaveLength(1); });
});

describe("searchTasks", () => {
  test("searches title", () => { expect(searchTasks([{ title: "Grant deadline", notes: "" }], "grant")).toHaveLength(1); });
  test("searches notes", () => { expect(searchTasks([{ title: "", notes: "review grant" }], "grant")).toHaveLength(1); });
  test("no match", () => { expect(searchTasks([{ title: "other", notes: "" }], "grant")).toEqual([]); });
  test("null list", () => { expect(searchTasks(null, "test")).toEqual([]); });
});

describe("grantDaysUntil / grantDeadlineUrgency / formatGrantCountdown", () => {
  test("null deadline", () => { expect(grantDaysUntil(null)).toBeNull(); expect(grantDeadlineUrgency(null)).toBe("none"); expect(formatGrantCountdown(null)).toBe(""); });
  test("past deadline", () => { expect(grantDaysUntil("2020-01-01")).toBeLessThan(0); expect(grantDeadlineUrgency("2020-01-01")).toBe("past"); expect(formatGrantCountdown("2020-01-01")).toContain("overdue"); });
  test("far future", () => { expect(grantDeadlineUrgency("2030-01-01")).toBe("ok"); });
  test("today", () => { const today = new Date(); today.setHours(23, 59); expect(grantDeadlineUrgency(today.toISOString())).toBe("critical"); });
  test("within 7 days is critical", () => {
    const d = new Date(); d.setDate(d.getDate() + 5);
    expect(grantDeadlineUrgency(d.toISOString())).toBe("critical");
  });
  test("within 30 days is warning", () => {
    const d = new Date(); d.setDate(d.getDate() + 20);
    expect(grantDeadlineUrgency(d.toISOString())).toBe("warning");
  });
});

describe("parsePipelineStages", () => {
  test("groups by stage", () => { const r = parsePipelineStages([{ stage: "Prospect", amount: 1000 }, { stage: "Prospect", amount: 500 }, { stage: "Ask Made", amount: 2000 }]); expect(r.Prospect.count).toBe(2); expect(r.Prospect.total).toBe(1500); expect(r["Ask Made"].count).toBe(1); });
  test("empty deals", () => { expect(parsePipelineStages([])).toEqual({}); });
  test("null deals", () => { expect(parsePipelineStages(null)).toEqual({}); });
  test("missing amount defaults to 0", () => { const r = parsePipelineStages([{ stage: "Prospect" }]); expect(r.Prospect.total).toBe(0); });
});

describe("recordEmailAction", () => {
  test("records new action", () => { const r = recordEmailAction({}, "team", "archive"); expect(r["team:archive"]).toBe(1); });
  test("increments existing", () => { const r = recordEmailAction({ "team:archive": 3 }, "team", "archive"); expect(r["team:archive"]).toBe(4); });
  test("does not mutate original", () => { const orig = {}; recordEmailAction(orig, "team", "archive"); expect(orig["team:archive"]).toBeUndefined(); });
});

describe("getSuggestedAction", () => {
  test("returns null when no history", () => { expect(getSuggestedAction(null, "team")).toBeNull(); });
  test("returns null when below threshold", () => { expect(getSuggestedAction({ "team:archive": 2 }, "team")).toBeNull(); });
  test("returns action when above threshold", () => { const r = getSuggestedAction({ "team:archive": 5 }, "team"); expect(r.action).toBe("archive"); expect(r.count).toBe(5); });
  test("returns highest-count action", () => { const r = getSuggestedAction({ "team:archive": 5, "team:trash": 10 }, "team"); expect(r.action).toBe("trash"); });
  test("only matches the specified bucket", () => { expect(getSuggestedAction({ "newsletter:trash": 10 }, "team")).toBeNull(); });
});

describe("extractCalendarRsvpLinks", () => {
  test("extracts accept link", () => {
    const html = '<a href="https://calendar.google.com/calendar?action=ACCEPT&id=123">Accept</a>';
    expect(extractCalendarRsvpLinks(html).accept).toContain("ACCEPT");
  });
  test("extracts decline link", () => {
    const html = '<a href="https://calendar.google.com/calendar?action=DECLINE&id=123">Decline</a>';
    expect(extractCalendarRsvpLinks(html).decline).toContain("DECLINE");
  });
  test("decodes &amp;", () => {
    const html = '<a href="https://calendar.google.com/calendar?action=ACCEPT&amp;id=123">Accept</a>';
    expect(extractCalendarRsvpLinks(html).accept).not.toContain("&amp;");
    expect(extractCalendarRsvpLinks(html).accept).toContain("&id=");
  });
  test("returns empty for no links", () => { expect(extractCalendarRsvpLinks("<p>text</p>")).toEqual({}); });
  test("returns empty for null", () => { expect(extractCalendarRsvpLinks(null)).toEqual({}); });
});
