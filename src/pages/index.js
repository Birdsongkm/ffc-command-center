import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Head from "next/head";

// ═══════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════
const T = {
  bg: "#E0E0E0", surface: "#FFFFFF", card: "#FFFFFF", cardHover: "#D4D4D4",
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

// Fill in real email addresses here
const TEAM = [
  { name: "Laura Lavid", initials: "LL", email: "laura@freshfoodconnect.org" },
  { name: "Gretchen Roberts", initials: "GR", email: "gretchen@freshfoodconnect.org" },
  { name: "Carmen Alcantara", initials: "CA", email: "carmen@freshfoodconnect.org" },
  { name: "Adjoa Kittoe", initials: "AK", email: "adjoa@freshfoodconnect.org" },
  { name: "Debbie Nash", initials: "DN", email: "debbie@freshfoodconnect.org" },
  { name: "Lone Bryan", initials: "LB", email: "lone@freshfoodconnect.org" },
];

const URGENCY = [
  { id: "critical", label: "Critical", color: "#D45555", bg: "#FFF0F0", dot: "#FF4444" },
  { id: "high", label: "High", color: "#C4942A", bg: "#FFF8E8", dot: "#FFAA33" },
  { id: "medium", label: "Medium", color: "#3B82C4", bg: "#EBF3FB", dot: "#55AAFF" },
  { id: "low", label: "Low", color: "#6B8068", bg: "#F0F5EE", dot: "#6B8068" },
];

// Daily motivational quote — rotates by day of month
const QUOTES = [
  "Every connection you make today reduces hunger tomorrow.",
  "Your leadership is building a more resilient food system.",
  "Small actions, scaled with heart — that's Fresh Food Connect.",
  "Leading with purpose is its own kind of strength.",
  "You're not just running operations — you're changing lives.",
  "Progress over perfection. Keep moving forward.",
  "Communities thrive when leaders show up.",
  "The work you do matters more than you know.",
  "Nourishing communities, one connection at a time.",
  "Today's inbox is tomorrow's impact.",
  "Great leaders make space for what matters most.",
  "Your mission is your compass. Trust it.",
  "Sustainable change takes sustained effort. You're doing it.",
  "Showing up every day IS the strategy.",
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

  // DropboxSign / HelloSign = HIGH PRIORITY regardless
  if (from.includes("dropboxsign") || from.includes("hellosign") || from.includes("dropbox.com")) {
    return "needs-response";
  }

  // Raised threshold to 20 to avoid false mass-send classification
  const isMassSend = recipientCount >= 20;

  if (isMassSend && !from.includes("classy") && !from.includes("hubspot")) return "fyi-mass";
  if (listUnsub || listId || precedence === "list" || precedence === "bulk") {
    if (from.includes("classy") || from.includes("fundrais")) return "classy-recurring";
    return "newsletter";
  }
  if (from.includes("calendar-notification") || from.includes("calendar.google.com")) return "calendar-notif";
  if (from.includes("drive-shares-dm") || from.includes("comments-noreply") || from.includes("docs.google.com") || from.includes("drive.google.com")) return "docs-activity";
  // Classy checks must come before the generic noreply check — Classy sends from noreply addresses
  if ((from.includes("classy") || subj.includes("classy")) && (subj.includes("donation") || subj.includes("gift") || subj.includes("contribut"))) return "classy-onetime";
  if (from.includes("classy")) return "classy-recurring";
  if (from.includes("noreply") || from.includes("no-reply") || from.includes("notifications@") || from.includes("mailer-daemon") || from.includes("postmaster")) return "automated";
  if (from.includes("freshfoodconnect") || from.includes("@ffc")) return "team";
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
        onClick={() => { setOpen(o => !o); setStatus(null); setText(""); }}
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
        <div style={{
          position: "fixed", bottom: 90, right: 28, width: 380,
          background: T.card, borderRadius: 14, padding: 20,
          boxShadow: "0 8px 36px rgba(0,0,0,0.16)", border: `1px solid ${T.border}`,
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
//  COMPOSE / REPLY / FORWARD FORM — with autocomplete
// ═══════════════════════════════════════════════
function ComposeForm({ mode = "compose", email = null, onSend, onCancel, signature = "", suggestedForwardTo = "", prefillBody = "", contacts = [] }) {
  const [to, setTo] = useState(mode === "reply" && email ? (email.replyTo || email.from || "") : (mode === "forward" ? suggestedForwardTo : ""));
  const [cc, setCc] = useState(mode === "reply" && email ? (email.cc || "") : "");
  const [subject, setSubject] = useState(
    mode === "reply" ? `Re: ${(email?.subject || "").replace(/^Re:\s*/i, "")}` :
    mode === "forward" ? `Fwd: ${email?.subject || ""}` : ""
  );
  const [body, setBody] = useState(prefillBody || "");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
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

  const handleSend = async () => {
    if (!to.trim()) return;
    setSending(true);
    try {
      const payload = { to, cc, subject, body: body + (signature ? `\n--\n${signature.replace(/<[^>]*>/g, "")}` : "") };
      if (mode === "reply" && email) { payload.threadId = email.threadId; payload.inReplyTo = email.messageId; payload.references = email.messageId; payload.originalMessageId = email.id; }
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
//  FINANCE REVIEW PANEL
// ═══════════════════════════════════════════════
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
    if (r.redirected) { window.location.href = r.url; return; }
    const d = await r.json().catch(() => ({}));
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
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState("today");
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
  const [dragTask, setDragTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);

  const [driveFiles, setDriveFiles] = useState([]);
  const [driveSearch, setDriveSearch] = useState("");
  const [driveView, setDriveView] = useState("recent");
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
  const [aiPrep, setAiPrep] = useState({}); // eventId → { loading, text, error }
  const [editingDraft, setEditingDraft] = useState(null); // { id, to, subject, body } or null
  const [draftSaving, setDraftSaving] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [draggingEmail, setDraggingEmail] = useState(null);
  const [dragOverEmailBucket, setDragOverEmailBucket] = useState(null);
  const [emailBucketOverrides, setEmailBucketOverrides] = useState({});
  const [docModal, setDocModal] = useState(null); // { title, content } or null
  const [docSaving, setDocSaving] = useState(false);
  const [docFolderUrl, setDocFolderUrl] = useState("");
  const [hsModal, setHsModal] = useState(null); // { note, subject } or null
  const [hsContacts, setHsContacts] = useState([]);
  const [hsContactSearch, setHsContactSearch] = useState("");
  const [hsContactId, setHsContactId] = useState("");
  const [hsSaving, setHsSaving] = useState(false);

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

  // ── Build contacts list from loaded emails (for autocomplete) ──
  const contacts = useMemo(() => {
    const seen = new Map();
    // Add team members first
    TEAM.forEach(t => { if (t.email) seen.set(t.email, t.name); });
    // Then add from emails
    emails.forEach(e => {
      const match = (e.from || "").match(/^(.*?)\s*<(.+?)>$/);
      if (match) {
        const name = match[1].replace(/"/g, "").trim();
        const addr = match[2].trim();
        if (addr && !seen.has(addr)) seen.set(addr, name || addr);
      } else if (e.from && e.from.includes("@")) {
        if (!seen.has(e.from)) seen.set(e.from, e.from);
      }
    });
    return Array.from(seen.entries()).map(([email, name]) => ({ email, name }));
  }, [emails]);

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
    if (d.success) {
      showToast("Email sent!");
      setComposing(null);
      if (payload.originalMessageId) {
        setEmails(prev => prev.filter(e => e.id !== payload.originalMessageId));
        fetch("/api/email-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markRead", messageId: payload.originalMessageId }) });
      }
    } else { showToast("Failed: " + (d.error || "Unknown error")); }
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

  const fetchDrafts = async () => {
    const r = await fetch("/api/drafts");
    const d = await r.json();
    if (d.drafts) { setDrafts(d.drafts); setDraftsTotal(d.total || d.drafts.length); }
  };
  useEffect(() => { if (auth && tab === "drafts") fetchDrafts(); }, [auth, tab]);

  // ── Keyboard shortcuts ──
  const TAB_IDS = ["today", "emails", "calendar", "tasks", "drive", "drafts", "sticky"];
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      if (e.key === "?") { setShowShortcuts(s => !s); return; }
      if (e.key === "Escape") { setShowShortcuts(false); return; }
      if (tab === "emails") {
        if (e.key === "j") { setFocusedIdx(i => Math.min(i + 1, emails.length - 1)); return; }
        if (e.key === "k") { setFocusedIdx(i => Math.max(i - 1, 0)); return; }
        if (e.key === "e") { const em = emails[focusedIdx]; if (em) emailAction("archive", em.id); return; }
        if (e.key === "r") { const em = emails[focusedIdx]; if (em) setComposing({ mode: "reply", email: em }); return; }
      }
      const n = parseInt(e.key);
      if (n >= 1 && n <= TAB_IDS.length && !e.metaKey && !e.ctrlKey && !e.altKey) setTab(TAB_IDS[n - 1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, emails, focusedIdx]);

  // ── Derived state ──
  const BUCKET_ORDER = ['needs-response','team','classy-onetime','fyi-mass','classy-recurring','calendar-notif','docs-activity','automated','newsletter'];
  const emailsByBucket = {};
  emails.forEach(e => {
    const b = emailBucketOverrides[e.id] || classifyEmail(e);
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
  const sortedBuckets = Object.entries(emailsByBucket).sort(([a], [b]) => {
    const ia = BUCKET_ORDER.indexOf(a); const ib = BUCKET_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
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

  const abtn = (color, bg) => ({ padding: "8px 15px", background: bg, color, border: `1px solid ${color}30`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500, whiteSpace: "nowrap" });

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
    const fromName = email.from?.replace(/<.*>/, "").trim() || email.from || "";
    const fromAddr = email.from?.match(/<(.+)>/)?.[1] || email.from || "";
    const cInfo = contactHistory[fromAddr];
    const body = emailBody[email.id];
    const rsvpLinks = isCalInvite && body?.bodyHtml ? extractCalendarRsvpLinks(body.bodyHtml) : {};

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
        }}>

        {/* Row — click to expand */}
        <div onClick={() => { if (isExp) setExpandedEmail(null); else { setExpandedEmail(email.id); fetchEmailBody(email.id); fetchContactHistory(email.from); } }}
          style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          {dot && <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot.color, flexShrink: 0 }} title={dot.label} />}
          {isDropboxSign && <span style={{ fontSize: 18, flexShrink: 0 }} title="DropboxSign — needs your signature">🔏</span>}
          {isDonation && <span style={{ fontSize: 18, flexShrink: 0 }}>💚</span>}
          {isCalInvite && !isExp && <span style={{ fontSize: 18, flexShrink: 0 }}>📅</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fromName}</span>
              <span style={{ fontSize: 14, color: T.textDim, flexShrink: 0 }}>{fmtRel(email.date)}</span>
            </div>
            <div style={{ fontSize: 16, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{email.subject}</div>
            {!isExp && <div style={{ fontSize: 15, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>{email.snippet}</div>}
          </div>
          {cInfo && !isExp && <div style={{ fontSize: 13, color: T.textDim, textAlign: "right", flexShrink: 0, lineHeight: 1.4 }}><div>{cInfo.totalMessages} emails</div><div>Last: {fmtRel(cInfo.lastContact)}</div></div>}
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
                <button onClick={() => emailAction("archive", email.id)} style={abtn(T.textMuted, T.bg)}>📦 Archive</button>
              </>
            ) : (
              <>
                <button onClick={() => { setExpandedEmail(email.id); fetchEmailBody(email.id); fetchContactHistory(email.from); setComposing({ mode: "reply", email }); }} style={abtn(T.emailBlue, T.emailBlueBg)}>↩ Reply</button>
                <button onClick={() => emailAction("archive", email.id)} style={abtn(T.textMuted, T.bg)}>📦 Archive</button>
                <button onClick={() => emailAction("markRead", email.id)} style={abtn(T.textMuted, T.bg)}>✓ Read</button>
                <button onClick={() => emailAction("star", email.id)} style={abtn(T.gold, T.goldBg)}>⭐ Star</button>
                {isDebbieFinance && <button onClick={() => setFinancePanel(email)} style={abtn(T.taskAmber, T.taskAmberBg)}>📊 Finance Review</button>}
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
                {isDebbieFinance && <button onClick={() => setFinancePanel(email)} style={abtn(T.taskAmber, T.taskAmberBg)}>📊 Finance Review</button>}
                {email.listUnsubscribe && <button onClick={() => { window.open(email.listUnsubscribe.replace(/[<>]/g, ""), "_blank"); showToast("Opening unsubscribe link..."); }} style={abtn(T.danger, T.dangerBg)}>🚫 Unsubscribe</button>}
              </div>
            )}

            {composing && composing.email?.id === email.id && (
              <div style={{ marginTop: 14 }}>
                <ComposeForm mode={composing.mode} email={email} onSend={sendEmail} onCancel={() => setComposing(null)} signature={signature} prefillBody={composing.prefillBody || ""} contacts={contacts} />
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
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        button:hover { filter: brightness(0.95); }
        a { color: ${T.emailBlue}; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 26px" }}>

        {/* HEADER with daily quote */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <LeafIcon size={32} />
              <span style={{ fontSize: 24, fontWeight: 700, color: T.text }}>Fresh Food Connect</span>
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic", paddingLeft: 44 }}>{dailyQuote}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setComposing("compose")} style={{ padding: "10px 22px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer" }}>+ Compose</button>
          </div>
        </div>

        {/* Finance Review Panel (modal-style overlay) */}
        {financePanel && (
          <FinanceReviewPanel email={financePanel} onClose={() => setFinancePanel(null)} showToast={showToast} />
        )}

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
              {t.id === "tasks" && pendingTasks > 0 && <span style={{ background: T.taskAmber, color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 13, fontWeight: 700 }}>{pendingTasks}</span>}
              {t.id === "drafts" && draftsTotal > 0 && <span style={{ background: T.info, color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 13, fontWeight: 700 }}>{draftsTotal}</span>}
              {t.id === "sticky" && stickyNotes.length > 0 && <span style={{ background: "#B8A030", color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 13, fontWeight: 700 }}>{stickyNotes.length}</span>}
            </button>
          ))}
        </div>

        {/* Global compose */}
        {composing === "compose" && <ComposeForm mode="compose" onSend={sendEmail} onCancel={() => setComposing(null)} signature={signature} contacts={contacts} />}
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
                {oldestWaitingDays !== null && oldestWaitingDays > 0 && <div style={{ marginTop: 8, fontSize: 14, color: oldestWaitingDays > 7 ? T.danger : T.gold }}> Oldest reply waiting: <strong>{oldestWaitingDays} day{oldestWaitingDays !== 1 ? "s" : ""}</strong></div>}
              </div>
              {digest && <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(255,255,255,0.7)", borderRadius: 8, fontSize: 15, color: T.text }}>{digest.digest}</div>}
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
                    <div key={ev.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: aiPrep[ev.id]?.text ? "none" : `1px solid ${T.borderLight}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 16, color: prepped ? T.calGreen : T.text }}>{ev.title}</div>
                          <div style={{ fontSize: 15, color: T.textMuted }}>{fmtDate(ev.start)} · {fmtTime(ev.start)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", background: T.calGreenBg, color: T.calGreen, border: `1px solid ${T.calGreenBorder}`, borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Join Call</a>}
                          {!ev.description?.includes("agenda") && <button onClick={() => { setTab("drive"); setDriveSearch(ev.title); fetchDrive("search", ev.title); }} style={{ padding: "7px 16px", background: T.driveVioletBg, color: T.driveViolet, border: `1px solid ${T.driveVioletBorder}`, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Find Agenda</button>}
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
                          {!preppedEvents[ev.id] && <button onClick={() => { setTab("drive"); setDriveSearch(ev.title); fetchDrive("search", ev.title); }} style={{ padding: "8px 16px", background: T.calGreenBg, color: T.calGreen, border: `1px solid ${T.calGreenBorder}`, borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Prepare</button>}
                          <button onClick={() => setPreppedEvents(prev => { const n = { ...prev }; if (n[ev.id]) delete n[ev.id]; else n[ev.id] = true; return n; })} style={{ padding: "8px 16px", background: preppedEvents[ev.id] ? T.calGreenBg : T.bg, color: preppedEvents[ev.id] ? T.calGreen : T.textMuted, border: `1px solid ${preppedEvents[ev.id] ? T.calGreenBorder : T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                            {preppedEvents[ev.id] ? "✓ Prepped" : "Prep Done"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: 15, color: T.textMuted }}>{emails.length} unread · sorted by most recent · drag to reclassify</div>
              {nextPage && <button onClick={() => fetchData(nextPage)} style={{ padding: "6px 16px", background: T.emailBlueBg, color: T.emailBlue, border: `1px solid ${T.emailBlueBorder}`, borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Load More</button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
              {sortedBuckets.map(([bucket, bucketEmails]) => {
                const info = BUCKETS[bucket] || { label: bucket, icon: "📧", color: T.textMuted, bg: T.bg, border: T.border };
                const isOver = dragOverEmailBucket === bucket;
                const canBatchDelete = ["automated", "calendar-notif", "docs-activity", "classy-recurring"].includes(bucket);
                return (
                  <div key={bucket}
                    onDragOver={e => { e.preventDefault(); setDragOverEmailBucket(bucket); }}
                    onDragLeave={() => setDragOverEmailBucket(null)}
                    onDrop={e => {
                      e.preventDefault();
                      if (draggingEmail && draggingEmail.id) {
                        setEmailBucketOverrides(prev => ({ ...prev, [draggingEmail.id]: bucket }));
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 17 }}>{info.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: info.color }}>{info.label}</span>
                        <span style={{ fontSize: 13, color: info.color, background: info.bg, padding: "2px 9px", borderRadius: 6, fontWeight: 600 }}>{bucketEmails.length}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => batchAction("markRead", bucketEmails.map(e => e.id))} style={{ padding: "4px 10px", background: "transparent", color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 5, cursor: "pointer", fontSize: 12 }}>Read all</button>
                        {canBatchDelete && <button onClick={() => batchAction("trash", bucketEmails.map(e => e.id))} style={{ padding: "4px 10px", background: "transparent", color: T.danger, border: `1px solid ${T.urgentCoralBorder}`, borderRadius: 5, cursor: "pointer", fontSize: 12 }}>Delete all</button>}
                      </div>
                    </div>
                    {/* Email cards */}
                    {bucketEmails.length === 0 && (
                      <div style={{ fontSize: 14, color: T.textDim, textAlign: "center", padding: "16px 0" }}>Drop emails here</div>
                    )}
                    {bucketEmails.map((e, i) => (
                      <div key={e.id}
                        draggable
                        onDragStart={() => setDraggingEmail(e)}
                        onDragEnd={() => { setDraggingEmail(null); setDragOverEmailBucket(null); }}
                        style={{ cursor: "grab" }}>
                        {renderEmailRow(e, i)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: T.info }}>Drafts</span>
                {draftsTotal > 0 && <span style={{ fontSize: 14, color: T.info, background: T.infoBg, padding: "3px 11px", borderRadius: 8, fontWeight: 600 }}>{draftsTotal} total</span>}
              </div>
              <button onClick={fetchDrafts} style={{ padding: "8px 18px", background: T.infoBg, color: T.info, border: `1px solid ${T.info}30`, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>Refresh</button>
            </div>
            {drafts.length === 0 ? (
              <div style={{ padding: 44, textAlign: "center", color: T.textMuted, background: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 17, marginBottom: 8 }}>Loading drafts...</div>
                <div style={{ fontSize: 15 }}>If nothing appears, click Refresh above</div>
              </div>
            ) : drafts.map(d => {
              const isEditing = editingDraft?.id === d.id;
              return (
              <div key={d.id} style={{ background: T.card, border: `1px solid ${isEditing ? T.info : T.border}`, borderRadius: 10, padding: "18px 22px", marginBottom: 12 }}>
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
        {tab === "sticky" && (
          <div>
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

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* ═══════════ GOOGLE DOC MODAL ═══════════ */}
      {docModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: T.card, borderRadius: 14, padding: "28px 32px", width: 480, maxWidth: "92vw", boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>📄 Save as Google Doc</div>
            <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 20 }}>"{docModal.title}"</div>
            <label style={{ fontSize: 14, fontWeight: 600, color: T.text, display: "block", marginBottom: 6 }}>
              Save to folder <span style={{ fontWeight: 400, color: T.textMuted }}>(paste Drive folder URL or leave blank for My Drive)</span>
            </label>
            <input
              value={docFolderUrl}
              onChange={e => setDocFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              style={{ width: "100%", padding: "11px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, marginBottom: 20, boxSizing: "border-box", outline: "none", color: T.text, background: T.bg }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                disabled={docSaving}
                onClick={async () => {
                  setDocSaving(true);
                  let folderId = null;
                  const m = docFolderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
                  if (m) folderId = m[1];
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
                    setDocModal(null);
                    setDocFolderUrl("");
                  } else {
                    showToast("Failed: " + (data.error || "Unknown error"));
                  }
                }}
                style={{ flex: 1, padding: "11px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, cursor: docSaving ? "default" : "pointer", fontWeight: 600, fontSize: 15 }}
              >{docSaving ? "Creating..." : "Create Doc & Open"}</button>
              <button onClick={() => { setDocModal(null); setDocFolderUrl(""); }} style={{ padding: "11px 20px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15 }}>Cancel</button>
            </div>
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
                onChange={e => setHsContactSearch(e.target.value)}
                placeholder="Name or email..."
                onKeyDown={async e => {
                  if (e.key === "Enter" && hsContactSearch.trim()) {
                    const r = await fetch(`/api/hubspot-search?q=${encodeURIComponent(hsContactSearch)}`);
                    const d = await r.json();
                    setHsContacts(d.contacts || []);
                  }
                }}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, outline: "none", color: T.text, background: T.bg }}
              />
              <button onClick={async () => {
                if (!hsContactSearch.trim()) return;
                const r = await fetch(`/api/hubspot-search?q=${encodeURIComponent(hsContactSearch)}`);
                const d = await r.json();
                setHsContacts(d.contacts || []);
              }} style={{ padding: "10px 16px", background: T.infoBg, color: T.info, border: `1px solid ${T.info}30`, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>Search</button>
            </div>
            {hsContacts.length > 0 && (
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 16, maxHeight: 180, overflowY: "auto" }}>
                {hsContacts.map(c => (
                  <div key={c.id} onClick={() => { setHsContactId(c.id); setHsContacts([]); setHsContactSearch(c.label); }}
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
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contactId: hsContactId, note: hsModal.note, subject: hsModal.subject }),
                  });
                  const data = await r.json();
                  setHsSaving(false);
                  if (data.id || data.status === "ok") {
                    showToast("Logged to HubSpot!");
                    setHsModal(null);
                    setHsContactId("");
                    setHsContactSearch("");
                  } else {
                    showToast("Failed: " + (data.error || "Unknown error"));
                  }
                }}
                style={{ flex: 1, padding: "11px", background: hsContactId ? "#FF7A59" : T.border, color: hsContactId ? "#fff" : T.textMuted, border: "none", borderRadius: 8, cursor: hsContactId && !hsSaving ? "pointer" : "default", fontWeight: 600, fontSize: 15 }}
              >{hsSaving ? "Logging..." : "Log Note"}</button>
              <button onClick={() => { setHsModal(null); setHsContactId(""); setHsContactSearch(""); setHsContacts([]); }} style={{ padding: "11px 20px", background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15 }}>Cancel</button>
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
              { key: "e", desc: "Archive focused email" },
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

      <LightbulbFAB />
    </>
  );
}
