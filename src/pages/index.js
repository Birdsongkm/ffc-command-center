import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";

// ═══════════════════════════════════════════════
//  THEME — White/light base with nature leaf accents, color-coded sections
// ═══════════════════════════════════════════════
const T = {
  bg: "#F7FAF5", surface: "#FFFFFF", card: "#FFFFFF", cardHover: "#F0F5EE",
  border: "#D8E4D2", borderLight: "#E8F0E4", text: "#2C3E2C", textMuted: "#6B8068",
  textDim: "#94AC8E", accent: "#4A9B4A", accentDark: "#357A35", accentBg: "#E8F5E8",
  gold: "#C4942A", goldBg: "#FFF8E8", danger: "#D45555", dangerBg: "#FFF0F0",
  info: "#4A8BB5", infoBg: "#EDF5FB", white: "#FFFFFF",
  // Section colors
  emailBlue: "#3B82C4", emailBlueBg: "#EBF3FB", emailBlueBorder: "#B8D4F0",
  calGreen: "#3A9B5A", calGreenBg: "#E6F5EC", calGreenBorder: "#A8DDB8",
  taskAmber: "#C4942A", taskAmberBg: "#FFF8E8", taskAmberBorder: "#E8D5A0",
  driveViolet: "#7C5AC4", driveVioletBg: "#F0EBF9", driveVioletBorder: "#C4B0E8",
  urgentCoral: "#D45555", urgentCoralBg: "#FFF0F0", urgentCoralBorder: "#F0B8B8",
  leafDecor: "#4A9B4A",
};

// ═══════════════════════════════════════════════
//  CATEGORIES (for tasks)
// ═══════════════════════════════════════════════
const CATEGORIES = [
  { id: "fundraising", label: "Fundraising", color: "#7C5AC4", bg: "#F0EBF9" },
  { id: "finance", label: "Finance", color: "#C4942A", bg: "#FFF8E8" },
  { id: "board", label: "Board", color: "#3B82C4", bg: "#EBF3FB" },
  { id: "programs", label: "Programs", color: "#3A9B5A", bg: "#E6F5EC" },
  { id: "admin", label: "Admin", color: "#6B8068", bg: "#F0F5EE" },
  { id: "external", label: "External", color: "#C47A3A", bg: "#FFF4E8" },
  { id: "marketing", label: "Marketing", color: "#C44A8B", bg: "#FBE8F3" },
];

const TEAM = [
  { name: "Laura Lavid", initials: "LL" },
  { name: "Gretchen Roberts", initials: "GR" },
  { name: "Carmen Alcantara", initials: "CA" },
  { name: "Adjoa Kittoe", initials: "AK" },
  { name: "Debbie Nash", initials: "DN" },
  { name: "Lone Bryan", initials: "LB" },
];

const URGENCY = [
  { id: "critical", label: "Critical", color: "#D45555", bg: "#FFF0F0", dot: "#FF4444" },
  { id: "high", label: "High", color: "#C4942A", bg: "#FFF8E8", dot: "#FFAA33" },
  { id: "medium", label: "Medium", color: "#3B82C4", bg: "#EBF3FB", dot: "#55AAFF" },
  { id: "low", label: "Low", color: "#6B8068", bg: "#F0F5EE", dot: "#6B8068" },
];

// ═══════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════
const SHORTCUTS = {
  j: "Next email", k: "Previous email", r: "Reply", e: "Archive",
  t: "Make task", f: "Forward", u: "Mark unread", s: "Star/unstar",
};

// ═══════════════════════════════════════════════
//  EMAIL CLASSIFICATION
// ═══════════════════════════════════════════════
function classifyEmail(e) {
  const from = (e.from || "").toLowerCase();
  const subj = (e.subject || "").toLowerCase();
  const to = (e.to || "").toLowerCase();
  const cc = (e.cc || "").toLowerCase();
  const listUnsub = e.listUnsubscribe || "";
  const listId = (e.listId || "").toLowerCase();
  const precedence = (e.precedence || "").toLowerCase();
  const recipientCount = e.recipientCount || 1;
  const deliveredTo = (e.deliveredTo || "").toLowerCase();

  // Detect BCC (delivered to user but user not in To or Cc)
  const isBcc = deliveredTo && !to.includes(deliveredTo) && !cc.includes(deliveredTo);
  // Mass send detection
  const isMassSend = recipientCount >= 5 || isBcc;

  // FYI / Mass sends bucket
  if (isMassSend && !from.includes("classy") && !from.includes("hubspot")) {
    return "fyi-mass";
  }

  // Newsletter / mailing list detection
  if (listUnsub || listId || precedence === "list" || precedence === "bulk") {
    if (from.includes("classy") || from.includes("fundrais")) return "classy-recurring";
    return "newsletter";
  }

  // Google Calendar notifications
  if (from.includes("calendar-notification") || from.includes("calendar.google.com")) return "calendar-notif";

  // Google Docs / Drive activity
  if (from.includes("drive-shares-dm") || from.includes("comments-noreply") ||
      from.includes("docs.google.com") || from.includes("drive.google.com")) return "docs-activity";

  // Automated / system emails
  if (from.includes("noreply") || from.includes("no-reply") || from.includes("notifications@") ||
      from.includes("mailer-daemon") || from.includes("postmaster")) return "automated";

  // Classy donation alerts (one-time)
  if ((from.includes("classy") || subj.includes("classy")) &&
      (subj.includes("donation") || subj.includes("gift") || subj.includes("contribut"))) return "classy-onetime";

  // Classy recurring platform emails
  if (from.includes("classy")) return "classy-recurring";

  // Team / internal — check for known team domains
  if (from.includes("freshfoodconnect") || from.includes("ffc")) return "team";

  // Needs response — external, personal, 1:1 or small group
  if (recipientCount <= 3 && !isBcc) return "needs-response";

  // Default: needs-response
  return "needs-response";
}

// Email age helper — hours since email was received
function emailAge(dateStr) {
  if (!dateStr) return 0;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

function ageColor(hours) {
  if (hours >= 72) return T.danger;
  if (hours >= 48) return "#E88A33";
  if (hours >= 24) return T.gold;
  return "transparent";
}

function ageDot(hours) {
  if (hours < 24) return null;
  const c = ageColor(hours);
  const label = hours >= 72 ? "72h+" : hours >= 48 ? "48h+" : "24h+";
  return { color: c, label };
}

// Check if calendar event is a real meeting (not time-block / hold / lunch)
function isRealMeeting(ev) {
  const t = (ev.title || "").toLowerCase();
  const solo = !ev.attendees || ev.attendees.length <= 1;
  const blockWords = ["hold", "lunch", "ooo", "out of office", "block", "focus", "personal", "gym", "break", "commute", "travel"];
  if (blockWords.some(w => t.includes(w)) && solo) return false;
  if (solo && !ev.hangoutLink) return false;
  return true;
}

// Quick reply templates based on email category and content
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
  // Default
  return [
    { label: "Yes, sounds good", text: "Yes, that sounds good! Thanks for reaching out." },
    { label: "Let me get back to you", text: "Thanks for this — let me look into it and get back to you by end of week." },
    { label: "Loop in team", text: "Thanks! I'm going to loop in my team to make sure we follow up properly." },
  ];
}

// Snooze options
const SNOOZE_OPTIONS = [
  { label: "Tomorrow morning", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString(); } },
  { label: "Later this week", getValue: () => { const d = new Date(); const daysUntilThu = (4 - d.getDay() + 7) % 7 || 4; d.setDate(d.getDate() + daysUntilThu); d.setHours(8, 0, 0, 0); return d.toISOString(); } },
  { label: "Next week", getValue: () => { const d = new Date(); const daysUntilMon = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + daysUntilMon); d.setHours(8, 0, 0, 0); return d.toISOString(); } },
  { label: "Custom...", getValue: () => null },
];

// Bucket display info
const BUCKETS = {
  "needs-response": { label: "Needs Your Reply", icon: "✉️", color: T.urgentCoral, bg: T.urgentCoralBg, border: T.urgentCoralBorder, priority: 1 },
  "fyi-mass": { label: "FYI / Mass Sends", icon: "📋", color: T.info, bg: T.infoBg, border: T.emailBlueBorder, priority: 2 },
  "classy-onetime": { label: "Donation Alerts", icon: "💚", color: T.calGreen, bg: T.calGreenBg, border: T.calGreenBorder, priority: 3 },
  "team": { label: "Team / Internal", icon: "👥", color: T.emailBlue, bg: T.emailBlueBg, border: T.emailBlueBorder, priority: 4 },
  "classy-recurring": { label: "Classy Platform", icon: "🔄", color: T.driveViolet, bg: T.driveVioletBg, border: T.driveVioletBorder, priority: 5 },
  "calendar-notif": { label: "Calendar Notifications", icon: "📅", color: T.calGreen, bg: T.calGreenBg, border: T.calGreenBorder, priority: 6 },
  "docs-activity": { label: "Docs & Drive Activity", icon: "📄", color: T.driveViolet, bg: T.driveVioletBg, border: T.driveVioletBorder, priority: 7 },
  "automated": { label: "Automated / System", icon: "⚙️", color: T.textMuted, bg: "#F5F5F5", border: T.border, priority: 8 },
  "newsletter": { label: "Newsletters & Lists", icon: "📰", color: T.textMuted, bg: "#F5F5F5", border: T.border, priority: 9 },
};

// ═══════════════════════════════════════════════
//  TOAST NOTIFICATION COMPONENT
// ═══════════════════════════════════════════════
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: T.text, color: "#fff", padding: "12px 28px", borderRadius: 10,
      fontSize: 15, fontWeight: 500, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      animation: "slideUp 0.3s ease" }}>
      {message}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  LEAF DECORATION SVG
// ═══════════════════════════════════════════════
function LeafIcon({ size = 18, color = T.leafDecor, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c6 0 10-7 10-7" />
      <path d="M2 2s7.4 2.08 12.85 6.14" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
//  COMPOSE / REPLY / FORWARD FORM
// ═══════════════════════════════════════════════
function ComposeForm({ mode = "compose", email = null, onSend, onCancel, signature = "", suggestedForwardTo = "" }) {
  const [to, setTo] = useState(mode === "reply" && email ? (email.replyTo || email.from || "") : (mode === "forward" ? suggestedForwardTo : ""));
  const [cc, setCc] = useState(mode === "reply" && email ? (email.cc || "") : "");
  const [subject, setSubject] = useState(
    mode === "reply" ? `Re: ${(email?.subject || "").replace(/^Re:\s*/i, "")}` :
    mode === "forward" ? `Fwd: ${email?.subject || ""}` : ""
  );
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim()) return;
    setSending(true);
    try {
      const payload = { to, cc, subject, body: body + (signature ? `\n--\n${signature.replace(/<[^>]*>/g, "")}` : ""), };
      if (mode === "reply" && email) {
        payload.threadId = email.threadId;
        payload.inReplyTo = email.messageId;
        payload.references = email.messageId;
      }
      if (mode === "forward" && email) {
        payload.forward = true;
        payload.originalBody = email.snippet || "";
      }
      await onSend(payload);
    } finally { setSending(false); }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8,
    fontSize: 15, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: T.text }}>
          {mode === "reply" ? "Reply" : mode === "forward" ? "Forward" : "New Email"}
        </span>
        <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.textMuted }}>×</button>
      </div>
      <input placeholder="To" value={to} onChange={e => setTo(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <input placeholder="Cc" value={cc} onChange={e => setCc(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <textarea placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)}
        rows={6} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
      {signature && (
        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6, padding: "6px 10px", background: T.bg, borderRadius: 6, borderLeft: `3px solid ${T.accent}` }}>
          Your signature will be appended
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={handleSend} disabled={sending || !to.trim()}
          style={{ padding: "10px 24px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: sending ? 0.6 : 1 }}>
          {sending ? "Sending..." : "Send"}
        </button>
        <button onClick={onCancel} style={{ padding: "10px 20px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  EVENT FORM (Create / Edit)
// ═══════════════════════════════════════════════
function EventForm({ event = null, onSave, onCancel, prefillFromEmail = null }) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState(event?.title || (prefillFromEmail?.subject || ""));
  const [start, setStart] = useState(event?.start ? event.start.slice(0, 16) : defaultStart.toISOString().slice(0, 16));
  const [end, setEnd] = useState(event?.end ? event.end.slice(0, 16) : defaultEnd.toISOString().slice(0, 16));
  const [attendees, setAttendees] = useState(event?.attendees?.map(a => a.email).join(", ") || (prefillFromEmail?.from?.match(/<(.+)>/)?.[1] || prefillFromEmail?.from || ""));
  const [location, setLocation] = useState(event?.location || "");
  const [desc, setDesc] = useState(event?.description || "");
  const [saving, setSaving] = useState(false);

  const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box" };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title, start, end, location, description: desc,
        attendees: attendees.split(",").map(e => e.trim()).filter(Boolean),
        ...(event?.id && { eventId: event.id }),
      });
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: T.calGreen }}>{event ? "Edit Event" : "New Event"}</span>
        <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.textMuted }}>×</button>
      </div>
      <input placeholder="Event title" value={title} onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
      </div>
      <input placeholder="Attendees (comma-separated emails)" value={attendees} onChange={e => setAttendees(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: "10px 24px", background: T.calGreen, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
          {saving ? "Saving..." : "Save Event"}
        </button>
        <button onClick={onCancel} style={{ padding: "10px 20px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15 }}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  TASK FORM
// ═══════════════════════════════════════════════
function TaskForm({ task = null, onSave, onCancel, prefillFromEmail = null }) {
  const [title, setTitle] = useState(task?.title || (prefillFromEmail?.subject || ""));
  const [category, setCategory] = useState(task?.category || "admin");
  const [urgency, setUrgency] = useState(task?.urgency || "medium");
  const [due, setDue] = useState(task?.due || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const [saving, setSaving] = useState(false);

  const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box" };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: task?.id || Date.now().toString(),
      title, category, urgency, due, notes,
      done: task?.done || false,
      order: task?.order ?? 999,
      createdAt: task?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.taskAmberBorder}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: T.taskAmber }}>{task ? "Edit Task" : "New Task"}</span>
        <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.textMuted }}>×</button>
      </div>
      <input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={urgency} onChange={e => setUrgency(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          {URGENCY.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      </div>
      <input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={handleSave} style={{ padding: "10px 24px", background: T.taskAmber, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
          {task ? "Update" : "Add Task"}
        </button>
        <button onClick={onCancel} style={{ padding: "10px 20px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15 }}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SNOOZE PICKER
// ═══════════════════════════════════════════════
function SnoozePicker({ onSnooze, onCancel }) {
  const [custom, setCustom] = useState(false);
  const [customDate, setCustomDate] = useState("");

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 200 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: T.text }}>Snooze until...</div>
      {!custom ? (
        <>
          {SNOOZE_OPTIONS.map(opt => (
            <button key={opt.label} onClick={() => {
              if (opt.label === "Custom...") { setCustom(true); return; }
              onSnooze(opt.getValue());
            }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "none",
              border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, color: T.text, marginBottom: 2 }}
              onMouseEnter={e => e.target.style.background = T.bg} onMouseLeave={e => e.target.style.background = "none"}>
              {opt.label}
            </button>
          ))}
        </>
      ) : (
        <div>
          <input type="datetime-local" value={customDate} onChange={e => setCustomDate(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 14, marginBottom: 8, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { if (customDate) onSnooze(new Date(customDate).toISOString()); }}
              style={{ flex: 1, padding: "8px", background: T.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Set</button>
            <button onClick={() => setCustom(false)}
              style={{ flex: 1, padding: "8px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  MAIN APP COMPONENT
// ═══════════════════════════════════════════════
export default function Home() {
  // ── State ──
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState("today");
  const [emails, setEmails] = useState([]);
  const [events, setEvents] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Email states
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [emailBody, setEmailBody] = useState({});
  const [composing, setComposing] = useState(null); // null | "compose" | { mode, email }
  const [showSnooze, setShowSnooze] = useState(null); // email id
  const [contactHistory, setContactHistory] = useState({});
  const [signature, setSignature] = useState("");
  const [forwardSuggestions, setForwardSuggestions] = useState({});

  // Calendar states
  const [calView, setCalView] = useState("today"); // today | week
  const [weekEvents, setWeekEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(null);
  const [preppedEvents, setPreppedEvents] = useState(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("ffc_prepped") || "{}"); } catch { return {}; }
    }
    return {};
  });

  // Task states
  const [tasks, setTasks] = useState(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("ffc_tasks") || "[]"); } catch { return []; }
    }
    return [];
  });
  const [showTaskForm, setShowTaskForm] = useState(null);
  const [dragTask, setDragTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);

  // Drive states
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveSearch, setDriveSearch] = useState("");
  const [driveView, setDriveView] = useState("recent");

  // Drafts states
  const [drafts, setDrafts] = useState([]);

  // Week prep
  const [showWeekPrep, setShowWeekPrep] = useState(false);
  const [weekPrepEvents, setWeekPrepEvents] = useState([]);

  // Selected email index for keyboard nav
  const [selectedEmailIdx, setSelectedEmailIdx] = useState(-1);

  // ── Persist tasks & prepped ──
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ffc_tasks", JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ffc_prepped", JSON.stringify(preppedEvents));
  }, [preppedEvents]);

  // ── Persist forward suggestions ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      try { const stored = JSON.parse(localStorage.getItem("ffc_fwd_suggest") || "{}"); setForwardSuggestions(stored); } catch {}
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(forwardSuggestions).length > 0)
      localStorage.setItem("ffc_fwd_suggest", JSON.stringify(forwardSuggestions));
  }, [forwardSuggestions]);

  // ── Show toast helper ──
  const showToast = useCallback((msg) => setToast(msg), []);

  // ── Fetch data ──
  const fetchData = useCallback(async (pageToken) => {
    try {
      const url = pageToken ? `/api/data?page=${pageToken}` : "/api/data";
      const r = await fetch(url);
      const d = await r.json();
      if (!d.authenticated) { setAuth(false); setLoading(false); return; }
      setAuth(true);
      if (pageToken) {
        setEmails(prev => [...prev, ...d.emails.filter(e => e.unread)]);
      } else {
        setEmails(d.emails.filter(e => e.unread));
        setEvents(d.events || []);
      }
      setNextPage(d.nextPage);
      setLoading(false);
    } catch (e) { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch signature on load
  useEffect(() => {
    if (auth) {
      fetch("/api/signature").then(r => r.json()).then(d => { if (d.signature) setSignature(d.signature); }).catch(() => {});
    }
  }, [auth]);

  // ── Email actions ──
  const emailAction = async (action, messageId, extra = {}) => {
    const r = await fetch("/api/email-actions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, messageId, ...extra }),
    });
    const d = await r.json();
    if (d.success) {
      if (["markRead", "archive", "trash"].includes(action)) {
        setEmails(prev => prev.filter(e => e.id !== messageId));
      }
      const labels = { archive: "Archived", markRead: "Marked as read", trash: "Deleted", star: "Starred", unstar: "Unstarred", snooze: "Snoozed" };
      showToast(labels[action] || "Done");
    }
    return d;
  };

  const batchAction = async (action, ids) => {
    const r = await fetch("/api/email-actions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, messageIds: ids }),
    });
    const d = await r.json();
    if (d.success) {
      if (["markRead", "archive", "trash"].includes(action)) {
        setEmails(prev => prev.filter(e => !ids.includes(e.id)));
      }
      showToast(`${action === "trash" ? "Deleted" : action === "markRead" ? "Marked read" : "Archived"} ${ids.length} emails`);
    }
    return d;
  };

  // Send email
  const sendEmail = async (payload) => {
    const r = await fetch("/api/send-email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (d.success) {
      showToast("Email sent!");
      setComposing(null);
    } else {
      showToast("Failed to send: " + (d.error || "Unknown error"));
    }
    return d;
  };

  // Fetch full email body
  const fetchEmailBody = async (id) => {
    if (emailBody[id]) return;
    const r = await fetch(`/api/email-body?id=${id}`);
    const d = await r.json();
    setEmailBody(prev => ({ ...prev, [id]: d }));
  };

  // Fetch contact history
  const fetchContactHistory = async (email) => {
    const addr = email.match(/<(.+)>/)?.[1] || email;
    if (contactHistory[addr]) return;
    const r = await fetch(`/api/contact-history?email=${encodeURIComponent(addr)}`);
    const d = await r.json();
    setContactHistory(prev => ({ ...prev, [addr]: d }));
  };

  // ── Calendar actions ──
  const calendarAction = async (action, data) => {
    const r = await fetch("/api/calendar-actions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data }),
    });
    const d = await r.json();
    if (d.success) {
      showToast(action === "create" ? "Event created!" : action === "delete" ? "Event deleted" : "Event updated");
      fetchData();
    }
    return d;
  };

  // Fetch week events for calendar view
  const fetchWeekEvents = async () => {
    const now = new Date();
    const sun = new Date(now); sun.setDate(now.getDate() - now.getDay()); sun.setHours(0, 0, 0, 0);
    const sat = new Date(sun); sat.setDate(sun.getDate() + 7);
    const r = await fetch("/api/calendar-actions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "range", startDate: sun.toISOString(), endDate: sat.toISOString() }),
    });
    const d = await r.json();
    if (d.success) setWeekEvents(d.events || []);
  };

  // Fetch next week for prep
  const fetchWeekPrep = async (prepNext = false) => {
    const now = new Date();
    let start, end;
    if (prepNext) {
      // Next Mon–Sun
      const daysToMon = (8 - now.getDay()) % 7 || 7;
      start = new Date(now); start.setDate(now.getDate() + daysToMon); start.setHours(0, 0, 0, 0);
      end = new Date(start); end.setDate(start.getDate() + 7);
    } else {
      // This week remaining (today through Sunday)
      start = new Date(now); start.setHours(0, 0, 0, 0);
      const sun = new Date(now); sun.setDate(now.getDate() + (7 - now.getDay())); sun.setHours(23, 59, 59);
      end = sun;
    }
    const r = await fetch("/api/calendar-actions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "range", startDate: start.toISOString(), endDate: end.toISOString() }),
    });
    const d = await r.json();
    if (d.success) { setWeekPrepEvents(d.events || []); setShowWeekPrep(true); }
  };

  // ── Drive ──
  const fetchDrive = async (action = "recent", q = "") => {
    const params = new URLSearchParams({ action });
    if (q) params.set("q", q);
    const r = await fetch(`/api/drive?${params}`);
    const d = await r.json();
    if (d.files) setDriveFiles(d.files);
  };

  useEffect(() => {
    if (auth && tab === "drive") fetchDrive(driveView);
  }, [auth, tab, driveView]);

  // ── Drafts ──
  const fetchDrafts = async () => {
    const r = await fetch("/api/drafts");
    const d = await r.json();
    if (d.drafts) setDrafts(d.drafts);
  };

  useEffect(() => {
    if (auth && tab === "drafts") fetchDrafts();
  }, [auth, tab]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      const bucketEmails = Object.entries(emailsByBucket).flatMap(([, arr]) => arr);
      if (e.key === "j") { setSelectedEmailIdx(prev => Math.min(prev + 1, bucketEmails.length - 1)); e.preventDefault(); }
      if (e.key === "k") { setSelectedEmailIdx(prev => Math.max(prev - 1, 0)); e.preventDefault(); }
      if (e.key === "e" && selectedEmailIdx >= 0 && bucketEmails[selectedEmailIdx]) {
        emailAction("archive", bucketEmails[selectedEmailIdx].id); e.preventDefault();
      }
      if (e.key === "r" && selectedEmailIdx >= 0 && bucketEmails[selectedEmailIdx]) {
        setComposing({ mode: "reply", email: bucketEmails[selectedEmailIdx] }); e.preventDefault();
      }
      if (e.key === "f" && selectedEmailIdx >= 0 && bucketEmails[selectedEmailIdx]) {
        setComposing({ mode: "forward", email: bucketEmails[selectedEmailIdx] }); e.preventDefault();
      }
      if (e.key === "t" && selectedEmailIdx >= 0 && bucketEmails[selectedEmailIdx]) {
        setShowTaskForm({ prefillFromEmail: bucketEmails[selectedEmailIdx] }); e.preventDefault();
      }
      if (e.key === "u" && selectedEmailIdx >= 0 && bucketEmails[selectedEmailIdx]) {
        emailAction("markUnread", bucketEmails[selectedEmailIdx].id); e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ── Classify emails into buckets ──
  const emailsByBucket = {};
  emails.forEach(e => {
    const bucket = classifyEmail(e);
    if (!emailsByBucket[bucket]) emailsByBucket[bucket] = [];
    emailsByBucket[bucket].push(e);
  });

  // Sort buckets by priority
  const sortedBuckets = Object.entries(emailsByBucket)
    .sort((a, b) => (BUCKETS[a[0]]?.priority || 99) - (BUCKETS[b[0]]?.priority || 99));

  // Needs-response emails for Today tab
  const needsReply = emailsByBucket["needs-response"] || [];
  const donationAlerts = emailsByBucket["classy-onetime"] || [];

  // Today's real meetings
  const todayMeetings = events.filter(isRealMeeting);

  // Overdue tasks
  const overdueTasks = tasks.filter(t => !t.done && t.due && new Date(t.due) < new Date());

  // Is it Friday, Sunday, or Monday?
  const dayOfWeek = new Date().getDay();
  const showPrepButton = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 5;

  // ── Render helpers ──
  const formatTime = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const formatDate = (dt) => {
    if (!dt) return "";
    return new Date(dt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatRelativeDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const draftAge = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  // ── Task drag handlers ──
  const handleTaskDragStart = (task) => setDragTask(task);

  const handleTaskDragOver = (e, overTask, overCat) => {
    e.preventDefault();
    setDragOverTask(overTask?.id || null);
    setDragOverCategory(overCat || null);
  };

  const handleTaskDrop = (e, targetTask, targetCategory) => {
    e.preventDefault();
    if (!dragTask) return;
    setTasks(prev => {
      let updated = [...prev];
      const dragIdx = updated.findIndex(t => t.id === dragTask.id);
      if (dragIdx === -1) return prev;

      // Moving between categories
      if (targetCategory && dragTask.category !== targetCategory) {
        updated[dragIdx] = { ...updated[dragIdx], category: targetCategory };
      }

      // Reorder within same category
      if (targetTask && targetTask.id !== dragTask.id) {
        const moving = updated.splice(dragIdx, 1)[0];
        const targetIdx = updated.findIndex(t => t.id === targetTask.id);
        updated.splice(targetIdx, 0, moving);
      }

      // Renumber order
      return updated.map((t, i) => ({ ...t, order: i }));
    });
    setDragTask(null);
    setDragOverTask(null);
    setDragOverCategory(null);
  };

  // ═══════════════════════════════════════════════
  //  RENDER: Loading / Login
  // ═══════════════════════════════════════════════
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ textAlign: "center" }}>
        <LeafIcon size={40} style={{ marginBottom: 12, opacity: 0.6 }} />
        <div style={{ color: T.textMuted, fontSize: 17 }}>Loading your command center...</div>
      </div>
    </div>
  );

  if (auth === false) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <LeafIcon size={48} style={{ marginBottom: 16 }} />
        <h1 style={{ fontSize: 26, color: T.text, marginBottom: 8, fontWeight: 700 }}>Fresh Food Connect</h1>
        <p style={{ color: T.textMuted, marginBottom: 28, fontSize: 16 }}>CEO Command Center</p>
        <a href="/api/auth/login" style={{ display: "inline-block", padding: "14px 36px", background: T.accent,
          color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: 16 }}>
          Sign in with Google
        </a>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  //  EMAIL ROW COMPONENT (inline)
  // ═══════════════════════════════════════════════
  const renderEmailRow = (email, idx, showActions = true) => {
    const isExpanded = expandedEmail === email.id;
    const age = emailAge(email.date);
    const dot = ageDot(age);
    const bucket = classifyEmail(email);
    const isDonation = bucket === "classy-onetime";
    const fromAddr = email.from?.match(/<(.+)>/)?.[1] || email.from || "";
    const fromName = email.from?.replace(/<.*>/, "").trim() || email.from || "";
    const contactInfo = contactHistory[fromAddr];

    return (
      <div key={email.id}
        style={{
          background: isExpanded ? T.cardHover : T.card,
          border: `1px solid ${isDonation ? T.calGreenBorder : isExpanded ? T.accent : T.border}`,
          borderRadius: 10, marginBottom: 8, overflow: "hidden",
          borderLeft: isDonation ? `4px solid ${T.calGreen}` : dot ? `4px solid ${dot.color}` : undefined,
          transition: "all 0.15s",
        }}>
        {/* Header row */}
        <div onClick={() => {
          if (isExpanded) { setExpandedEmail(null); } else {
            setExpandedEmail(email.id);
            fetchEmailBody(email.id);
            fetchContactHistory(email.from);
          }
        }} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Age dot */}
          {dot && <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot.color, flexShrink: 0 }} title={dot.label} />}
          {isDonation && <span style={{ fontSize: 18, flexShrink: 0 }}>💚</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fromName}</span>
              <span style={{ fontSize: 13, color: T.textDim, flexShrink: 0 }}>{formatRelativeDate(email.date)}</span>
            </div>
            <div style={{ fontSize: 15, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{email.subject}</div>
            {!isExpanded && <div style={{ fontSize: 14, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>{email.snippet}</div>}
          </div>
          {contactInfo && (
            <div style={{ fontSize: 12, color: T.textDim, textAlign: "right", flexShrink: 0, lineHeight: 1.4 }}>
              <div>{contactInfo.totalMessages} emails</div>
              <div>Last: {formatRelativeDate(contactInfo.lastContact)}</div>
            </div>
          )}
        </div>

        {/* Expanded body */}
        {isExpanded && (
          <div style={{ padding: "0 18px 16px", borderTop: `1px solid ${T.borderLight}` }}>
            {/* Contact context bar */}
            {contactInfo && (
              <div style={{ padding: "8px 0", fontSize: 13, color: T.textMuted, display: "flex", gap: 16, borderBottom: `1px solid ${T.borderLight}`, marginBottom: 10 }}>
                <span>📧 {contactInfo.totalMessages} total messages</span>
                <span>Last contact: {formatRelativeDate(contactInfo.lastContact)}</span>
              </div>
            )}

            {/* Email body */}
            <div style={{ padding: "14px 0", fontSize: 15, lineHeight: 1.6, color: T.text, whiteSpace: "pre-wrap", maxHeight: 400, overflowY: "auto" }}>
              {emailBody[email.id]?.body || emailBody[email.id]?.bodyHtml?.replace(/<[^>]*>/g, "") || email.snippet || "Loading..."}
            </div>

            {/* Quick replies */}
            {showActions && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, marginBottom: 8 }}>Quick Reply:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {getQuickReplies(email).map((qr, i) => (
                    <button key={i} onClick={() => setComposing({ mode: "reply", email, prefillBody: qr.text })}
                      style={{ padding: "8px 14px", background: T.accentBg, color: T.accent, border: `1px solid ${T.accent}30`,
                        borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={qr.text}>
                      {qr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {showActions && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.borderLight}` }}>
                <button onClick={() => setComposing({ mode: "reply", email })} style={actionBtnStyle(T.emailBlue, T.emailBlueBg)}>↩ Reply</button>
                <button onClick={() => setComposing({ mode: "forward", email })} style={actionBtnStyle(T.driveViolet, T.driveVioletBg)}>↗ Forward</button>
                <button onClick={() => emailAction("markRead", email.id)} style={actionBtnStyle(T.textMuted, T.bg)}>✓ Mark Read</button>
                <button onClick={() => emailAction("archive", email.id)} style={actionBtnStyle(T.textMuted, T.bg)}>📦 Archive</button>
                <button onClick={() => emailAction("trash", email.id)} style={actionBtnStyle(T.danger, T.dangerBg)}>🗑 Delete</button>
                <button onClick={() => emailAction("star", email.id)} style={actionBtnStyle(T.gold, T.goldBg)}>⭐ Star</button>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowSnooze(showSnooze === email.id ? null : email.id)} style={actionBtnStyle(T.info, T.infoBg)}>⏰ Snooze</button>
                  {showSnooze === email.id && (
                    <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100, marginTop: 4 }}>
                      <SnoozePicker onSnooze={(until) => { emailAction("snooze", email.id, { snoozeUntil: until }); setShowSnooze(null); }} onCancel={() => setShowSnooze(null)} />
                    </div>
                  )}
                </div>
                <button onClick={() => setShowTaskForm({ prefillFromEmail: email })} style={actionBtnStyle(T.taskAmber, T.taskAmberBg)}>📋 Make Task</button>
                <button onClick={() => setShowEventForm({ prefillFromEmail: email })} style={actionBtnStyle(T.calGreen, T.calGreenBg)}>📅 Make Event</button>
                {email.listUnsubscribe && (
                  <button onClick={() => { window.open(email.listUnsubscribe.replace(/[<>]/g, ""), "_blank"); showToast("Opening unsubscribe link..."); }}
                    style={actionBtnStyle(T.danger, T.dangerBg)}>🚫 Unsubscribe</button>
                )}
              </div>
            )}

            {/* Compose form if replying/forwarding this email */}
            {composing && composing.email?.id === email.id && (
              <div style={{ marginTop: 14 }}>
                <ComposeForm mode={composing.mode} email={email} onSend={sendEmail} onCancel={() => setComposing(null)} signature={signature} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Button style helper
  const actionBtnStyle = (color, bg) => ({
    padding: "7px 14px", background: bg, color, border: `1px solid ${color}30`,
    borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap",
  });

  // ═══════════════════════════════════════════════
  //  TAB DEFINITIONS
  // ═══════════════════════════════════════════════
  const TABS = [
    { id: "today", label: "Today", color: T.accent, icon: "🏠" },
    { id: "emails", label: "Emails", color: T.emailBlue, icon: "✉️" },
    { id: "calendar", label: "Calendar", color: T.calGreen, icon: "📅" },
    { id: "tasks", label: "Tasks", color: T.taskAmber, icon: "📋" },
    { id: "drive", label: "Drive", color: T.driveViolet, icon: "📁" },
    { id: "drafts", label: "Drafts", color: T.info, icon: "✏️" },
  ];

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════
  return (
    <>
      <Head>
        <title>FFC Command Center</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${T.bg}; color: ${T.text}; }
        @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        button:hover { filter: brightness(0.95); }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px" }}>
        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LeafIcon size={30} />
            <span style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Fresh Food Connect</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setComposing("compose")} style={{ padding: "9px 20px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
              + Compose
            </button>
            <div style={{ fontSize: 13, color: T.textMuted, padding: "6px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8 }}>
              ⌨️ j/k r e f t
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `2px solid ${T.border}`, paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "12px 22px", background: tab === t.id ? t.color + "12" : "transparent",
                color: tab === t.id ? t.color : T.textMuted, border: "none",
                borderBottom: tab === t.id ? `3px solid ${t.color}` : "3px solid transparent",
                borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 15, fontWeight: tab === t.id ? 700 : 500,
                display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s",
              }}>
              <span>{t.icon}</span> {t.label}
              {t.id === "emails" && emails.length > 0 && (
                <span style={{ background: T.emailBlue, color: "#fff", borderRadius: 10, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{emails.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Global compose form */}
        {composing === "compose" && (
          <ComposeForm mode="compose" onSend={sendEmail} onCancel={() => setComposing(null)} signature={signature} />
        )}

        {/* Task form (from email) */}
        {showTaskForm && (
          <TaskForm prefillFromEmail={showTaskForm.prefillFromEmail} onSave={(task) => { setTasks(prev => [...prev, task]); setShowTaskForm(null); showToast("Task created!"); }} onCancel={() => setShowTaskForm(null)} />
        )}

        {/* Event form (from email) */}
        {showEventForm && (
          <EventForm prefillFromEmail={showEventForm.prefillFromEmail} onSave={(data) => { calendarAction("create", { event: data }); setShowEventForm(null); }} onCancel={() => setShowEventForm(null)} />
        )}

        {/* ═══════════════════════════════════════════ */}
        {/*  TODAY TAB                                  */}
        {/* ═══════════════════════════════════════════ */}
        {tab === "today" && (
          <div>
            {/* Morning Briefing */}
            <div style={{ background: `linear-gradient(135deg, ${T.accentBg}, ${T.calGreenBg})`, border: `1px solid ${T.calGreenBorder}`,
              borderRadius: 14, padding: "22px 26px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <LeafIcon size={22} />
                <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}</span>
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.7, color: T.text }}>
                {needsReply.length > 0 && <span style={{ fontWeight: 600, color: T.urgentCoral }}>{needsReply.length} email{needsReply.length !== 1 ? "s" : ""} need your reply</span>}
                {needsReply.length > 0 && todayMeetings.length > 0 && <span style={{ color: T.textMuted }}> · </span>}
                {todayMeetings.length > 0 && <span style={{ fontWeight: 600, color: T.calGreen }}>{todayMeetings.length} meeting{todayMeetings.length !== 1 ? "s" : ""} today</span>}
                {(needsReply.length > 0 || todayMeetings.length > 0) && overdueTasks.length > 0 && <span style={{ color: T.textMuted }}> · </span>}
                {overdueTasks.length > 0 && <span style={{ fontWeight: 600, color: T.danger }}>{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""}</span>}
                {needsReply.length === 0 && todayMeetings.length === 0 && overdueTasks.length === 0 && <span style={{ color: T.calGreen }}>All clear — you're on top of things!</span>}
              </div>
            </div>

            {/* Prep for Next Week button (Fri/Sun/Mon) */}
            {showPrepButton && (
              <button onClick={() => fetchWeekPrep(dayOfWeek === 5)} style={{ width: "100%", padding: "14px 20px", marginBottom: 20,
                background: T.calGreenBg, color: T.calGreen, border: `2px solid ${T.calGreenBorder}`,
                borderRadius: 12, cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span>🗓</span> {dayOfWeek === 5 ? "Prep for Next Week" : "Week Ahead Prep"}
              </button>
            )}

            {/* Week Prep Modal */}
            {showWeekPrep && (
              <div style={{ background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 14, padding: 22, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.calGreen }}>🗓 Week Ahead</span>
                  <button onClick={() => setShowWeekPrep(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textMuted }}>×</button>
                </div>
                {weekPrepEvents.filter(isRealMeeting).map(ev => {
                  const prepped = preppedEvents[ev.id];
                  return (
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                      <button onClick={() => setPreppedEvents(prev => {
                        const next = { ...prev };
                        if (next[ev.id]) delete next[ev.id]; else next[ev.id] = true;
                        return next;
                      })} style={{
                        width: 36, height: 36, borderRadius: 8, border: `2px solid ${prepped ? T.calGreen : T.border}`,
                        background: prepped ? T.calGreenBg : T.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, color: prepped ? T.calGreen : T.textDim, flexShrink: 0,
                      }}>
                        {prepped ? "✓" : ""}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: prepped ? T.calGreen : T.text }}>{ev.title}</div>
                        <div style={{ fontSize: 14, color: T.textMuted }}>{formatDate(ev.start)} · {formatTime(ev.start)}</div>
                      </div>
                      {ev.hangoutLink && (
                        <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer"
                          style={{ padding: "6px 14px", background: T.calGreenBg, color: T.calGreen, border: `1px solid ${T.calGreenBorder}`, borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                          Join Call
                        </a>
                      )}
                      {!ev.description?.includes("agenda") && (
                        <button onClick={() => { setTab("drive"); setDriveSearch(ev.title); fetchDrive("search", ev.title); }}
                          style={{ padding: "6px 14px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          Find Agenda
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Donation Alerts */}
            {donationAlerts.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>💚</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: T.calGreen }}>Donation Alerts</span>
                  <span style={{ fontSize: 13, color: T.calGreen, background: T.calGreenBg, padding: "2px 10px", borderRadius: 8, fontWeight: 600 }}>{donationAlerts.length}</span>
                </div>
                {donationAlerts.slice(0, 3).map((e, i) => renderEmailRow(e, i))}
              </div>
            )}

            {/* Needs Your Reply */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>✉️</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: T.urgentCoral }}>Needs Your Reply</span>
                <span style={{ fontSize: 13, color: T.urgentCoral, background: T.urgentCoralBg, padding: "2px 10px", borderRadius: 8, fontWeight: 600 }}>{needsReply.length}</span>
              </div>
              {needsReply.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: T.textMuted, fontSize: 15, background: T.card, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  You're all caught up!
                </div>
              ) : (
                needsReply.slice(0, 5).map((e, i) => renderEmailRow(e, i))
              )}
              {needsReply.length > 5 && (
                <button onClick={() => setTab("emails")} style={{ width: "100%", padding: "10px", background: T.emailBlueBg, color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                  View all {needsReply.length} emails needing reply →
                </button>
              )}
            </div>

            {/* Today's Schedule */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>📅</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: T.calGreen }}>Today's Schedule</span>
              </div>
              <div style={{ background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 12, overflow: "hidden" }}>
                {events.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: T.textMuted, fontSize: 15 }}>No events today</div>
                ) : (
                  events.map(ev => (
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: `1px solid ${T.borderLight}`,
                      opacity: isRealMeeting(ev) ? 1 : 0.55 }}>
                      <div style={{ width: 50, textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.calGreen }}>{formatTime(ev.start)}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: T.text }}>{ev.title}</div>
                        {ev.location && <div style={{ fontSize: 13, color: T.textMuted }}>{ev.location}</div>}
                      </div>
                      {ev.hangoutLink && (
                        <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer"
                          style={{ padding: "7px 16px", background: T.calGreen, color: "#fff", borderRadius: 7, textDecoration: "none", fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                          Join Call
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* End of Day Wrap Up */}
            {new Date().getHours() >= 16 && (
              <div style={{ background: T.goldBg, border: `1px solid ${T.taskAmberBorder}`, borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 17 }}>🌅</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: T.taskAmber }}>End of Day Wrap-Up</span>
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.7, color: T.text }}>
                  <div>📧 Emails still needing reply: <strong>{needsReply.length}</strong></div>
                  <div>✅ Tasks completed today: <strong>{tasks.filter(t => t.done).length}</strong></div>
                  <div>📋 Tasks carrying over: <strong>{tasks.filter(t => !t.done).length}</strong></div>
                  <div>⚠️ Overdue: <strong style={{ color: overdueTasks.length > 0 ? T.danger : T.calGreen }}>{overdueTasks.length}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/*  EMAILS TAB                                */}
        {/* ═══════════════════════════════════════════ */}
        {tab === "emails" && (
          <div>
            <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 16 }}>
              Showing {emails.length} unread emails · Only unread messages appear here
            </div>

            {sortedBuckets.map(([bucket, bucketEmails]) => {
              const info = BUCKETS[bucket] || { label: bucket, icon: "📧", color: T.textMuted, bg: T.bg, border: T.border };
              const canBatchDelete = ["automated", "calendar-notif", "docs-activity", "classy-recurring"].includes(bucket);
              const canBatchMarkRead = true;

              return (
                <div key={bucket} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{info.icon}</span>
                      <span style={{ fontSize: 17, fontWeight: 700, color: info.color }}>{info.label}</span>
                      <span style={{ fontSize: 13, color: info.color, background: info.bg, padding: "2px 10px", borderRadius: 8, fontWeight: 600, border: `1px solid ${info.border}` }}>
                        {bucketEmails.length}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {canBatchMarkRead && (
                        <button onClick={() => batchAction("markRead", bucketEmails.map(e => e.id))}
                          style={{ padding: "5px 12px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                          Mark all read
                        </button>
                      )}
                      {canBatchDelete && (
                        <button onClick={() => batchAction("trash", bucketEmails.map(e => e.id))}
                          style={{ padding: "5px 12px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.urgentCoralBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                          Delete all
                        </button>
                      )}
                    </div>
                  </div>
                  {bucketEmails.map((e, i) => renderEmailRow(e, i))}
                </div>
              );
            })}

            {nextPage && (
              <button onClick={() => fetchData(nextPage)} style={{ width: "100%", padding: "14px", background: T.emailBlueBg, color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
                Load More Emails
              </button>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/*  CALENDAR TAB                              */}
        {/* ═══════════════════════════════════════════ */}
        {tab === "calendar" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={() => setCalView("today")} style={{ padding: "9px 20px", background: calView === "today" ? T.calGreenBg : T.bg, color: calView === "today" ? T.calGreen : T.textMuted, border: `1px solid ${calView === "today" ? T.calGreenBorder : T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Today</button>
              <button onClick={() => { setCalView("week"); fetchWeekEvents(); }} style={{ padding: "9px 20px", background: calView === "week" ? T.calGreenBg : T.bg, color: calView === "week" ? T.calGreen : T.textMuted, border: `1px solid ${calView === "week" ? T.calGreenBorder : T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>This Week</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowEventForm({})} style={{ padding: "9px 20px", background: T.calGreen, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>+ New Event</button>
            </div>

            {showEventForm && !showEventForm.prefillFromEmail && (
              <EventForm onSave={(data) => { calendarAction("create", { event: data }); setShowEventForm(null); }} onCancel={() => setShowEventForm(null)} />
            )}

            {calView === "today" && (
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: T.calGreen, marginBottom: 14 }}>Today — {formatDate(new Date())}</h3>
                {events.length === 0 ? (
                  <div style={{ padding: 30, textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}>No events today</div>
                ) : (
                  events.map(ev => (
                    <div key={ev.id} style={{ background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 10, padding: "16px 20px", marginBottom: 10, display: "flex", alignItems: "center", gap: 16, opacity: isRealMeeting(ev) ? 1 : 0.5 }}>
                      <div style={{ minWidth: 60, textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.calGreen }}>{formatTime(ev.start)}</div>
                        <div style={{ fontSize: 13, color: T.textMuted }}>{formatTime(ev.end)}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 16, color: T.text }}>{ev.title}</div>
                        {ev.location && <div style={{ fontSize: 14, color: T.textMuted, marginTop: 2 }}>📍 {ev.location}</div>}
                        {ev.attendees?.length > 0 && <div style={{ fontSize: 13, color: T.textDim, marginTop: 3 }}>{ev.attendees.map(a => a.name || a.email).join(", ")}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", background: T.calGreen, color: "#fff", borderRadius: 7, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Join Call</a>}
                        <button onClick={() => {
                          const p = preppedEvents[ev.id];
                          setPreppedEvents(prev => { const next = { ...prev }; if (next[ev.id]) delete next[ev.id]; else next[ev.id] = true; return next; });
                        }} style={{ padding: "8px 14px", background: preppedEvents[ev.id] ? T.calGreenBg : T.bg, color: preppedEvents[ev.id] ? T.calGreen : T.textMuted, border: `1px solid ${preppedEvents[ev.id] ? T.calGreenBorder : T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                          {preppedEvents[ev.id] ? "✓ Prep" : "Prep"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {calView === "week" && (
              <div>
                {(() => {
                  const days = {};
                  weekEvents.forEach(ev => {
                    const day = new Date(ev.start).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
                    if (!days[day]) days[day] = [];
                    days[day].push(ev);
                  });
                  return Object.entries(days).map(([day, dayEvents]) => (
                    <div key={day} style={{ marginBottom: 22 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: T.calGreen, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${T.calGreenBorder}` }}>{day}</h4>
                      {dayEvents.map(ev => (
                        <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", marginBottom: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, opacity: isRealMeeting(ev) ? 1 : 0.5 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: T.calGreen, minWidth: 60 }}>{formatTime(ev.start)}</span>
                          <span style={{ fontSize: 15, color: T.text, flex: 1 }}>{ev.title}</span>
                          {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "5px 12px", background: T.calGreen, color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Join</a>}
                          <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })} style={{ padding: "5px 12px", background: preppedEvents[ev.id] ? T.calGreenBg : T.bg, color: preppedEvents[ev.id] ? T.calGreen : T.textMuted, border: `1px solid ${preppedEvents[ev.id] ? T.calGreenBorder : T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                            {preppedEvents[ev.id] ? "✓ Prep" : "Prep"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/*  TASKS TAB — Visual board with drag & drop */}
        {/* ═══════════════════════════════════════════ */}
        {tab === "tasks" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: T.taskAmber }}>Task Board</span>
              <button onClick={() => setShowTaskForm({})} style={{ padding: "9px 20px", background: T.taskAmber, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>+ New Task</button>
            </div>

            {showTaskForm && !showTaskForm.prefillFromEmail && (
              <TaskForm onSave={(task) => { setTasks(prev => [...prev, task]); setShowTaskForm(null); showToast("Task created!"); }} onCancel={() => setShowTaskForm(null)} />
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
              {CATEGORIES.map(cat => {
                const catTasks = tasks.filter(t => t.category === cat.id && !t.done).sort((a, b) => (a.order || 0) - (b.order || 0));
                const doneTasks = tasks.filter(t => t.category === cat.id && t.done);

                return (
                  <div key={cat.id}
                    onDragOver={(e) => handleTaskDragOver(e, null, cat.id)}
                    onDrop={(e) => handleTaskDrop(e, null, cat.id)}
                    style={{
                      background: dragOverCategory === cat.id ? cat.bg : T.card,
                      border: `2px solid ${dragOverCategory === cat.id ? cat.color : T.border}`,
                      borderRadius: 14, padding: 18, minHeight: 120,
                      borderTop: `4px solid ${cat.color}`, transition: "all 0.15s",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: cat.color }}>{cat.label}</span>
                      <span style={{ fontSize: 13, color: T.textMuted, background: cat.bg, padding: "2px 8px", borderRadius: 6 }}>{catTasks.length}</span>
                    </div>

                    {catTasks.map(task => {
                      const urg = URGENCY.find(u => u.id === task.urgency);
                      return (
                        <div key={task.id} draggable
                          onDragStart={() => handleTaskDragStart(task)}
                          onDragOver={(e) => handleTaskDragOver(e, task, cat.id)}
                          onDrop={(e) => handleTaskDrop(e, task, cat.id)}
                          style={{
                            background: dragOverTask === task.id ? T.cardHover : T.surface,
                            border: `1px solid ${dragOverTask === task.id ? cat.color : T.border}`,
                            borderRadius: 8, padding: "12px 14px", marginBottom: 8, cursor: "grab",
                            borderLeft: `4px solid ${urg?.dot || T.border}`, transition: "all 0.1s",
                          }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <input type="checkbox" checked={task.done} onChange={() => {
                              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
                              showToast(task.done ? "Task reopened" : "Task completed!");
                            }} style={{ cursor: "pointer", width: 18, height: 18, accentColor: cat.color }} />
                            <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: T.text }}>{task.title}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            {urg && <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: urg.bg, color: urg.color, fontWeight: 600 }}>{urg.label}</span>}
                            {task.due && <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: new Date(task.due) < new Date() ? T.dangerBg : T.bg, color: new Date(task.due) < new Date() ? T.danger : T.textMuted }}>{task.due}</span>}
                          </div>
                          {task.notes && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6, lineHeight: 1.4 }}>{task.notes}</div>}
                        </div>
                      );
                    })}

                    {doneTasks.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${T.border}` }}>
                        <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>{doneTasks.length} completed</div>
                        {doneTasks.slice(0, 2).map(task => (
                          <div key={task.id} style={{ fontSize: 13, color: T.textDim, textDecoration: "line-through", padding: "3px 0" }}>{task.title}</div>
                        ))}
                      </div>
                    )}

                    {catTasks.length === 0 && doneTasks.length === 0 && (
                      <div style={{ fontSize: 14, color: T.textDim, textAlign: "center", padding: 16 }}>Drop tasks here</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/*  DRIVE TAB                                 */}
        {/* ═══════════════════════════════════════════ */}
        {tab === "drive" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input placeholder="Search Drive..." value={driveSearch} onChange={e => setDriveSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && driveSearch) fetchDrive("search", driveSearch); }}
                style={{ flex: 1, padding: "10px 16px", border: `1px solid ${T.driveVioletBorder}`, borderRadius: 8, fontSize: 15, background: T.surface, color: T.text, outline: "none" }} />
              <button onClick={() => fetchDrive("search", driveSearch)} style={{ padding: "10px 20px", background: T.driveViolet, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 15 }}>Search</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[{ id: "recent", label: "Recent" }, { id: "starred", label: "Starred" }].map(v => (
                <button key={v.id} onClick={() => { setDriveView(v.id); fetchDrive(v.id); }}
                  style={{ padding: "7px 16px", background: driveView === v.id ? T.driveVioletBg : T.bg, color: driveView === v.id ? T.driveViolet : T.textMuted, border: `1px solid ${driveView === v.id ? T.driveVioletBorder : T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                  {v.label}
                </button>
              ))}
            </div>

            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              {driveFiles.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: T.textMuted, fontSize: 15 }}>No files found</div>
              ) : (
                driveFiles.map(f => (
                  <a key={f.id} href={f.webViewLink} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: `1px solid ${T.borderLight}`, textDecoration: "none", color: T.text }}>
                    <img src={f.iconLink} alt="" style={{ width: 22, height: 22 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 15 }}>{f.name}</div>
                      <div style={{ fontSize: 13, color: T.textMuted }}>{f.mimeType?.split(".").pop()} · Modified {formatRelativeDate(f.modifiedTime)}</div>
                    </div>
                    {f.starred && <span>⭐</span>}
                  </a>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/*  DRAFTS TAB                                */}
        {/* ═══════════════════════════════════════════ */}
        {tab === "drafts" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: T.info }}>Drafts</span>
              <button onClick={fetchDrafts} style={{ padding: "7px 16px", background: T.infoBg, color: T.info, border: `1px solid ${T.info}30`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Refresh</button>
            </div>

            {drafts.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 16, marginBottom: 8 }}>No drafts</div>
                <div style={{ fontSize: 14 }}>Drafts from Gmail will appear here</div>
              </div>
            ) : (
              drafts.map(d => (
                <div key={d.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: T.text }}>{d.subject || "(No subject)"}</div>
                      <div style={{ fontSize: 14, color: T.textMuted }}>To: {d.to || "(no recipient)"}</div>
                    </div>
                    <div style={{ fontSize: 13, color: T.textDim, textAlign: "right" }}>
                      <div>Sitting for <strong style={{ color: emailAge(d.date) > 48 ? T.danger : T.textMuted }}>{draftAge(d.date)}</strong></div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 12 }}>{d.snippet}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => {
                      const r = await fetch("/api/drafts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: d.id }) });
                      const res = await r.json();
                      if (res.success) { showToast("Draft sent!"); fetchDrafts(); }
                    }} style={{ padding: "7px 16px", background: T.accent, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                      Send Now
                    </button>
                    <button onClick={() => window.open(`https://mail.google.com/mail/#drafts/${d.messageId}`, "_blank")}
                      style={{ padding: "7px 16px", background: T.infoBg, color: T.info, border: `1px solid ${T.info}30`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                      Edit & Send
                    </button>
                    <button onClick={async () => {
                      const r = await fetch(`/api/drafts?id=${d.id}`, { method: "DELETE" });
                      const res = await r.json();
                      if (res.success) { showToast("Draft deleted"); fetchDrafts(); }
                    }} style={{ padding: "7px 16px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.urgentCoralBorder}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
