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
  emailBlue: "#3B82C4", emailBlueBg: "#EBF3FB", emailBlueBorder: "#B8D4F0",
  calGreen: "#3A9B5A", calGreenBg: "#E6F5EC", calGreenBorder: "#A8DDB8",
  taskAmber: "#C4942A", taskAmberBg: "#FFF8E8", taskAmberBorder: "#E8D5A0",
  driveViolet: "#7C5AC4", driveVioletBg: "#F0EBF9", driveVioletBorder: "#C4B0E8",
  urgentCoral: "#D45555", urgentCoralBg: "#FFF0F0", urgentCoralBorder: "#F0B8B8",
  stickyYellow: "#F5E642", stickyYellowBg: "#FFFDE8", stickyYellowBorder: "#E8E0A0",
  leafDecor: "#4A9B4A",
};

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
  { name: "Laura Lavid", initials: "LL", email: "" },
  { name: "Gretchen Roberts", initials: "GR", email: "" },
  { name: "Carmen Alcantara", initials: "CA", email: "" },
  { name: "Adjoa Kittoe", initials: "AK", email: "" },
  { name: "Debbie Nash", initials: "DN", email: "" },
  { name: "Lone Bryan", initials: "LB", email: "" },
];

const URGENCY = [
  { id: "critical", label: "Critical", color: "#D45555", bg: "#FFF0F0", dot: "#FF4444" },
  { id: "high", label: "High", color: "#C4942A", bg: "#FFF8E8", dot: "#FFAA33" },
  { id: "medium", label: "Medium", color: "#3B82C4", bg: "#EBF3FB", dot: "#55AAFF" },
  { id: "low", label: "Low", color: "#6B8068", bg: "#F0F5EE", dot: "#6B8068" },
];

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

  // DropboxSign / HelloSign from Laura = HIGH PRIORITY
  if (from.includes("dropboxsign") || from.includes("hellosign") || from.includes("dropbox.com")) {
    return "needs-response";
  }

  const isBcc = deliveredTo && !to.includes(deliveredTo) && !cc.includes(deliveredTo);
  const isMassSend = recipientCount >= 5 || isBcc;

  if (isMassSend && !from.includes("classy") && !from.includes("hubspot")) return "fyi-mass";
  if (listUnsub || listId || precedence === "list" || precedence === "bulk") {
    if (from.includes("classy") || from.includes("fundrais")) return "classy-recurring";
    return "newsletter";
  }
  if (from.includes("calendar-notification") || from.includes("calendar.google.com")) return "calendar-notif";
  if (from.includes("drive-shares-dm") || from.includes("comments-noreply") || from.includes("docs.google.com") || from.includes("drive.google.com")) return "docs-activity";
  if (from.includes("noreply") || from.includes("no-reply") || from.includes("notifications@") || from.includes("mailer-daemon") || from.includes("postmaster")) return "automated";
  if ((from.includes("classy") || subj.includes("classy")) && (subj.includes("donation") || subj.includes("gift") || subj.includes("contribut"))) return "classy-onetime";
  if (from.includes("classy")) return "classy-recurring";
  if (from.includes("freshfoodconnect") || from.includes("ffc")) return "team";
  if (recipientCount <= 3 && !isBcc) return "needs-response";
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

const SNOOZE_OPTIONS = [
  { label: "Tomorrow morning", getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString(); } },
  { label: "Later this week", getValue: () => { const d = new Date(); const daysUntilThu = (4 - d.getDay() + 7) % 7 || 4; d.setDate(d.getDate() + daysUntilThu); d.setHours(8, 0, 0, 0); return d.toISOString(); } },
  { label: "Next week", getValue: () => { const d = new Date(); const daysUntilMon = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + daysUntilMon); d.setHours(8, 0, 0, 0); return d.toISOString(); } },
  { label: "Custom...", getValue: () => null },
];

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
//  SMALL COMPONENTS
// ═══════════════════════════════════════════════
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: T.text, color: "#fff", padding: "14px 30px", borderRadius: 10,
      fontSize: 16, fontWeight: 500, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      animation: "slideUp 0.3s ease" }}>
      {message}
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
//  COMPOSE / REPLY / FORWARD FORM
// ═══════════════════════════════════════════════
function ComposeForm({ mode = "compose", email = null, onSend, onCancel, signature = "", suggestedForwardTo = "", prefillBody = "" }) {
  const [to, setTo] = useState(mode === "reply" && email ? (email.replyTo || email.from || "") : (mode === "forward" ? suggestedForwardTo : ""));
  const [cc, setCc] = useState(mode === "reply" && email ? (email.cc || "") : "");
  const [subject, setSubject] = useState(
    mode === "reply" ? `Re: ${(email?.subject || "").replace(/^Re:\s*/i, "")}` :
    mode === "forward" ? `Fwd: ${email?.subject || ""}` : ""
  );
  const [body, setBody] = useState(prefillBody || "");
  const [sending, setSending] = useState(false);
  const inputStyle = { width: "100%", padding: "12px 16px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 16, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box" };

  const handleSend = async () => {
    if (!to.trim()) return;
    setSending(true);
    try {
      const payload = { to, cc, subject, body: body + (signature ? `\n--\n${signature.replace(/<[^>]*>/g, "")}` : "") };
      if (mode === "reply" && email) { payload.threadId = email.threadId; payload.inReplyTo = email.messageId; payload.references = email.messageId; }
      if (mode === "forward" && email) { payload.forward = true; payload.originalBody = email.snippet || ""; }
      await onSend(payload);
    } finally { setSending(false); }
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 22, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 17, color: T.text }}>{mode === "reply" ? "Reply" : mode === "forward" ? "Forward" : "New Email"}</span>
        <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textMuted }}>×</button>
      </div>
      <input placeholder="To" value={to} onChange={e => setTo(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <input placeholder="Cc" value={cc} onChange={e => setCc(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <textarea placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} rows={6} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
      {signature && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6, padding: "8px 12px", background: T.bg, borderRadius: 6, borderLeft: `3px solid ${T.accent}` }}>Your signature will be appended</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={handleSend} disabled={sending || !to.trim()} style={{ padding: "11px 26px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer", opacity: sending ? 0.6 : 1 }}>{sending ? "Sending..." : "Send"}</button>
        <button onClick={onCancel} style={{ padding: "11px 22px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  EVENT FORM
// ═══════════════════════════════════════════════
function EventForm({ event = null, onSave, onCancel, prefillFromEmail = null }) {
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
  const inputStyle = { width: "100%", padding: "12px 16px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 16, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box" };

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
      <input placeholder="Attendees (comma-separated emails)" value={attendees} onChange={e => setAttendees(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
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
function TaskForm({ task = null, onSave, onCancel, prefillFromEmail = null }) {
  const [title, setTitle] = useState(task?.title || (prefillFromEmail?.subject || ""));
  const [category, setCategory] = useState(task?.category || "admin");
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
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, flex: 1 }}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
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
//  MAIN APP
// ═══════════════════════════════════════════════
export default function Home() {
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState("today");
  const [emails, setEmails] = useState([]);
  const [events, setEvents] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [expandedEmail, setExpandedEmail] = useState(null);
  const [emailBody, setEmailBody] = useState({});
  const [composing, setComposing] = useState(null);
  const [showSnooze, setShowSnooze] = useState(null);
  const [contactHistory, setContactHistory] = useState({});
  const [signature, setSignature] = useState("");
  const [forwardSuggestions, setForwardSuggestions] = useState({});

  const [calView, setCalView] = useState("today");
  const [weekEvents, setWeekEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(null);
  const [preppedEvents, setPreppedEvents] = useState(() => {
    if (typeof window !== "undefined") { try { return JSON.parse(localStorage.getItem("ffc_prepped") || "{}"); } catch { return {}; } }
    return {};
  });

  // TASK STATE — with backup protection
  const [tasks, setTasks] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("ffc_tasks");
        const backup = localStorage.getItem("ffc_tasks_backup");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
        if (backup) {
          const parsedBackup = JSON.parse(backup);
          if (Array.isArray(parsedBackup) && parsedBackup.length > 0) return parsedBackup;
        }
      } catch {}
    }
    return [];
  });
  const [showTaskForm, setShowTaskForm] = useState(null);
  const [dragTask, setDragTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);

  const [driveFiles, setDriveFiles] = useState([]);
  const [driveSearch, setDriveSearch] = useState("");
  const [driveView, setDriveView] = useState("recent");
  const [drafts, setDrafts] = useState([]);

  // Sticky Notes
  const [stickyNotes, setStickyNotes] = useState(() => {
    if (typeof window !== "undefined") { try { return JSON.parse(localStorage.getItem("ffc_stickies") || "[]"); } catch { return []; } }
    return [];
  });
  const [newStickyText, setNewStickyText] = useState("");

  // Week prep
  const [showWeekPrep, setShowWeekPrep] = useState(false);
  const [weekPrepEvents, setWeekPrepEvents] = useState([]);

  // Monday digest
  const [digest, setDigest] = useState(null);

  // Finance review
  const [financeAlert, setFinanceAlert] = useState(null);

  // Credit card
  const [ccAlert, setCcAlert] = useState(null);

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

  const showToast = useCallback((msg) => setToast(msg), []);

  // ── Fetch data ──
  const fetchData = useCallback(async (pageToken) => {
    try {
      const url = pageToken ? `/api/data?page=${pageToken}` : "/api/data";
      const r = await fetch(url);
      const d = await r.json();
      if (!d.authenticated) { setAuth(false); setLoading(false); return; }
      setAuth(true);
      if (pageToken) { setEmails(prev => [...prev, ...d.emails.filter(e => e.unread)]); }
      else { setEmails(d.emails.filter(e => e.unread)); setEvents(d.events || []); }
      setNextPage(d.nextPage);
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (auth) fetch("/api/signature").then(r => r.json()).then(d => { if (d.signature) setSignature(d.signature); }).catch(() => {}); }, [auth]);

  // Monday digest
  useEffect(() => {
    if (auth && new Date().getDay() <= 1) {
      fetch("/api/monday-digest").then(r => r.json()).then(d => { if (d.digest) setDigest(d); }).catch(() => {});
    }
  }, [auth]);

  // ── Actions ──
  const emailAction = async (action, messageId, extra = {}) => {
    const r = await fetch("/api/email-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, messageId, ...extra }) });
    const d = await r.json();
    if (d.success) {
      if (["markRead", "archive", "trash", "snooze"].includes(action)) setEmails(prev => prev.filter(e => e.id !== messageId));
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
    if (d.success) { showToast("Email sent!"); setComposing(null); } else { showToast("Failed: " + (d.error || "Unknown error")); }
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

  const calendarAction = async (action, data) => {
    const r = await fetch("/api/calendar-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...data }) });
    const d = await r.json();
    if (d.success) { showToast(action === "create" ? "Event created!" : action === "delete" ? "Event deleted" : "Event updated"); fetchData(); }
    return d;
  };

  const fetchWeekEvents = async () => {
    const now = new Date();
    const sun = new Date(now); sun.setDate(now.getDate() - now.getDay()); sun.setHours(0, 0, 0, 0);
    const sat = new Date(sun); sat.setDate(sun.getDate() + 7);
    const r = await fetch("/api/calendar-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "range", startDate: sun.toISOString(), endDate: sat.toISOString() }) });
    const d = await r.json();
    if (d.success) setWeekEvents(d.events || []);
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

  useEffect(() => { if (auth && tab === "drive") fetchDrive(driveView); }, [auth, tab, driveView]);

  const fetchDrafts = async () => { const r = await fetch("/api/drafts"); const d = await r.json(); if (d.drafts) setDrafts(d.drafts); };
  useEffect(() => { if (auth && tab === "drafts") fetchDrafts(); }, [auth, tab]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      // shortcuts only on email tab
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ── Classify ──
  const emailsByBucket = {};
  emails.forEach(e => { const b = classifyEmail(e); if (!emailsByBucket[b]) emailsByBucket[b] = []; emailsByBucket[b].push(e); });
  const sortedBuckets = Object.entries(emailsByBucket).sort((a, b) => (BUCKETS[a[0]]?.priority || 99) - (BUCKETS[b[0]]?.priority || 99));
  const needsReply = emailsByBucket["needs-response"] || [];
  const donationAlerts = emailsByBucket["classy-onetime"] || [];
  const todayMeetings = events.filter(isRealMeeting);
  const overdueTasks = tasks.filter(t => !t.done && t.due && new Date(t.due) < new Date());
  const dayOfWeek = new Date().getDay();
  const showPrepButton = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 5;

  // ── Helpers ──
  const fmtTime = (dt) => { if (!dt) return ""; return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }); };
  const fmtDate = (dt) => { if (!dt) return ""; return new Date(dt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
  const fmtRel = (ds) => { if (!ds) return ""; const d = new Date(ds); const diff = Date.now() - d; const m = Math.floor(diff / 60000); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const dy = Math.floor(h / 24); if (dy < 7) return `${dy}d ago`; return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
  const draftAge = (ds) => { if (!ds) return ""; const days = Math.floor((Date.now() - new Date(ds).getTime()) / 86400000); if (days === 0) return "Today"; if (days === 1) return "1 day"; return `${days} days`; };

  const handleTaskDragStart = (task) => setDragTask(task);
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
    setDragTask(null); setDragOverTask(null); setDragOverCategory(null);
  };

  // ── Action button style ──
  const abtn = (color, bg) => ({ padding: "8px 15px", background: bg, color, border: `1px solid ${color}30`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500, whiteSpace: "nowrap" });

  // ═══════════════════════════════════════════════
  //  RENDER EMAIL ROW — with clickable HTML links
  // ═══════════════════════════════════════════════
  const renderEmailRow = (email, idx, showActions = true) => {
    const isExp = expandedEmail === email.id;
    const age = emailAge(email.date);
    const dot = ageDot(age);
    const bucket = classifyEmail(email);
    const isDonation = bucket === "classy-onetime";
    const isDropboxSign = (email.from || "").toLowerCase().includes("dropboxsign") || (email.from || "").toLowerCase().includes("hellosign");
    const fromName = email.from?.replace(/<.*>/, "").trim() || email.from || "";
    const fromAddr = email.from?.match(/<(.+)>/)?.[1] || email.from || "";
    const cInfo = contactHistory[fromAddr];
    const body = emailBody[email.id];

    return (
      <div key={email.id} style={{
        background: isExp ? T.cardHover : T.card, border: `1px solid ${isDropboxSign ? T.urgentCoral : isDonation ? T.calGreenBorder : isExp ? T.accent : T.border}`,
        borderRadius: 10, marginBottom: 10, overflow: "visible",
        borderLeft: isDropboxSign ? `4px solid ${T.urgentCoral}` : isDonation ? `4px solid ${T.calGreen}` : dot ? `4px solid ${dot.color}` : undefined, transition: "all 0.15s",
      }}>
        <div onClick={() => { if (isExp) setExpandedEmail(null); else { setExpandedEmail(email.id); fetchEmailBody(email.id); fetchContactHistory(email.from); } }}
          style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          {dot && <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot.color, flexShrink: 0 }} title={dot.label} />}
          {isDropboxSign && <span style={{ fontSize: 18, flexShrink: 0 }} title="DropboxSign — needs your signature">🔏</span>}
          {isDonation && <span style={{ fontSize: 18, flexShrink: 0 }}>💚</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fromName}</span>
              <span style={{ fontSize: 14, color: T.textDim, flexShrink: 0 }}>{fmtRel(email.date)}</span>
            </div>
            <div style={{ fontSize: 16, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{email.subject}</div>
            {!isExp && <div style={{ fontSize: 15, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>{email.snippet}</div>}
          </div>
          {cInfo && <div style={{ fontSize: 13, color: T.textDim, textAlign: "right", flexShrink: 0, lineHeight: 1.4 }}><div>{cInfo.totalMessages} emails</div><div>Last: {fmtRel(cInfo.lastContact)}</div></div>}
        </div>

        {isExp && (
          <div style={{ padding: "0 20px 18px", borderTop: `1px solid ${T.borderLight}` }}>
            {cInfo && <div style={{ padding: "10px 0", fontSize: 14, color: T.textMuted, display: "flex", gap: 16, borderBottom: `1px solid ${T.borderLight}`, marginBottom: 12 }}>
              <span>📧 {cInfo.totalMessages} total messages</span><span>Last contact: {fmtRel(cInfo.lastContact)}</span>
            </div>}

            {/* Email body — render HTML with clickable links */}
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
                      style={{ padding: "9px 16px", background: T.accentBg, color: T.accent, border: `1px solid ${T.accent}30`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 500, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={qr.text}>
                      {qr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {showActions && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.borderLight}` }}>
                <button onClick={() => setComposing({ mode: "reply", email })} style={abtn(T.emailBlue, T.emailBlueBg)}>↩ Reply</button>
                <button onClick={() => setComposing({ mode: "forward", email })} style={abtn(T.driveViolet, T.driveVioletBg)}>↗ Forward</button>
                <button onClick={() => emailAction("markRead", email.id)} style={abtn(T.textMuted, T.bg)}>✓ Mark Read</button>
                <button onClick={() => emailAction("archive", email.id)} style={abtn(T.textMuted, T.bg)}>📦 Archive</button>
                <button onClick={() => emailAction("trash", email.id)} style={abtn(T.danger, T.dangerBg)}>🗑 Delete</button>
                <button onClick={() => emailAction("star", email.id)} style={abtn(T.gold, T.goldBg)}>⭐ Star</button>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowSnooze(showSnooze === email.id ? null : email.id)} style={abtn(T.info, T.infoBg)}>⏰ Snooze</button>
                  {showSnooze === email.id && <SnoozePicker onSnooze={(until) => { emailAction("snooze", email.id, { snoozeUntil: until }); setShowSnooze(null); }} onCancel={() => setShowSnooze(null)} />}
                </div>
                <button onClick={() => setShowTaskForm({ prefillFromEmail: email })} style={abtn(T.taskAmber, T.taskAmberBg)}>📋 Make Task</button>
                <button onClick={() => setShowEventForm({ prefillFromEmail: email })} style={abtn(T.calGreen, T.calGreenBg)}>📅 Make Event</button>
                {email.listUnsubscribe && <button onClick={() => { window.open(email.listUnsubscribe.replace(/[<>]/g, ""), "_blank"); showToast("Opening unsubscribe link..."); }} style={abtn(T.danger, T.dangerBg)}>🚫 Unsubscribe</button>}
              </div>
            )}

            {composing && composing.email?.id === email.id && (
              <div style={{ marginTop: 14 }}>
                <ComposeForm mode={composing.mode} email={email} onSend={sendEmail} onCancel={() => setComposing(null)} signature={signature} prefillBody={composing.prefillBody || ""} />
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
    { id: "today", label: "Today", color: T.accent, icon: "🏠" },
    { id: "emails", label: "Emails", color: T.emailBlue, icon: "✉️" },
    { id: "calendar", label: "Calendar", color: T.calGreen, icon: "📅" },
    { id: "tasks", label: "Tasks", color: T.taskAmber, icon: "📋" },
    { id: "drive", label: "Drive", color: T.driveViolet, icon: "📁" },
    { id: "drafts", label: "Drafts", color: T.info, icon: "✏️" },
    { id: "sticky", label: "Quick Capture", color: "#B8A030", icon: "📌" },
  ];

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ textAlign: "center" }}><LeafIcon size={44} style={{ marginBottom: 12, opacity: 0.6 }} /><div style={{ color: T.textMuted, fontSize: 18 }}>Loading your command center...</div></div>
    </div>
  );

  if (auth === false) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <LeafIcon size={52} style={{ marginBottom: 18 }} />
        <h1 style={{ fontSize: 28, color: T.text, marginBottom: 10, fontWeight: 700 }}>Fresh Food Connect</h1>
        <p style={{ color: T.textMuted, marginBottom: 30, fontSize: 17 }}>CEO Command Center</p>
        <a href="/api/auth/login" style={{ display: "inline-block", padding: "15px 40px", background: T.accent, color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: 17 }}>Sign in with Google</a>
      </div>
    </div>
  );

  return (
    <>
      <Head><title>FFC Command Center</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${T.bg}; color: ${T.text}; }
        @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        button:hover { filter: brightness(0.95); }
        a { color: ${T.emailBlue}; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 26px" }}>
        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LeafIcon size={32} />
            <span style={{ fontSize: 24, fontWeight: 700, color: T.text }}>Fresh Food Connect</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setComposing("compose")} style={{ padding: "10px 22px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer" }}>+ Compose</button>
            <div style={{ fontSize: 13, color: T.textMuted, padding: "7px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8 }}>⌨️ j/k r e f t</div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 26, borderBottom: `2px solid ${T.border}`, paddingBottom: 0, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "13px 22px", background: tab === t.id ? t.color + "12" : "transparent",
              color: tab === t.id ? t.color : T.textMuted, border: "none",
              borderBottom: tab === t.id ? `3px solid ${t.color}` : "3px solid transparent",
              borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
              display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s", whiteSpace: "nowrap",
            }}>
              <span>{t.icon}</span> {t.label}
              {t.id === "emails" && emails.length > 0 && <span style={{ background: T.emailBlue, color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 13, fontWeight: 700 }}>{emails.length}</span>}
              {t.id === "sticky" && stickyNotes.length > 0 && <span style={{ background: "#B8A030", color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 13, fontWeight: 700 }}>{stickyNotes.length}</span>}
            </button>
          ))}
        </div>

        {/* Global compose */}
        {composing === "compose" && <ComposeForm mode="compose" onSend={sendEmail} onCancel={() => setComposing(null)} signature={signature} />}
        {showTaskForm && <TaskForm prefillFromEmail={showTaskForm.prefillFromEmail} onSave={(task) => { setTasks(prev => [...prev, task]); setShowTaskForm(null); showToast("Task created!"); }} onCancel={() => setShowTaskForm(null)} />}
        {showEventForm && <EventForm prefillFromEmail={showEventForm.prefillFromEmail} onSave={(data) => { calendarAction("create", { event: data }); setShowEventForm(null); }} onCancel={() => setShowEventForm(null)} />}

        {/* ═══════════ TODAY TAB ═══════════ */}
        {tab === "today" && (
          <div>
            {/* Morning Briefing */}
            <div style={{ background: `linear-gradient(135deg, ${T.accentBg}, ${T.calGreenBg})`, border: `1px solid ${T.calGreenBorder}`, borderRadius: 14, padding: "24px 28px", marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <LeafIcon size={24} />
                <span style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}</span>
              </div>
              <div style={{ fontSize: 17, lineHeight: 1.7, color: T.text }}>
                {needsReply.length > 0 && <span style={{ fontWeight: 600, color: T.urgentCoral }}>{needsReply.length} email{needsReply.length !== 1 ? "s" : ""} need your reply</span>}
                {needsReply.length > 0 && todayMeetings.length > 0 && <span style={{ color: T.textMuted }}> · </span>}
                {todayMeetings.length > 0 && <span style={{ fontWeight: 600, color: T.calGreen }}>{todayMeetings.length} meeting{todayMeetings.length !== 1 ? "s" : ""} today</span>}
                {(needsReply.length > 0 || todayMeetings.length > 0) && overdueTasks.length > 0 && <span style={{ color: T.textMuted }}> · </span>}
                {overdueTasks.length > 0 && <span style={{ fontWeight: 600, color: T.danger }}>{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""}</span>}
                {needsReply.length === 0 && todayMeetings.length === 0 && overdueTasks.length === 0 && <span style={{ color: T.calGreen }}>All clear — you're on top of things!</span>}
              </div>
              {digest && <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(255,255,255,0.7)", borderRadius: 8, fontSize: 15, color: T.text }}>{digest.digest}</div>}
            </div>

            {/* Prep for Next Week */}
            {showPrepButton && <button onClick={() => fetchWeekPrep(dayOfWeek === 5)} style={{ width: "100%", padding: "15px 22px", marginBottom: 22, background: T.calGreenBg, color: T.calGreen, border: `2px solid ${T.calGreenBorder}`, borderRadius: 12, cursor: "pointer", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
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
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 16, color: prepped ? T.calGreen : T.text }}>{ev.title}</div>
                        <div style={{ fontSize: 15, color: T.textMuted }}>{fmtDate(ev.start)} · {fmtTime(ev.start)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", background: T.calGreenBg, color: T.calGreen, border: `1px solid ${T.calGreenBorder}`, borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Join Call</a>}
                        {!ev.description?.includes("agenda") && <button onClick={() => { setTab("drive"); setDriveSearch(ev.title); fetchDrive("search", ev.title); }} style={{ padding: "7px 16px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Find Agenda</button>}
                        <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })}
                          style={{ padding: "7px 16px", background: prepped ? T.calGreenBg : T.bg, color: prepped ? T.calGreen : T.textMuted, border: `1px solid ${prepped ? T.calGreenBorder : T.border}`, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                          {prepped ? "✓ Prepped" : "Prep Done"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Donation Alerts */}
            {donationAlerts.length > 0 && (
              <div style={{ marginBottom: 26 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 19 }}>💚</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.calGreen }}>Donation Alerts</span>
                  <span style={{ fontSize: 14, color: T.calGreen, background: T.calGreenBg, padding: "3px 11px", borderRadius: 8, fontWeight: 600 }}>{donationAlerts.length}</span>
                </div>
                {donationAlerts.slice(0, 3).map((e, i) => renderEmailRow(e, i))}
              </div>
            )}

            {/* Needs Your Reply */}
            <div style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 19 }}>✉️</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: T.urgentCoral }}>Needs Your Reply</span>
                <span style={{ fontSize: 14, color: T.urgentCoral, background: T.urgentCoralBg, padding: "3px 11px", borderRadius: 8, fontWeight: 600 }}>{needsReply.length}</span>
              </div>
              {needsReply.length === 0 ? <div style={{ padding: 22, textAlign: "center", color: T.textMuted, fontSize: 16, background: T.card, borderRadius: 10, border: `1px solid ${T.border}` }}>You're all caught up!</div>
                : needsReply.slice(0, 5).map((e, i) => renderEmailRow(e, i))}
              {needsReply.length > 5 && <button onClick={() => setTab("emails")} style={{ width: "100%", padding: "11px", background: T.emailBlueBg, color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600, marginTop: 8 }}>View all {needsReply.length} emails →</button>}
            </div>

            {/* Today's Schedule */}
            <div style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 19 }}>📅</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: T.calGreen }}>Today's Schedule</span>
              </div>
              <div style={{ background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 12, overflow: "hidden" }}>
                {events.length === 0 ? <div style={{ padding: 22, textAlign: "center", color: T.textMuted, fontSize: 16 }}>No events today</div>
                  : events.map(ev => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderBottom: `1px solid ${T.borderLight}`, opacity: isRealMeeting(ev) ? 1 : 0.5 }}>
                    <div style={{ width: 56, textAlign: "center", flexShrink: 0 }}><div style={{ fontSize: 16, fontWeight: 700, color: T.calGreen }}>{fmtTime(ev.start)}</div></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, color: T.text }}>{ev.title}</div>
                      {ev.location && <div style={{ fontSize: 14, color: T.textMuted }}>📍 {ev.location}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 18px", background: T.calGreen, color: "#fff", borderRadius: 7, textDecoration: "none", fontSize: 15, fontWeight: 600 }}>Join Call</a>}
                      {isRealMeeting(ev) && (
                        <>
                          {!preppedEvents[ev.id] && <button onClick={() => { /* navigate to prep */ }} style={{ padding: "8px 16px", background: T.calGreenBg, color: T.calGreen, border: `1px solid ${T.calGreenBorder}`, borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Prepare</button>}
                          <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })} style={{ padding: "8px 16px", background: preppedEvents[ev.id] ? T.calGreenBg : T.bg, color: preppedEvents[ev.id] ? T.calGreen : T.textMuted, border: `1px solid ${preppedEvents[ev.id] ? T.calGreenBorder : T.border}`, borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                            {preppedEvents[ev.id] ? "✓ Prepped" : "Prep Done"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* End of Day Wrap Up */}
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
          <div>
            <div style={{ fontSize: 15, color: T.textMuted, marginBottom: 18 }}>Showing {emails.length} unread emails · Only unread messages appear here</div>
            {sortedBuckets.map(([bucket, bucketEmails]) => {
              const info = BUCKETS[bucket] || { label: bucket, icon: "📧", color: T.textMuted, bg: T.bg, border: T.border };
              const canBatchDelete = ["automated", "calendar-notif", "docs-activity", "classy-recurring"].includes(bucket);
              return (
                <div key={bucket} style={{ marginBottom: 30 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 19 }}>{info.icon}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: info.color }}>{info.label}</span>
                      <span style={{ fontSize: 14, color: info.color, background: info.bg, padding: "3px 11px", borderRadius: 8, fontWeight: 600, border: `1px solid ${info.border}` }}>{bucketEmails.length}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => batchAction("markRead", bucketEmails.map(e => e.id))} style={{ padding: "6px 14px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 14 }}>Mark all read</button>
                      {canBatchDelete && <button onClick={() => batchAction("trash", bucketEmails.map(e => e.id))} style={{ padding: "6px 14px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.urgentCoralBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 14 }}>Delete all</button>}
                    </div>
                  </div>
                  {bucketEmails.map((e, i) => renderEmailRow(e, i))}
                </div>
              );
            })}
            {nextPage && <button onClick={() => fetchData(nextPage)} style={{ width: "100%", padding: "15px", background: T.emailBlueBg, color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 10, cursor: "pointer", fontSize: 16, fontWeight: 600 }}>Load More Emails</button>}
          </div>
        )}

        {/* ═══════════ CALENDAR TAB ═══════════ */}
        {tab === "calendar" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
              <button onClick={() => setCalView("today")} style={{ padding: "10px 22px", background: calView === "today" ? T.calGreenBg : T.bg, color: calView === "today" ? T.calGreen : T.textMuted, border: `1px solid ${calView === "today" ? T.calGreenBorder : T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>Today</button>
              <button onClick={() => { setCalView("week"); fetchWeekEvents(); }} style={{ padding: "10px 22px", background: calView === "week" ? T.calGreenBg : T.bg, color: calView === "week" ? T.calGreen : T.textMuted, border: `1px solid ${calView === "week" ? T.calGreenBorder : T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>This Week</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowEventForm({})} style={{ padding: "10px 22px", background: T.calGreen, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>+ New Event</button>
            </div>
            {showEventForm && !showEventForm.prefillFromEmail && <EventForm onSave={(data) => { calendarAction("create", { event: data }); setShowEventForm(null); }} onCancel={() => setShowEventForm(null)} />}

            {calView === "today" && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: T.calGreen, marginBottom: 16 }}>Today — {fmtDate(new Date())}</h3>
                {events.length === 0 ? <div style={{ padding: 32, textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 16 }}>No events today</div>
                  : events.map(ev => (
                  <div key={ev.id} style={{ background: T.card, border: `1px solid ${T.calGreenBorder}`, borderRadius: 10, padding: "18px 22px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16, opacity: isRealMeeting(ev) ? 1 : 0.5 }}>
                    <div style={{ minWidth: 66, textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: T.calGreen }}>{fmtTime(ev.start)}</div><div style={{ fontSize: 14, color: T.textMuted }}>{fmtTime(ev.end)}</div></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 17, color: T.text }}>{ev.title}</div>
                      {ev.location && <div style={{ fontSize: 15, color: T.textMuted, marginTop: 3 }}>📍 {ev.location}</div>}
                      {ev.attendees?.length > 0 && <div style={{ fontSize: 14, color: T.textDim, marginTop: 3 }}>{ev.attendees.map(a => a.name || a.email).join(", ")}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "9px 18px", background: T.calGreen, color: "#fff", borderRadius: 7, textDecoration: "none", fontSize: 15, fontWeight: 600 }}>Join Call</a>}
                      {isRealMeeting(ev) && !preppedEvents[ev.id] && <button onClick={() => { setTab("drive"); setDriveSearch(ev.title); fetchDrive("search", ev.title); }} style={{ padding: "9px 16px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Prepare</button>}
                      {isRealMeeting(ev) && <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })} style={{ padding: "9px 16px", background: preppedEvents[ev.id] ? T.calGreenBg : T.bg, color: preppedEvents[ev.id] ? T.calGreen : T.textMuted, border: `1px solid ${preppedEvents[ev.id] ? T.calGreenBorder : T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{preppedEvents[ev.id] ? "✓ Prepped" : "Prep Done"}</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {calView === "week" && (
              <div>{(() => {
                const days = {};
                weekEvents.forEach(ev => { const day = new Date(ev.start).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }); if (!days[day]) days[day] = []; days[day].push(ev); });
                return Object.entries(days).map(([day, dayEvents]) => (
                  <div key={day} style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 17, fontWeight: 700, color: T.calGreen, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${T.calGreenBorder}` }}>{day}</h4>
                    {dayEvents.map(ev => (
                      <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", marginBottom: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, opacity: isRealMeeting(ev) ? 1 : 0.5 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: T.calGreen, minWidth: 66 }}>{fmtTime(ev.start)}</span>
                        <span style={{ fontSize: 16, color: T.text, flex: 1 }}>{ev.title}</span>
                        {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 14px", background: T.calGreen, color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Join</a>}
                        <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })} style={{ padding: "6px 14px", background: preppedEvents[ev.id] ? T.calGreenBg : T.bg, color: preppedEvents[ev.id] ? T.calGreen : T.textMuted, border: `1px solid ${preppedEvents[ev.id] ? T.calGreenBorder : T.border}`, borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{preppedEvents[ev.id] ? "✓ Prepped" : "Prep Done"}</button>
                      </div>
                    ))}
                  </div>
                ));
              })()}</div>
            )}
          </div>
        )}

        {/* ═══════════ TASKS TAB ═══════════ */}
        {tab === "tasks" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.taskAmber }}>Task Board</span>
              <button onClick={() => setShowTaskForm({})} style={{ padding: "10px 22px", background: T.taskAmber, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>+ New Task</button>
            </div>
            {showTaskForm && !showTaskForm.prefillFromEmail && <TaskForm onSave={(task) => { setTasks(prev => [...prev, task]); setShowTaskForm(null); showToast("Task created!"); }} onCancel={() => setShowTaskForm(null)} />}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 20 }}>
              {CATEGORIES.map(cat => {
                const catTasks = tasks.filter(t => t.category === cat.id && !t.done).sort((a, b) => (a.order || 0) - (b.order || 0));
                const doneTasks = tasks.filter(t => t.category === cat.id && t.done);
                return (
                  <div key={cat.id} onDragOver={(e) => handleTaskDragOver(e, null, cat.id)} onDrop={(e) => handleTaskDrop(e, null, cat.id)}
                    style={{ background: dragOverCategory === cat.id ? cat.bg : T.card, border: `2px solid ${dragOverCategory === cat.id ? cat.color : T.border}`, borderRadius: 14, padding: 20, minHeight: 130, borderTop: `4px solid ${cat.color}`, transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <span style={{ fontWeight: 700, fontSize: 17, color: cat.color }}>{cat.label}</span>
                      <span style={{ fontSize: 14, color: T.textMuted, background: cat.bg, padding: "3px 10px", borderRadius: 6 }}>{catTasks.length}</span>
                    </div>
                    {catTasks.map(task => {
                      const urg = URGENCY.find(u => u.id === task.urgency);
                      return (
                        <div key={task.id} draggable onDragStart={() => handleTaskDragStart(task)} onDragOver={(e) => handleTaskDragOver(e, task, cat.id)} onDrop={(e) => handleTaskDrop(e, task, cat.id)}
                          style={{ background: dragOverTask === task.id ? T.cardHover : T.surface, border: `1px solid ${dragOverTask === task.id ? cat.color : T.border}`, borderRadius: 8, padding: "14px 16px", marginBottom: 10, cursor: "grab", borderLeft: `4px solid ${urg?.dot || T.border}`, transition: "all 0.1s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <input type="checkbox" checked={task.done} onChange={() => { setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t)); showToast(task.done ? "Task reopened" : "Task completed!"); }} style={{ cursor: "pointer", width: 20, height: 20, accentColor: cat.color }} />
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
            </div>
          </div>
        )}

        {/* ═══════════ DRIVE TAB ═══════════ */}
        {tab === "drive" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
              <input placeholder="Search Drive..." value={driveSearch} onChange={e => setDriveSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && driveSearch) fetchDrive("search", driveSearch); }}
                style={{ flex: 1, padding: "12px 18px", border: `1px solid ${T.driveVioletBorder}`, borderRadius: 8, fontSize: 16, background: T.surface, color: T.text, outline: "none" }} />
              <button onClick={() => fetchDrive("search", driveSearch)} style={{ padding: "12px 22px", background: T.driveViolet, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 16 }}>Search</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
              {[{ id: "recent", label: "Recent" }, { id: "starred", label: "Starred" }].map(v => (
                <button key={v.id} onClick={() => { setDriveView(v.id); fetchDrive(v.id); }} style={{ padding: "8px 18px", background: driveView === v.id ? T.driveVioletBg : T.bg, color: driveView === v.id ? T.driveViolet : T.textMuted, border: `1px solid ${driveView === v.id ? T.driveVioletBorder : T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>{v.label}</button>
              ))}
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              {driveFiles.length === 0 ? <div style={{ padding: 32, textAlign: "center", color: T.textMuted, fontSize: 16 }}>No files found</div>
                : driveFiles.map(f => (
                <a key={f.id} href={f.webViewLink} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: `1px solid ${T.borderLight}`, textDecoration: "none", color: T.text }}>
                  <img src={f.iconLink} alt="" style={{ width: 24, height: 24 }} />
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: 16 }}>{f.name}</div><div style={{ fontSize: 14, color: T.textMuted }}>{f.mimeType?.split(".").pop()} · Modified {fmtRel(f.modifiedTime)}</div></div>
                  {f.starred && <span>⭐</span>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ DRAFTS TAB ═══════════ */}
        {tab === "drafts" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.info }}>Drafts</span>
              <button onClick={fetchDrafts} style={{ padding: "8px 18px", background: T.infoBg, color: T.info, border: `1px solid ${T.info}30`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>Refresh</button>
            </div>
            {drafts.length === 0 ? <div style={{ padding: 44, textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}><div style={{ fontSize: 17, marginBottom: 8 }}>No drafts</div><div style={{ fontSize: 15 }}>Drafts from Gmail will appear here</div></div>
              : drafts.map(d => (
              <div key={d.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "18px 22px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 16, color: T.text }}>{d.subject || "(No subject)"}</div><div style={{ fontSize: 15, color: T.textMuted }}>To: {d.to || "(no recipient)"}</div></div>
                  <div style={{ fontSize: 14, color: T.textDim, textAlign: "right" }}>Sitting for <strong style={{ color: emailAge(d.date) > 48 ? T.danger : T.textMuted }}>{draftAge(d.date)}</strong></div>
                </div>
                <div style={{ fontSize: 15, color: T.textMuted, marginBottom: 14 }}>{d.snippet}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={async () => { const r = await fetch("/api/drafts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: d.id }) }); const res = await r.json(); if (res.success) { showToast("Draft sent!"); fetchDrafts(); } }} style={{ padding: "8px 18px", background: T.accent, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>Send Now</button>
                  <button onClick={() => window.open(`https://mail.google.com/mail/#drafts/${d.messageId}`, "_blank")} style={{ padding: "8px 18px", background: T.infoBg, color: T.info, border: `1px solid ${T.info}30`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>Edit & Send</button>
                  <button onClick={async () => { const r = await fetch(`/api/drafts?id=${d.id}`, { method: "DELETE" }); const res = await r.json(); if (res.success) { showToast("Draft deleted"); fetchDrafts(); } }} style={{ padding: "8px 18px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.urgentCoralBorder}`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════ STICKY / QUICK CAPTURE TAB ═══════════ */}
        {tab === "sticky" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
              <span style={{ fontSize: 19 }}>📌</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#B8A030" }}>Quick Capture</span>
              <span style={{ fontSize: 14, color: T.textMuted, marginLeft: 8 }}>Jot it down now, sort it out later</span>
            </div>

            {/* New sticky input */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <textarea placeholder="Type anything — a thought, a to-do, a reminder, whatever's in your head..." value={newStickyText} onChange={e => setNewStickyText(e.target.value)} rows={2}
                style={{ flex: 1, padding: "14px 18px", border: `2px solid ${T.stickyYellowBorder}`, borderRadius: 10, fontSize: 16, background: T.stickyYellowBg, color: T.text, outline: "none", resize: "vertical", fontFamily: "inherit" }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && newStickyText.trim()) { e.preventDefault(); setStickyNotes(prev => [{ id: Date.now().toString(), text: newStickyText.trim(), createdAt: new Date().toISOString(), processed: false }, ...prev]); setNewStickyText(""); showToast("Captured!"); } }} />
              <button onClick={() => { if (!newStickyText.trim()) return; setStickyNotes(prev => [{ id: Date.now().toString(), text: newStickyText.trim(), createdAt: new Date().toISOString(), processed: false }, ...prev]); setNewStickyText(""); showToast("Captured!"); }}
                style={{ padding: "14px 24px", background: "#B8A030", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 16, alignSelf: "flex-end" }}>Capture</button>
            </div>

            {/* Sticky notes list */}
            {stickyNotes.length === 0 ? <div style={{ padding: 44, textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 16 }}>Nothing here yet. Type something above to capture a quick thought.</div>
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
                    <button onClick={() => setStickyNotes(prev => prev.filter(n => n.id !== note.id))} style={{ padding: "6px 12px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.urgentCoralBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
