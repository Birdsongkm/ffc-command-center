import { useState, useEffect } from "react";
import Head from "next/head";

// ── THEME ──
const T = {
  bg: "#111A11", surface: "#1A2619", card: "#1F2E1E", cardHover: "#263A24",
  border: "#2A3D28", borderLight: "#345232", text: "#D4DED0", textMuted: "#8FA889",
  textDim: "#5C7A54", accent: "#5CB85C", accentDark: "#3A8A3A", accentBg: "#1A3A1A",
  gold: "#D4A843", goldBg: "#2A2618", danger: "#CF6E6E", dangerBg: "#2E1A1A",
  info: "#6EAFCF", infoBg: "#1A2530", white: "#EAF0E8",
};

// ── CATEGORIES ──
const CATEGORIES = [
  { id: "fundraising", label: "Fundraising", color: "#9B8FE8", bg: "#1E1A30" },
  { id: "finance", label: "Finance", color: "#D4A843", bg: "#2A2618" },
  { id: "board", label: "Board", color: "#6EAFCF", bg: "#1A2530" },
  { id: "programs", label: "Programs", color: "#5CB85C", bg: "#1A2E1A" },
  { id: "admin", label: "Admin", color: "#8FA889", bg: "#1E261E" },
  { id: "external", label: "External", color: "#CF8A6E", bg: "#2A2018" },
  { id: "marketing", label: "Marketing", color: "#CF6EAF", bg: "#2A1A24" },
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
  { id: "critical", label: "Critical", color: "#CF6E6E", bg: "#2E1A1A", dot: "#FF5555" },
  { id: "high", label: "High", color: "#D4A843", bg: "#2A2618", dot: "#FFAA33" },
  { id: "medium", label: "Medium", color: "#6EAFCF", bg: "#1A2530", dot: "#55AAFF" },
  { id: "low", label: "Low", color: "#5C7A54", bg: "#1A261A", dot: "#5C7A54" },
];

// ── EMAIL CLASSIFICATION ──
const TIME_BLOCK_WORDS = /^(hold|block|focus|lunch|ooo|out of office|busy|personal|travel|break|no$|prep time|deep work|admin time|writing|heads down)/i;

function isRealMeeting(event) {
  if (TIME_BLOCK_WORDS.test((event.title || '').trim())) return false;
  if (!event.attendees || event.attendees.length <= 1) return false;
  return true;
}

function classifyEmail(e) {
  const from = (e.from || '').toLowerCase();
  const subj = (e.subject || '').toLowerCase();
  const snip = (e.snippet || '').toLowerCase();

  // Classy donations
  if (from.includes('classy') || from.includes('stayclassy')) {
    if (subj.includes('recurring') || snip.includes('recurring') || subj.includes('monthly')) return 'classy-recurring';
    return 'classy-onetime';
  }

  // Calendar notifications
  if (from.includes('calendar-notification') || from.includes('calendar.google.com') ||
    (subj.includes('accepted') && (subj.includes('invit') || subj.includes('event'))) ||
    (subj.includes('declined') && subj.includes('invit')) ||
    subj.startsWith('invitation:') || subj.startsWith('updated invitation:') ||
    (subj.includes('rsvp') && from.includes('google'))) return 'calendar-notif';

  // Google Docs activity
  if (from.includes('drive-shares') || from.includes('comments-noreply') ||
    (from.includes('google.com') && (subj.includes('shared') || subj.includes('edited'))) ||
    subj.includes('shared a document') || subj.includes('shared a file')) {
    if (subj.includes('mentioned you') || subj.includes('assigned you') || subj.includes('commented on')) return 'needs-response';
    return 'docs-activity';
  }

  // Team / internal
  if (from.includes('freshfoodconnect') || from.includes('laura lavid') || from.includes('gretchen') ||
    from.includes('carmen') || from.includes('adjoa') || from.includes('debbie nash') || from.includes('lone bryan')) return 'team';

  // Automated / app notifications
  if (from.includes('slack') || from.includes('asana') || from.includes('trello') || from.includes('notion') ||
    from.includes('quickbooks') || from.includes('intuit') || from.includes('hubspot') || from.includes('zapier') ||
    from.includes('github') || from.includes('zoom.us') || from.includes('canva') || from.includes('stripe') ||
    from.includes('paypal') || from.includes('square') || from.includes('docusign') || from.includes('dropbox') ||
    from.includes('monday.com') || from.includes('clickup') || from.includes('airtable') ||
    (from.includes('noreply') && !from.includes('classy') && !from.includes('google'))) return 'automated';

  // Newsletters
  if (e.listUnsubscribe || from.includes('newsletter') || from.includes('digest') ||
    from.includes('news@') || from.includes('updates@') || from.includes('hello@') ||
    from.includes('info@') || from.includes('marketing@') || from.includes('mailchimp') ||
    subj.includes('newsletter') || subj.includes('digest') || subj.includes('weekly roundup') ||
    subj.includes('monthly update')) return 'newsletter';

  return 'needs-response';
}

const BUCKET_CONFIG = [
  { id: 'needs-response', label: 'Needs your response', icon: '\u{1F4AC}', color: T.accent, batchAction: null },
  { id: 'classy-onetime', label: 'One-time donations', icon: '\u{1F381}', color: T.gold, batchAction: null },
  { id: 'team', label: 'Team / Internal', icon: '\u{1F465}', color: T.info, batchAction: null },
  { id: 'classy-recurring', label: 'Recurring donations', icon: '\u{1F501}', color: T.textMuted, batchAction: 'trash' },
  { id: 'calendar-notif', label: 'Calendar notifications', icon: '\u{1F4C5}', color: T.textMuted, batchAction: 'trash' },
  { id: 'docs-activity', label: 'Doc activity', icon: '\u{1F4C4}', color: T.textMuted, batchAction: 'trash' },
  { id: 'automated', label: 'Automated', icon: '\u{2699}\uFE0F', color: T.textMuted, batchAction: 'trash' },
  { id: 'newsletter', label: 'Newsletters', icon: '\u{1F4F0}', color: T.textDim, batchAction: null },
];

// ── QUICK REPLY TEMPLATES ──
function getQuickReplies(email) {
  const name = parseFrom(email.from).split(' ')[0];
  const bucket = classifyEmail(email);

  if (bucket === 'classy-onetime') return [
    `Hi ${name}, thank you so much for this generous gift! We truly appreciate your support of Fresh Food Connect.`,
    `Hi ${name}, this is wonderful - thank you! I'll make sure our team follows up with a proper acknowledgment.`,
    `Hi ${name}, got it, thank you! So grateful for the support.`,
  ];
  if (bucket === 'team') return [
    `Thanks ${name} - got it! Let me know if you need anything else from me.`,
    `Hi ${name}, thanks for the update. Let me review and I'll circle back.`,
    `${name} - sounds good, let's move forward with this.`,
  ];
  if (email.from?.toLowerCase().includes('board') || classifyCEOCategory(email.from, email.subject) === 'board') return [
    `Hi ${name}, thank you for this. I'll review and have an update for you by end of week.`,
    `Hi ${name}, appreciate you flagging this. Let me look into it and follow up.`,
    `Hi ${name}, got it - I'll add this to our next board meeting agenda.`,
  ];
  if (classifyCEOCategory(email.from, email.subject) === 'fundraising') return [
    `Hi ${name}, thank you for reaching out! I'd love to connect on this. How does your schedule look this week?`,
    `Hi ${name}, really appreciate you thinking of Fresh Food Connect. Let me review and get back to you shortly.`,
    `Hi ${name}, this is exciting - thank you! I'll loop in our development team on next steps.`,
  ];
  return [
    `Hi ${name}, thanks for reaching out! Let me look into this and get back to you.`,
    `Hi ${name}, got it - thanks for letting me know. I'll follow up shortly.`,
    `Hi ${name}, appreciate the heads up. Let me review and circle back this week.`,
  ];
}

// ── CEO CATEGORY (for badges) ──
function classifyCEOCategory(from, subject) {
  const text = `${from} ${subject}`.toLowerCase();
  if (/grant|foundation|fund|donat|donor|philanthrop|argosy|anschutz|morgridge|colorado trust|hfdk|beacon/i.test(text)) return "fundraising";
  if (/invoice|payment|budget|financial|payroll|quickbooks|credit card|expense|debbie|accounting/i.test(text)) return "finance";
  if (/board|governance|jack|ash/i.test(text)) return "board";
  if (/garden|operator|pickup|harvest|program|carmen|laura|pledge.*share|giving gnome/i.test(text)) return "programs";
  if (/marketing|social media|newsletter|press|adjoa|jamie|josh|campaign|mailchimp/i.test(text)) return "marketing";
  if (/partner|council|coalition|refed|usda|policy|denver.*gov|advocacy|cisco/i.test(text)) return "external";
  return "admin";
}

// ── HELPERS ──
function catStyle(id) { return CATEGORIES.find(x => x.id === id) || { label: id, color: T.textMuted, bg: T.card }; }
function urgStyle(id) { return URGENCY.find(x => x.id === id) || URGENCY[3]; }
function Badge({ catId }) {
  const s = catStyle(catId);
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: s.bg, color: s.color, fontWeight: 600, letterSpacing: "0.3px" }}>{s.label}</span>;
}
function UrgBadge({ level }) {
  const u = urgStyle(level);
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: u.bg, color: u.color, fontWeight: 600 }}>{u.label}</span>;
}

function formatTime(d) { if (!d) return ""; return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" }); }
function formatEmailDate(d) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d)) / 3600000;
  if (diff < 1) return `${Math.round(diff * 60)}m`;
  if (diff < 24) return `${Math.round(diff)}h`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function parseFrom(f) { const m = (f||'').match(/^"?([^"<]+)"?\s*<?/); return m ? m[1].trim() : f; }
function parseEmail(f) { const m = (f||'').match(/<([^>]+)>/); return m ? m[1] : f; }
function formatFileDate(d) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d)) / 3600000;
  if (diff < 1) return `${Math.round(diff * 60)}m ago`;
  if (diff < 24) return `${Math.round(diff)}h ago`;
  if (diff < 168) return `${Math.round(diff / 24)}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fileIcon(m) {
  if (!m) return "\u{1F4C4}";
  if (m.includes("spreadsheet")||m.includes("excel")) return "\u{1F4CA}";
  if (m.includes("presentation")||m.includes("powerpoint")) return "\u{1F4CA}";
  if (m.includes("document")||m.includes("word")) return "\u{1F4DD}";
  if (m.includes("pdf")) return "\u{1F4D5}";
  if (m.includes("folder")) return "\u{1F4C1}";
  if (m.includes("image")) return "\u{1F5BC}\uFE0F";
  return "\u{1F4C4}";
}
function fileTypeName(m) {
  if (!m) return "File";
  if (m.includes("spreadsheet")||m.includes("excel")) return "Sheet";
  if (m.includes("presentation")) return "Slides";
  if (m.includes("document")||m.includes("word")) return "Doc";
  if (m.includes("pdf")) return "PDF";
  if (m.includes("folder")) return "Folder";
  if (m.includes("image")) return "Image";
  return "File";
}

function useLocalStorage(key, init) {
  const [val, setVal] = useState(init);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s) setVal(JSON.parse(s)); } catch(e){} }, []);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }, [val]);
  return [val, setVal];
}

// ── FORM: TASK ──
function TaskForm({ onSave, onCancel, initial, compact }) {
  const [t, setT] = useState(initial?.title || "");
  const [c, setC] = useState(initial?.catId || "admin");
  const [d, setD] = useState(initial?.due || "");
  const [u, setU] = useState(initial?.urgency || "medium");
  const [n, setN] = useState(initial?.notes || "");
  const save = () => t.trim() && onSave({ title: t.trim(), catId: c, due: d, urgency: u, notes: n, id: initial?.id || Date.now().toString(), created: initial?.created || new Date().toISOString(), done: false });
  const inp = { background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, padding: "7px 10px", outline: "none" };
  return (
    <div style={{ background: T.card, borderRadius: 8, padding: 14, marginBottom: 10, border: `1px solid ${T.border}` }}>
      <input autoFocus placeholder="What needs to be done?" value={t} onChange={e=>setT(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()}
        style={{ ...inp, width:"100%", fontSize: 13, boxSizing:"border-box", marginBottom: 8 }} />
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom: 8 }}>
        <select value={c} onChange={e=>setC(e.target.value)} style={inp}>
          {CATEGORIES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <select value={u} onChange={e=>setU(e.target.value)} style={inp}>
          {URGENCY.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <input type="date" value={d} onChange={e=>setD(e.target.value)} style={inp} />
      </div>
      {!compact && <textarea placeholder="Notes..." value={n} onChange={e=>setN(e.target.value)} rows={2}
        style={{ ...inp, width:"100%", resize:"vertical", boxSizing:"border-box", marginBottom:8 }} />}
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={save} style={{ fontSize:12, padding:"6px 16px", borderRadius:6, background:T.accent, color:"#111", border:"none", cursor:"pointer", fontWeight:600 }}>Save</button>
        <button onClick={onCancel} style={{ fontSize:12, padding:"6px 16px", borderRadius:6, background:"transparent", border:`1px solid ${T.border}`, cursor:"pointer", color:T.textMuted }}>Cancel</button>
      </div>
    </div>
  );
}

// ── FORM: COMPOSE / REPLY ALL ──
function ComposeForm({ onSend, onCancel, replyTo, initialBody }) {
  const myEmail = 'kayla@freshfoodconnect.org';
  const replyAddr = replyTo ? (replyTo.replyTo || parseEmail(replyTo.from)) : "";
  const allTo = replyTo ? [replyAddr, ...(replyTo.to || '').split(',').map(e => parseEmail(e.trim())).filter(e => e && !e.includes(myEmail))].filter(Boolean).join(', ') : "";
  const allCc = replyTo ? (replyTo.cc || '').split(',').map(e => parseEmail(e.trim())).filter(e => e && !e.includes(myEmail)).join(', ') : "";

  const [to, setTo] = useState(replyTo ? allTo : "");
  const [cc, setCc] = useState(replyTo ? allCc : "");
  const [subject, setSubject] = useState(replyTo ? `Re: ${(replyTo.subject || "").replace(/^Re:\s*/i, "")}` : "");
  const [body, setBody] = useState(initialBody || "");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!to.trim() || !body.trim()) return;
    setSending(true);
    try {
      const payload = { to: to.trim(), cc: cc.trim(), subject, body };
      if (replyTo) { payload.threadId = replyTo.threadId; payload.inReplyTo = replyTo.messageId || replyTo.id; }
      const r = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.success) { onSend(); } else { alert('Send failed: ' + (d.error || 'Unknown')); }
    } catch (e) { alert('Error: ' + e.message); }
    setSending(false);
  };

  const inp = { background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, padding: "8px 10px", outline: "none", width: "100%", boxSizing: "border-box" };
  return (
    <div style={{ background: T.card, borderRadius: 8, padding: 14, marginBottom: 10, border: `1px solid ${T.accent}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 10 }}>{replyTo ? "Reply All" : "Compose"}</div>
      <input placeholder="To" value={to} onChange={e=>setTo(e.target.value)} style={{ ...inp, marginBottom: 6 }} />
      <input placeholder="Cc" value={cc} onChange={e=>setCc(e.target.value)} style={{ ...inp, marginBottom: 6 }} />
      <input placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} style={{ ...inp, marginBottom: 6 }} />
      <textarea autoFocus placeholder="Write your message..." value={body} onChange={e=>setBody(e.target.value)} rows={5}
        style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
      <div style={{ display:"flex", gap:6, marginTop:10 }}>
        <button onClick={send} disabled={sending}
          style={{ fontSize:12, padding:"7px 20px", borderRadius:6, background: sending?T.textDim:T.accent, color:"#111", border:"none", cursor: sending?"default":"pointer", fontWeight:700 }}>
          {sending ? "Sending..." : "Send"}
        </button>
        <button onClick={onCancel} style={{ fontSize:12, padding:"7px 16px", borderRadius:6, background:"transparent", border:`1px solid ${T.border}`, cursor:"pointer", color:T.textMuted }}>Cancel</button>
      </div>
    </div>
  );
}

// ── FORM: CALENDAR EVENT ──
function EventForm({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [attendees, setAttendees] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const r = await fetch('/api/calendar-actions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', event: { title: title.trim(), start: `${date}T${startTime}:00`, end: `${date}T${endTime}:00`, location, attendees: attendees ? attendees.split(',').map(e => e.trim()).filter(Boolean) : [] } })
      });
      const d = await r.json();
      if (d.success) { onSave(d.event); } else { alert('Failed: ' + (d.error || 'Unknown')); }
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  };
  const inp = { background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, padding: "8px 10px", outline: "none" };
  return (
    <div style={{ background: T.card, borderRadius: 8, padding: 14, marginBottom: 10, border: `1px solid ${T.info}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.info, marginBottom: 10 }}>New event</div>
      <input autoFocus placeholder="Event title" value={title} onChange={e=>setTitle(e.target.value)} style={{ ...inp, width:"100%", marginBottom:6, boxSizing:"border-box" }} />
      <div style={{ display:"flex", gap:6, marginBottom:6, flexWrap:"wrap" }}>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp} />
        <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} style={inp} />
        <span style={{ color:T.textDim, alignSelf:"center", fontSize:11 }}>to</span>
        <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} style={inp} />
      </div>
      <input placeholder="Location" value={location} onChange={e=>setLocation(e.target.value)} style={{ ...inp, width:"100%", marginBottom:6, boxSizing:"border-box" }} />
      <input placeholder="Attendees (emails, comma-separated)" value={attendees} onChange={e=>setAttendees(e.target.value)} style={{ ...inp, width:"100%", marginBottom:8, boxSizing:"border-box" }} />
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={save} disabled={saving} style={{ fontSize:12, padding:"7px 20px", borderRadius:6, background: saving?T.textDim:T.info, color:"#111", border:"none", cursor: saving?"default":"pointer", fontWeight:700 }}>{saving?"Creating...":"Create"}</button>
        <button onClick={onCancel} style={{ fontSize:12, padding:"7px 16px", borderRadius:6, background:"transparent", border:`1px solid ${T.border}`, cursor:"pointer", color:T.textMuted }}>Cancel</button>
      </div>
    </div>
  );
}

// ── MAIN APP ──
export default function Home() {
  const [tasks, setTasks] = useLocalStorage("ffc-tasks", []);
  const [preppedIds, setPreppedIds] = useLocalStorage("ffc-prepped", []);
  const [view, setView] = useState("today");
  const [showTF, setShowTF] = useState(false);
  const [tfInit, setTfInit] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [now, setNow] = useState(new Date());

  const [authenticated, setAuthenticated] = useState(false);
  const [emails, setEmails] = useState([]);
  const [calEvents, setCalEvents] = useState([]);
  const [weekEvents, setWeekEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextPage, setNextPage] = useState(null);
  const [totalEmails, setTotalEmails] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [compose, setCompose] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [weekAhead, setWeekAhead] = useState(false);

  const [driveFiles, setDriveFiles] = useState([]);
  const [driveView, setDriveView] = useState("recent");
  const [driveSearch, setDriveSearch] = useState("");
  const [driveLoading, setDriveLoading] = useState(false);

  const [expandedBuckets, setExpandedBuckets] = useState({});

  useEffect(() => { const i = setInterval(()=>setNow(new Date()), 60000); return ()=>clearInterval(i); }, []);

  const fetchData = (page) => fetch(page ? `/api/data?page=${page}` : '/api/data').then(r => r.json());

  useEffect(() => {
    fetchData().then(d => {
      setAuthenticated(d.authenticated);
      if (d.authenticated) { setEmails(d.emails || []); setCalEvents(d.events || []); setNextPage(d.nextPage || null); setTotalEmails(d.totalEmails || 0); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadMore = () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    fetchData(nextPage).then(d => { setEmails(p => [...p, ...(d.emails || [])]); setNextPage(d.nextPage || null); setLoadingMore(false); }).catch(() => setLoadingMore(false));
  };

  const refreshAll = () => {
    setLoading(true);
    fetchData().then(d => { setEmails(d.emails || []); setCalEvents(d.events || []); setNextPage(d.nextPage || null); setTotalEmails(d.totalEmails || 0); setLoading(false); }).catch(() => setLoading(false));
  };

  const fetchWeek = () => {
    fetch('/api/calendar-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'week' }) })
      .then(r => r.json()).then(d => { if (d.events) setWeekEvents(d.events); setWeekAhead(true); });
  };

  const emailAction = async (messageId, action) => {
    const r = await fetch('/api/email-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId, action }) });
    const d = await r.json();
    if (d.success) {
      if (action === 'trash' || action === 'archive') setEmails(p => p.filter(e => e.id !== messageId));
      else if (action === 'markRead') setEmails(p => p.map(e => e.id === messageId ? { ...e, unread: false } : e));
      showFeedback(action === 'trash' ? 'Deleted' : action === 'archive' ? 'Archived' : 'Done');
    }
  };

  const batchAction = async (ids, action) => {
    const r = await fetch('/api/email-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageIds: ids, action }) });
    const d = await r.json();
    if (d.success) {
      if (action === 'trash' || action === 'archive') setEmails(p => p.filter(e => !ids.includes(e.id)));
      else if (action === 'markRead') setEmails(p => p.map(e => ids.includes(e.id) ? { ...e, unread: false } : e));
      showFeedback(`${d.count} emails ${action === 'trash' ? 'deleted' : action === 'markRead' ? 'marked read' : 'done'}`);
    }
  };

  const showFeedback = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(null), 2500); };

  const fetchDrive = (action, q) => {
    setDriveLoading(true);
    let url = `/api/drive?action=${action}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    fetch(url).then(r => r.json()).then(d => { if (d.files) setDriveFiles(d.files); setDriveLoading(false); }).catch(() => setDriveLoading(false));
  };

  useEffect(() => { if (view === "drive" && authenticated) fetchDrive("recent"); }, [view, authenticated]);

  const dateStr = now.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", timeZone:"America/Denver" });
  const timeStr = now.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZone:"America/Denver" });
  const dayOfWeek = now.getDay();
  const showPrepButton = dayOfWeek >= 5 || dayOfWeek <= 1; // Fri-Mon

  const active = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const todayStr = now.toISOString().slice(0, 10);
  const todayTasks = active.filter(t => t.due === todayStr).sort((a, b) => URGENCY.findIndex(u => u.id === a.urgency) - URGENCY.findIndex(u => u.id === b.urgency));
  const unreadN = emails.filter(e => e.unread).length;
  const needsResponse = emails.filter(e => classifyEmail(e) === 'needs-response');
  const realMeetings = calEvents.filter(isRealMeeting);

  const addTask = (task) => { setTasks(p => [task, ...p]); setShowTF(false); setTfInit(null); };
  const toggle = (id) => setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const del = (id) => setTasks(p => p.filter(t => t.id !== id));
  const markPrepped = (eventId) => setPreppedIds(p => p.includes(eventId) ? p : [...p, eventId]);

  // ── STYLES ──
  const btnStyle = (isActive) => ({
    fontSize: 11, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontWeight: isActive ? 700 : 500, transition: "all 0.15s",
    border: isActive ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
    background: isActive ? T.accentBg : T.surface, color: isActive ? T.accent : T.textMuted,
  });
  const smallBtn = (onClick, label, color) => (
    <button onClick={onClick} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: `1px solid ${color || T.border}`, background: T.surface, cursor: "pointer", color: color || T.textMuted, fontWeight: 600 }}>{label}</button>
  );
  const sectionStyle = { background: T.card, borderRadius: 10, padding: 14, marginBottom: 12, border: `1px solid ${T.border}` };

  return (
    <>
      <Head>
        <title>FFC Command Center</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#111A11" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌿</text></svg>" />
        <style>{`* { box-sizing: border-box; } body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif; color:${T.text}; background:${T.bg}; } ::selection { background:${T.accentBg}; color:${T.accent}; } ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:${T.bg}; } ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; } input, select, textarea { color-scheme: dark; }`}</style>
      </Head>

      {feedback && (
        <div style={{ position:"fixed", top:12, right:12, background:T.accent, color:"#111", padding:"6px 16px", borderRadius:6, fontSize:11, fontWeight:700, zIndex:999 }}>{feedback}</div>
      )}

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 14px" }}>
        {/* Header */}
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0 10px", borderBottom:`1px solid ${T.border}`, flexWrap:"wrap", gap:6 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:T.accent, letterSpacing:"-0.3px" }}>FFC Command Center</div>
            <div style={{ fontSize:10, color:T.textDim, marginTop:1 }}>{dateStr} · {timeStr}</div>
          </div>
          <nav style={{ display:"flex", gap:3 }}>
            {["today","emails","calendar","tasks","drive"].map(v => (
              <button key={v} onClick={()=>setView(v)} style={btnStyle(view===v)}>
                {v === "today" ? "Today" : v === "emails" ? `Emails${unreadN>0?` (${unreadN})`:""}` : v === "tasks" ? `Tasks${active.length?` (${active.length})`:""}` : v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </nav>
        </header>

        {!loading && !authenticated && (
          <div style={{ textAlign:"center", padding:"30px 16px", background:T.card, borderRadius:10, margin:"14px 0", border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6, color:T.text }}>Connect your Google account</div>
            <div style={{ fontSize:11, color:T.textMuted, marginBottom:12 }}>Gmail, Calendar, and Drive — full read/write access</div>
            <a href="/api/auth/login" style={{ display:"inline-block", fontSize:12, padding:"8px 20px", borderRadius:6, background:T.accent, color:"#111", textDecoration:"none", fontWeight:700 }}>Connect Google</a>
          </div>
        )}

        {/* ═══ TODAY ═══ */}
        {view === "today" && (
          <main style={{ paddingTop: 12 }}>
            {/* Quick stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
              {[
                { label: "Meetings", val: realMeetings.length },
                { label: "Tasks due", val: todayTasks.length },
                { label: "Needs reply", val: needsResponse.length },
                { label: "Unread", val: unreadN },
              ].map((s,i) => (
                <div key={i} style={{ background:T.card, borderRadius:8, padding:"10px 12px", border:`1px solid ${T.border}`, textAlign:"center" }}>
                  <div style={{ fontSize:20, fontWeight:800, color:T.text }}>{s.val}</div>
                  <div style={{ fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.5px", marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Prep for next week button */}
            {showPrepButton && authenticated && (
              <button onClick={fetchWeek} style={{ width:"100%", padding:"10px", borderRadius:8, border:`1px solid ${T.gold}`, background:T.goldBg, color:T.gold, fontSize:12, fontWeight:700, cursor:"pointer", marginBottom:12 }}>
                Prep for next week →
              </button>
            )}

            {/* Week ahead prep */}
            {weekAhead && (
              <div style={{ ...sectionStyle, border:`1px solid ${T.gold}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.gold }}>Week ahead prep</div>
                  <button onClick={()=>setWeekAhead(false)} style={{ fontSize:10, color:T.textDim, background:"none", border:"none", cursor:"pointer" }}>Close</button>
                </div>
                {weekEvents.filter(isRealMeeting).length === 0 ? (
                  <div style={{ fontSize:11, color:T.textDim, padding:"8px 0" }}>No meetings needing prep this week</div>
                ) : weekEvents.filter(isRealMeeting).map(ev => {
                  const isPrepped = preppedIds.includes(ev.id);
                  return (
                    <div key={ev.id} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}`, alignItems:"center" }}>
                      <div style={{ width:6, height:6, borderRadius:3, background: isPrepped ? T.accent : T.gold, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color: isPrepped ? T.textMuted : T.text }}>{ev.title}</div>
                        <div style={{ fontSize:10, color:T.textDim }}>{new Date(ev.start).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/Denver"})} · {formatTime(ev.start)}</div>
                      </div>
                      <div style={{ display:"flex", gap:4, flexShrink:0, flexWrap:"wrap" }}>
                        {!isPrepped && smallBtn(()=>fetchDrive("search", ev.title), "Find agenda", T.info)}
                        {!isPrepped && smallBtn(()=>{}, "Create agenda", T.accent)}
                        {!isPrepped && smallBtn(()=>{setCompose("new");setView("emails");}, "Delegate", T.gold)}
                        <button onClick={()=>markPrepped(ev.id)} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, border:`1px solid ${isPrepped?T.accent:T.border}`, background: isPrepped?T.accentBg:T.surface, cursor:"pointer", color: isPrepped?T.accent:T.textMuted, fontWeight:600 }}>
                          {isPrepped ? "Prepped ✓" : "I'm prepped"}
                        </button>
                        {!isPrepped && smallBtn(()=>markPrepped(ev.id), "Skip", T.textDim)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Today's meetings */}
            <div style={sectionStyle}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>Today's meetings</div>
                {authenticated && <button onClick={()=>setShowEventForm(!showEventForm)} style={{ fontSize:10, padding:"3px 10px", borderRadius:5, border:`1px solid ${T.info}`, background:T.infoBg, cursor:"pointer", color:T.info, fontWeight:600 }}>+ Event</button>}
              </div>
              {showEventForm && <EventForm onSave={(evt) => { setCalEvents(p => [...p, { id: evt.id, title: evt.summary, start: evt.start?.dateTime, end: evt.end?.dateTime, location: evt.location || '', attendees: (evt.attendees||[]).map(a=>({email:a.email,name:'',status:''})), hangoutLink: evt.hangoutLink || '' }]); setShowEventForm(false); }} onCancel={()=>setShowEventForm(false)} />}
              {realMeetings.length === 0 ? (
                <div style={{ fontSize:11, color:T.textDim, padding:"6px 0" }}>{authenticated ? "No meetings today" : "Connect Google to see calendar"}</div>
              ) : realMeetings.map(ev => {
                const isPrepped = preppedIds.includes(ev.id);
                return (
                  <div key={ev.id} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}`, alignItems:"flex-start" }}>
                    <div style={{ width:6, height:6, borderRadius:3, background: isPrepped ? T.accent : T.gold, flexShrink:0, marginTop:5 }} />
                    <div style={{ minWidth:55, fontSize:11, color:T.textMuted, paddingTop:1 }}>{formatTime(ev.start)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600 }}>{ev.title}</div>
                      {ev.location && <div style={{ fontSize:10, color:T.textDim, marginTop:1 }}>{ev.location}</div>}
                      {ev.attendees && ev.attendees.length > 0 && <div style={{ fontSize:10, color:T.textDim, marginTop:1 }}>{ev.attendees.slice(0,3).map(a => a.name || a.email).join(', ')}{ev.attendees.length > 3 ? ` +${ev.attendees.length-3}` : ''}</div>}
                    </div>
                    <div style={{ display:"flex", gap:3, flexShrink:0, flexWrap:"wrap" }}>
                      {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, padding:"2px 7px", borderRadius:4, border:`1px solid ${T.info}`, background:T.infoBg, color:T.info, textDecoration:"none", fontWeight:600 }}>Join</a>}
                      {smallBtn(()=>fetchDrive("search", ev.title), "Agenda", T.accent)}
                      <button onClick={()=>markPrepped(ev.id)} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, border:`1px solid ${isPrepped?T.accent:T.border}`, background: isPrepped?T.accentBg:T.surface, cursor:"pointer", color: isPrepped?T.accent:T.textMuted, fontWeight:600 }}>{isPrepped?"✓":"Prep"}</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tasks due today */}
            {todayTasks.length > 0 && (
              <div style={sectionStyle}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Due today</div>
                {todayTasks.map(t => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
                    <input type="checkbox" checked={t.done} onChange={()=>toggle(t.id)} style={{ cursor:"pointer", accentColor:T.accent, width:14, height:14 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500 }}>{t.title}</div>
                      <div style={{ display:"flex", gap:4, marginTop:2 }}><Badge catId={t.catId} /><UrgBadge level={t.urgency} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Emails needing response */}
            {needsResponse.length > 0 && (
              <div style={sectionStyle}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Needs your reply ({needsResponse.length})</div>
                  <button onClick={()=>setView("emails")} style={{ fontSize:10, color:T.accent, background:"none", border:"none", cursor:"pointer" }}>All emails →</button>
                </div>
                {needsResponse.slice(0, 5).map(e => (
                  <div key={e.id} style={{ display:"flex", gap:8, padding:"6px 0", borderBottom:`1px solid ${T.border}`, alignItems:"center" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:e.unread?700:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{parseFrom(e.from)}</div>
                      <div style={{ fontSize:11, color:T.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.subject}</div>
                    </div>
                    <div style={{ fontSize:10, color:T.textDim, flexShrink:0 }}>{formatEmailDate(e.date)}</div>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}

        {/* ═══ EMAILS ═══ */}
        {view === "emails" && (
          <main style={{ paddingTop: 12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Email triage</div>
              <div style={{ display:"flex", gap:4 }}>
                {authenticated && <button onClick={()=>setCompose(compose==="new"?null:"new")} style={{ fontSize:10, padding:"4px 12px", borderRadius:5, border:`1px solid ${T.accent}`, background:T.accentBg, cursor:"pointer", color:T.accent, fontWeight:600 }}>Compose</button>}
                {authenticated && <button onClick={refreshAll} style={{ fontSize:10, padding:"4px 12px", borderRadius:5, border:`1px solid ${T.border}`, background:T.surface, cursor:"pointer", color:T.textMuted }}>Refresh</button>}
              </div>
            </div>

            {compose === "new" && <ComposeForm onSend={()=>{setCompose(null);refreshAll();}} onCancel={()=>setCompose(null)} />}

            {!authenticated ? (
              <div style={{ textAlign:"center", padding:40, color:T.textDim }}>
                <div style={{ fontSize:11 }}>Connect Google to see your emails</div>
                <a href="/api/auth/login" style={{ display:"inline-block", marginTop:8, fontSize:11, padding:"6px 16px", borderRadius:6, background:T.accent, color:"#111", textDecoration:"none", fontWeight:700 }}>Connect</a>
              </div>
            ) : emails.length === 0 ? (
              <div style={{ textAlign:"center", padding:40, color:T.textDim, fontSize:12 }}>Inbox zero!</div>
            ) : (
              <div>
                <div style={{ fontSize:10, color:T.textDim, marginBottom:10 }}>
                  {emails.length} loaded{totalEmails > emails.length ? ` of ~${totalEmails}` : ""} · {unreadN} unread
                </div>

                {BUCKET_CONFIG.map(bucket => {
                  const items = emails.filter(e => classifyEmail(e) === bucket.id);
                  if (items.length === 0) return null;
                  const isExpanded = expandedBuckets[bucket.id] !== false;
                  const isCompact = !!bucket.batchAction;

                  return (
                    <div key={bucket.id} style={{ ...sectionStyle, marginBottom:8 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
                        onClick={() => setExpandedBuckets(p => ({ ...p, [bucket.id]: !isExpanded }))}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:12 }}>{bucket.icon}</span>
                          <span style={{ fontSize:12, fontWeight:700, color: bucket.color }}>{bucket.label}</span>
                          <span style={{ fontSize:10, color:T.textDim }}>({items.length})</span>
                        </div>
                        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                          {bucket.batchAction && <button onClick={(ev)=>{ev.stopPropagation();batchAction(items.map(e=>e.id), bucket.batchAction);}} style={{ fontSize:10, padding:"2px 8px", borderRadius:4, border:`1px solid ${T.danger}`, background:T.dangerBg, cursor:"pointer", color:T.danger, fontWeight:600 }}>Delete all</button>}
                          {!bucket.batchAction && items.some(e=>e.unread) && <button onClick={(ev)=>{ev.stopPropagation();batchAction(items.map(e=>e.id), 'markRead');}} style={{ fontSize:10, padding:"2px 8px", borderRadius:4, border:`1px solid ${T.border}`, background:T.surface, cursor:"pointer", color:T.textMuted, fontWeight:600 }}>Mark all read</button>}
                          <span style={{ fontSize:10, color:T.textDim }}>{isExpanded ? "▾" : "▸"}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop:8 }}>
                          {items.map(e => {
                            const cat = classifyCEOCategory(e.from, e.subject);
                            const isReplying = compose && typeof compose === 'object' && compose.id === e.id;

                            if (isCompact) {
                              return (
                                <div key={e.id} style={{ display:"flex", gap:8, padding:"4px 0", borderBottom:`1px solid ${T.border}`, alignItems:"center", opacity: e.unread ? 1 : 0.6 }}>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                      <span style={{ fontWeight:e.unread?600:400 }}>{parseFrom(e.from)}</span>
                                      <span style={{ color:T.textDim }}> — {e.subject}</span>
                                    </div>
                                  </div>
                                  <div style={{ fontSize:10, color:T.textDim, flexShrink:0 }}>{formatEmailDate(e.date)}</div>
                                  {smallBtn(()=>emailAction(e.id, 'trash'), '✕', T.danger)}
                                </div>
                              );
                            }

                            // Full card for needs-response, classy-onetime, team, newsletters
                            return (
                              <div key={e.id}>
                                <div style={{ display:"flex", gap:8, padding:"8px 0", borderBottom: isReplying?"none":`1px solid ${T.border}`, alignItems:"flex-start", opacity: e.unread ? 1 : 0.6 }}>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:6 }}>
                                      <div style={{ fontSize:11, fontWeight:e.unread?700:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{parseFrom(e.from)}</div>
                                      <div style={{ fontSize:10, color:T.textDim, flexShrink:0 }}>{formatEmailDate(e.date)}</div>
                                    </div>
                                    <div style={{ fontSize:12, fontWeight:e.unread?600:400, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.subject || "(no subject)"}</div>
                                    <div style={{ fontSize:10, color:T.textDim, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.snippet}</div>
                                    <div style={{ display:"flex", gap:4, marginTop:6, alignItems:"center", flexWrap:"wrap" }}>
                                      <Badge catId={cat} />
                                      {bucket.id === 'needs-response' && (
                                        <>
                                          {smallBtn(()=>{const r = getQuickReplies(e); setReplyBody(r[0]); setCompose(e);}, "Quick 1", T.accent)}
                                          {smallBtn(()=>{const r = getQuickReplies(e); setReplyBody(r[1]); setCompose(e);}, "Quick 2", T.accent)}
                                          {smallBtn(()=>{const r = getQuickReplies(e); setReplyBody(r[2]); setCompose(e);}, "Quick 3", T.accent)}
                                          {smallBtn(()=>{setReplyBody(""); setCompose(e);}, "Reply All", T.info)}
                                        </>
                                      )}
                                      {bucket.id !== 'needs-response' && smallBtn(()=>{setReplyBody(""); setCompose(e);}, "Reply All", T.info)}
                                      {smallBtn(()=>emailAction(e.id, e.unread ? 'markRead' : 'markUnread'), e.unread ? 'Read' : 'Unread')}
                                      {smallBtn(()=>emailAction(e.id, 'trash'), '✕', T.danger)}
                                      {bucket.id === 'newsletter' && e.listUnsubscribe && (
                                        <a href={e.listUnsubscribe.replace(/[<>]/g,'')} target="_blank" rel="noopener noreferrer"
                                          style={{ fontSize:10, padding:"2px 7px", borderRadius:4, border:`1px solid ${T.danger}`, background:T.dangerBg, color:T.danger, textDecoration:"none", fontWeight:600 }}>Unsub</a>
                                      )}
                                      <button onClick={()=>{setTfInit({title:`Re: ${e.subject}`,catId:cat,notes:`From: ${parseFrom(e.from)}`});setShowTF(true);setView("tasks");}}
                                        style={{ fontSize:10, padding:"2px 7px", borderRadius:4, border:`1px solid ${T.gold}`, background:T.goldBg, cursor:"pointer", color:T.gold, fontWeight:600 }}>Task</button>
                                    </div>
                                  </div>
                                </div>
                                {isReplying && <ComposeForm replyTo={e} initialBody={replyBody} onSend={()=>{setCompose(null);setReplyBody("");refreshAll();}} onCancel={()=>{setCompose(null);setReplyBody("");}} />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {nextPage && (
                  <div style={{ textAlign:"center", padding:"14px 0" }}>
                    <button onClick={loadMore} disabled={loadingMore}
                      style={{ fontSize:11, padding:"8px 24px", borderRadius:6, border:`1px solid ${T.accent}`, background:T.accentBg, cursor: loadingMore?"default":"pointer", color:T.accent, fontWeight:700 }}>
                      {loadingMore ? "Loading..." : "Load more"}
                    </button>
                  </div>
                )}
              </div>
            )}
            {showTF && <TaskForm initial={tfInit} onSave={addTask} onCancel={()=>{setShowTF(false);setTfInit(null);}} />}
          </main>
        )}

        {/* ═══ CALENDAR ═══ */}
        {view === "calendar" && (
          <main style={{ paddingTop: 12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Calendar</div>
              <div style={{ display:"flex", gap:4 }}>
                {authenticated && <button onClick={fetchWeek} style={{ fontSize:10, padding:"4px 12px", borderRadius:5, border:`1px solid ${T.gold}`, background:T.goldBg, cursor:"pointer", color:T.gold, fontWeight:600 }}>Week ahead</button>}
                {authenticated && <button onClick={()=>setShowEventForm(!showEventForm)} style={{ fontSize:10, padding:"4px 12px", borderRadius:5, border:`1px solid ${T.info}`, background:T.infoBg, cursor:"pointer", color:T.info, fontWeight:600 }}>+ Event</button>}
              </div>
            </div>
            {showEventForm && <EventForm onSave={(evt)=>{setCalEvents(p=>[...p,{id:evt.id,title:evt.summary,start:evt.start?.dateTime,end:evt.end?.dateTime,location:evt.location||'',attendees:(evt.attendees||[]).map(a=>({email:a.email,name:'',status:''})),hangoutLink:evt.hangoutLink||''}]);setShowEventForm(false);}} onCancel={()=>setShowEventForm(false)} />}

            {weekAhead && weekEvents.length > 0 && (
              <div style={{ ...sectionStyle, border:`1px solid ${T.gold}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.gold }}>Week ahead prep</div>
                  <button onClick={()=>setWeekAhead(false)} style={{ fontSize:10, color:T.textDim, background:"none", border:"none", cursor:"pointer" }}>Close</button>
                </div>
                {weekEvents.filter(isRealMeeting).map(ev => {
                  const isPrepped = preppedIds.includes(ev.id);
                  return (
                    <div key={ev.id} style={{ display:"flex", gap:8, padding:"6px 0", borderBottom:`1px solid ${T.border}`, alignItems:"center" }}>
                      <div style={{ width:6, height:6, borderRadius:3, background: isPrepped?T.accent:T.gold, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:600, color: isPrepped?T.textMuted:T.text }}>{ev.title}</div>
                        <div style={{ fontSize:10, color:T.textDim }}>{new Date(ev.start).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/Denver"})} · {formatTime(ev.start)}</div>
                      </div>
                      <button onClick={()=>markPrepped(ev.id)} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, border:`1px solid ${isPrepped?T.accent:T.border}`, background: isPrepped?T.accentBg:T.surface, cursor:"pointer", color: isPrepped?T.accent:T.textMuted, fontWeight:600 }}>{isPrepped?"Prepped ✓":"I'm prepped"}</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={sectionStyle}>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>Today</div>
              {calEvents.length === 0 ? (
                <div style={{ fontSize:11, color:T.textDim }}>{authenticated ? "No events today" : "Connect Google"}</div>
              ) : calEvents.map(ev => (
                <div key={ev.id} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}`, alignItems:"flex-start" }}>
                  <div style={{ width:3, borderRadius:2, background: isRealMeeting(ev)?T.accent:T.textDim, alignSelf:"stretch", minHeight:28, flexShrink:0 }} />
                  <div style={{ minWidth:55, fontSize:11, color:T.textMuted }}>{formatTime(ev.start)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color: isRealMeeting(ev)?T.text:T.textMuted }}>{ev.title}</div>
                    {ev.location && <div style={{ fontSize:10, color:T.textDim }}>{ev.location}</div>}
                  </div>
                  <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                    {ev.hangoutLink && <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, padding:"2px 7px", borderRadius:4, border:`1px solid ${T.info}`, background:T.infoBg, color:T.info, textDecoration:"none", fontWeight:600 }}>Join</a>}
                    {smallBtn(()=>{setTfInit({title:`Follow up: ${ev.title}`,catId:"admin"});setShowTF(true);}, "Task")}
                  </div>
                </div>
              ))}
            </div>
            {showTF && <TaskForm initial={tfInit} onSave={addTask} onCancel={()=>{setShowTF(false);setTfInit(null);}} />}
          </main>
        )}

        {/* ═══ TASKS ═══ */}
        {view === "tasks" && (
          <main style={{ paddingTop: 12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Tasks</div>
              <button onClick={()=>{setShowTF(true);setTfInit(null);}} style={{ fontSize:10, padding:"4px 12px", borderRadius:5, border:`1px solid ${T.accent}`, background:T.accentBg, cursor:"pointer", color:T.accent, fontWeight:600 }}>+ New task</button>
            </div>
            {showTF && <TaskForm initial={tfInit} onSave={addTask} onCancel={()=>{setShowTF(false);setTfInit(null);}} />}

            {/* Visual board */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:10 }}>
              {CATEGORIES.map(cat => {
                const catTasks = active.filter(t => t.catId === cat.id);
                return (
                  <div key={cat.id} style={{ background:T.card, borderRadius:10, border:`1px solid ${T.border}`, overflow:"hidden" }}>
                    <div style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:cat.color }} />
                        <span style={{ fontSize:12, fontWeight:700, color:cat.color }}>{cat.label}</span>
                      </div>
                      <span style={{ fontSize:10, color:T.textDim }}>{catTasks.length}</span>
                    </div>
                    <div style={{ padding:"8px 10px", minHeight:60 }}>
                      {catTasks.sort((a,b) => URGENCY.findIndex(u=>u.id===a.urgency) - URGENCY.findIndex(u=>u.id===b.urgency)).map(t => (
                        <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:6, padding:"5px 0", borderBottom:`1px solid ${T.border}` }}>
                          <input type="checkbox" checked={t.done} onChange={()=>toggle(t.id)} style={{ cursor:"pointer", accentColor:T.accent, width:13, height:13, marginTop:2 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:11, fontWeight:500 }}>{t.title}</div>
                            <div style={{ display:"flex", gap:3, marginTop:2 }}>
                              <UrgBadge level={t.urgency} />
                              {t.due && <span style={{ fontSize:9, color:T.textDim }}>{t.due}</span>}
                            </div>
                          </div>
                          <button onClick={()=>del(t.id)} style={{ fontSize:11, color:T.textDim, border:"none", background:"transparent", cursor:"pointer", padding:2 }}>✕</button>
                        </div>
                      ))}
                      {catTasks.length === 0 && <div style={{ fontSize:10, color:T.textDim, padding:"8px 0" }}>No tasks</div>}
                      <button onClick={()=>{setTfInit({catId:cat.id});setShowTF(true);}} style={{ fontSize:10, color:T.textDim, background:"none", border:"none", cursor:"pointer", padding:"6px 0", width:"100%" }}>+ Add</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {done.length > 0 && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.textDim, marginBottom:6, textTransform:"uppercase" }}>Completed ({done.length})</div>
                {done.slice(0,8).map(t => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 0", opacity:0.4 }}>
                    <input type="checkbox" checked onChange={()=>toggle(t.id)} style={{ cursor:"pointer", accentColor:T.accent, width:12, height:12 }} />
                    <span style={{ fontSize:10, textDecoration:"line-through", flex:1 }}>{t.title}</span>
                    <button onClick={()=>del(t.id)} style={{ fontSize:10, color:T.textDim, border:"none", background:"transparent", cursor:"pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}

        {/* ═══ DRIVE ═══ */}
        {view === "drive" && (
          <main style={{ paddingTop: 12 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:10 }}>Google Drive</div>
            {!authenticated ? (
              <div style={{ textAlign:"center", padding:40, color:T.textDim, fontSize:11 }}>
                Connect Google to access Drive
                <a href="/api/auth/login" style={{ display:"block", marginTop:8, fontSize:11, padding:"6px 16px", borderRadius:6, background:T.accent, color:"#111", textDecoration:"none", fontWeight:700, width:"fit-content", margin:"8px auto 0" }}>Connect</a>
              </div>
            ) : (
              <div>
                <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                  <input placeholder="Search files..." value={driveSearch} onChange={e=>setDriveSearch(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&driveSearch.trim()){setDriveView("search");fetchDrive("search",driveSearch.trim());}}}
                    style={{ flex:1, padding:"8px 10px", border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, background:T.surface, color:T.text, outline:"none" }} />
                  <button onClick={()=>{if(driveSearch.trim()){setDriveView("search");fetchDrive("search",driveSearch.trim());}}}
                    style={{ fontSize:11, padding:"6px 14px", borderRadius:6, background:T.accent, color:"#111", border:"none", cursor:"pointer", fontWeight:700 }}>Search</button>
                </div>
                <div style={{ display:"flex", gap:4, marginBottom:10 }}>
                  <button onClick={()=>{setDriveView("recent");fetchDrive("recent");setDriveSearch("");}} style={btnStyle(driveView==="recent")}>Recent</button>
                  <button onClick={()=>{setDriveView("starred");fetchDrive("starred");setDriveSearch("");}} style={btnStyle(driveView==="starred")}>Starred</button>
                  {driveView==="search" && <button style={btnStyle(true)}>Results</button>}
                </div>
                {driveLoading ? <div style={{ textAlign:"center", padding:30, color:T.textDim, fontSize:11 }}>Loading...</div>
                : driveFiles.length === 0 ? <div style={{ textAlign:"center", padding:30, color:T.textDim, fontSize:11 }}>No files found</div>
                : (
                  <div>
                    {driveFiles.map(f => (
                      <a key={f.id} href={f.webViewLink} target="_blank" rel="noopener noreferrer"
                        style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}`, alignItems:"center", textDecoration:"none", color:"inherit" }}>
                        <div style={{ fontSize:18, width:28, textAlign:"center", flexShrink:0 }}>{fileIcon(f.mimeType)}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.starred?"\u2B50 ":""}{f.name}</div>
                          <div style={{ display:"flex", gap:6, marginTop:2 }}>
                            <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:T.surface, color:T.textMuted }}>{fileTypeName(f.mimeType)}</span>
                            <span style={{ fontSize:9, color:T.textDim }}>{formatFileDate(f.modifiedTime)}</span>
                          </div>
                        </div>
                        <div style={{ fontSize:10, color:T.accent, flexShrink:0, fontWeight:600 }}>Open →</div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        )}

        <footer style={{ textAlign:"center", padding:"18px 0 12px", fontSize:9, color:T.textDim }}>
          FFC Command Center v5.0 · Fresh Food Connect
        </footer>
      </div>
    </>
  );
}
