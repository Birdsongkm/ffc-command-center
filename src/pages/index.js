import { useState, useEffect } from "react";
import Head from "next/head";

const CATEGORIES = [
  { id: "fundraising", label: "Fundraising", color: "#534AB7", bg: "#EEEDFE" },
  { id: "finance", label: "Finance", color: "#854F0B", bg: "#FAEEDA" },
  { id: "board", label: "Board", color: "#185FA5", bg: "#E6F1FB" },
  { id: "programs", label: "Programs", color: "#0F6E56", bg: "#E1F5EE" },
  { id: "admin", label: "Admin", color: "#5F5E5A", bg: "#F1EFE8" },
  { id: "external", label: "External Relations", color: "#993C1D", bg: "#FAECE7" },
  { id: "marketing", label: "Marketing", color: "#993556", bg: "#FBEAF0" },
];

const SEASONAL = {
  1: "OKR Planning (INTENSIVE) · Budget finalization · Colorado Gives follow-up · Annual review",
  2: "Strategic planning · Grant cycle ramp-up · Board meeting · Staff reviews",
  3: "Board meeting prep · Finance committee · ARPA quarterly report · Pledge to Share hard launch · Spring grant deadlines · Garden season planning",
  4: "Garden season launch · Operator outreach · HFDK report · Marketing ramp",
  5: "Board meeting · Grant reports · Operator assessments · Team travel",
  6: "Peak program season · Mid-year review · ReFED Summit · Silent auction",
  7: "Peak harvest · Mid-year reports · ARPA quarterly · Financial review",
  8: "Fall fundraising planning · Board meeting · Program operations",
  9: "Budget planning · Colorado Gives prep · ARPA quarterly · OKR mid-year",
  10: "Colorado Gives campaign · Year-end fundraising · Garden wrap-up",
  11: "Peak fundraising · Board meeting · Giving Tuesday · Colorado Gives",
  12: "Colorado Gives Day · Year-end close · Donor stewardship",
};

const TEAM = [
  { name: "Laura Lavid", initials: "LL" },
  { name: "Gretchen Roberts", initials: "GR" },
  { name: "Carmen Alcantara", initials: "CA" },
  { name: "Adjoa Kittoe", initials: "AK" },
  { name: "Debbie Nash", initials: "DN" },
  { name: "Lone Bryan", initials: "LB" },
];

// Auto-categorize emails by keywords
function categorizeEmail(from, subject) {
  const text = `${from} ${subject}`.toLowerCase();
  if (/grant|foundation|fund|donat|donor|philanthrop|argosy|anschutz|morgridge|colorado trust|hfdk|beacon/i.test(text)) return "fundraising";
  if (/invoice|payment|budget|financial|payroll|quickbooks|credit card|expense|debbie|accounting/i.test(text)) return "finance";
  if (/board|governance|jack|ash/i.test(text)) return "board";
  if (/garden|operator|pickup|harvest|program|carmen|laura|pledge.*share|giving gnome/i.test(text)) return "programs";
  if (/marketing|social media|newsletter|press|adjoa|jamie|josh|campaign|mailchimp/i.test(text)) return "marketing";
  if (/partner|council|coalition|refed|usda|policy|denver.*gov|advocacy|cisco/i.test(text)) return "external";
  return "admin";
}

function catStyle(id) {
  const c = CATEGORIES.find(x => x.id === id);
  return c || { label: id, color: "#5F5E5A", bg: "#F1EFE8" };
}

function Badge({ catId }) {
  const s = catStyle(catId);
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: s.bg, color: s.color, fontWeight: 500, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function urgency(due) {
  if (!due) return "later";
  const diff = (new Date(due + "T23:59:59") - new Date()) / 864e5;
  return diff < 0 ? "overdue" : diff < 7 ? "week" : diff < 30 ? "month" : "later";
}

const URG = {
  overdue: { color: "#E24B4A", label: "Overdue" },
  week: { color: "#EF9F27", label: "This week" },
  month: { color: "#378ADD", label: "This month" },
  later: { color: "#B4B2A9", label: "Later" },
};

function useLocalStorage(key, init) {
  const [val, setVal] = useState(init);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s) setVal(JSON.parse(s)); } catch(e){} }, []);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }, [val]);
  return [val, setVal];
}

function TaskForm({ onSave, onCancel, initial }) {
  const [t, setT] = useState(initial?.title || "");
  const [c, setC] = useState(initial?.catId || "admin");
  const [d, setD] = useState(initial?.due || "");
  const [n, setN] = useState(initial?.notes || "");
  const [a, setA] = useState(initial?.assignee || "me");
  const save = () => t.trim() && onSave({ title: t.trim(), catId: c, due: d, notes: n, assignee: a, id: initial?.id || Date.now().toString(), created: initial?.created || new Date().toISOString(), done: false, source: initial?.source || "manual" });
  return (
    <div style={{ background: "#f8f8f6", borderRadius: 10, padding: 16, marginBottom: 14 }}>
      <input autoFocus placeholder="What needs to be done?" value={t} onChange={e=>setT(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()}
        style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #ddd", borderRadius:8, fontSize:14, boxSizing:"border-box" }} />
      <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
        <select value={c} onChange={e=>setC(e.target.value)} style={{ fontSize:12, padding:"6px 10px", borderRadius:6, border:"1px solid #ddd" }}>
          {CATEGORIES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <input type="date" value={d} onChange={e=>setD(e.target.value)} style={{ fontSize:12, padding:"6px 10px", borderRadius:6, border:"1px solid #ddd" }} />
        <select value={a} onChange={e=>setA(e.target.value)} style={{ fontSize:12, padding:"6px 10px", borderRadius:6, border:"1px solid #ddd" }}>
          <option value="me">Me (Kayla)</option>
          {TEAM.map(x=><option key={x.initials} value={x.initials}>{x.name}</option>)}
        </select>
      </div>
      <textarea placeholder="Notes..." value={n} onChange={e=>setN(e.target.value)} rows={2}
        style={{ width:"100%", marginTop:8, fontSize:13, padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, resize:"vertical", boxSizing:"border-box" }} />
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <button onClick={save} style={{ fontSize:13, padding:"8px 20px", borderRadius:8, background:"#2D5016", color:"#fff", border:"none", cursor:"pointer", fontWeight:500 }}>Save</button>
        <button onClick={onCancel} style={{ fontSize:13, padding:"8px 20px", borderRadius:8, background:"transparent", border:"1px solid #ddd", cursor:"pointer", color:"#666" }}>Cancel</button>
      </div>
    </div>
  );
}

function NoteForm({ title, onSave, onCancel }) {
  const [t, setT] = useState("");
  return (
    <div style={{ background:"#f8f8f6", borderRadius:10, padding:16, marginBottom:14 }}>
      <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Notes: {title}</div>
      <textarea autoFocus value={t} onChange={e=>setT(e.target.value)} rows={5} placeholder="Type meeting notes..."
        style={{ width:"100%", fontSize:14, padding:"10px 12px", border:"1.5px solid #ddd", borderRadius:8, resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }} />
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <button onClick={()=>t.trim()&&onSave(t.trim())} style={{ fontSize:13, padding:"8px 20px", borderRadius:8, background:"#2D5016", color:"#fff", border:"none", cursor:"pointer", fontWeight:500 }}>Save</button>
        <button onClick={onCancel} style={{ fontSize:13, padding:"8px 20px", borderRadius:8, background:"transparent", border:"1px solid #ddd", cursor:"pointer", color:"#666" }}>Cancel</button>
      </div>
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" });
}

function formatEmailDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 3600000;
  if (diff < 1) return `${Math.round(diff * 60)}m ago`;
  if (diff < 24) return `${Math.round(diff)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseFrom(from) {
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  return match ? match[1].trim() : from;
}

export default function Home() {
  const [tasks, setTasks] = useLocalStorage("ffc-tasks", []);
  const [notes, setNotes] = useLocalStorage("ffc-notes", []);
  const [view, setView] = useState("home");
  const [showTF, setShowTF] = useState(false);
  const [tfInit, setTfInit] = useState(null);
  const [noteForm, setNoteForm] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [now, setNow] = useState(new Date());

  // Live data state
  const [authenticated, setAuthenticated] = useState(false);
  const [emails, setEmails] = useState([]);
  const [calEvents, setCalEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const i = setInterval(()=>setNow(new Date()), 30000); return ()=>clearInterval(i); }, []);

  // Fetch live data
  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(d => {
        setAuthenticated(d.authenticated);
        if (d.authenticated) {
          setEmails(d.emails || []);
          setCalEvents(d.events || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const month = now.getMonth() + 1;
  const dateStr = now.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric", timeZone:"America/Denver" });
  const timeStr = now.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZone:"America/Denver" });

  const active = tasks.filter(t=>!t.done);
  const done = tasks.filter(t=>t.done);
  const filtered = filterCat === "all" ? active : active.filter(t=>t.catId===filterCat);
  const grouped = {};
  for (const u of Object.keys(URG)) grouped[u] = filtered.filter(t=>urgency(t.due)===u);
  const overdueN = active.filter(t=>urgency(t.due)==="overdue").length;
  const unreadN = emails.filter(e=>e.unread).length;

  const addTask = (task) => { setTasks(prev=>[task,...prev]); setShowTF(false); setTfInit(null); };
  const toggle = (id) => setTasks(prev=>prev.map(t=>t.id===id?{...t,done:!t.done}:t));
  const del = (id) => setTasks(prev=>prev.filter(t=>t.id!==id));
  const saveNote = (meeting,text) => { setNotes(prev=>[{id:Date.now().toString(),meeting,text,date:new Date().toISOString()},...prev]); setNoteForm(null); };

  const typeColor = { external:"#534AB7", team:"#0F6E56", travel:"#888", personal:"#bbb", focus:"#378ADD", funder:"#854F0B" };

  const btnStyle = (isActive, accent) => ({
    fontSize:13, padding:"6px 14px", borderRadius:8, cursor:"pointer", fontWeight: isActive?600:400, transition:"all 0.15s",
    border: isActive ? `1.5px solid ${accent||"#2D5016"}` : "1px solid #e0e0de",
    background: isActive ? (accent?"#EEEDFE":"#f0f7ec") : "#fff",
    color: isActive ? (accent||"#2D5016") : "#777",
  });

  return (
    <>
      <Head>
        <title>FFC Command Center</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2D5016" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌱</text></svg>" />
        <style>{`* { box-sizing: border-box; } body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif; color:#222; background:#fff; }`}</style>
      </Head>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"0 16px" }}>
        {/* Header */}
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0 14px", borderBottom:"1.5px solid #eee", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:"#2D5016" }}>FFC Command Center</div>
            <div style={{ fontSize:12, color:"#999", marginTop:2 }}>{dateStr} · {timeStr}</div>
          </div>
          <nav style={{ display:"flex", gap:4 }}>
            <button onClick={()=>setView("home")} style={btnStyle(view==="home")}>Home</button>
            <button onClick={()=>setView("emails")} style={btnStyle(view==="emails")}>
              Emails{unreadN > 0 ? ` (${unreadN})` : ""}
            </button>
            <button onClick={()=>setView("tasks")} style={btnStyle(view==="tasks")}>Tasks{active.length?` (${active.length})`:""}</button>
            <button onClick={()=>setView("notes")} style={btnStyle(view==="notes")}>Notes</button>
          </nav>
        </header>

        {/* Connect Google prompt */}
        {!loading && !authenticated && (
          <div style={{ textAlign:"center", padding:"40px 20px", background:"#f8f8f6", borderRadius:12, margin:"20px 0" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🔗</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Connect your Google account</div>
            <div style={{ fontSize:13, color:"#666", marginBottom:16, maxWidth:400, margin:"0 auto 16px" }}>
              Link your Gmail and Google Calendar to see your real emails, meetings, and get AI-powered categorization.
            </div>
            <a href="/api/auth/login" style={{ display:"inline-block", fontSize:14, padding:"10px 24px", borderRadius:8, background:"#2D5016", color:"#fff", textDecoration:"none", fontWeight:500 }}>
              Connect Google
            </a>
          </div>
        )}

        {/* HOME */}
        {view==="home" && (
          <main style={{ paddingTop:16 }}>
            {/* Summary cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:18 }}>
              {[
                { label:"Meetings today", val: calEvents.length, sub:null },
                { label:"Open tasks", val:active.length, sub:overdueN>0?`${overdueN} overdue`:null, subColor:"#E24B4A" },
                { label:"Unread emails", val:unreadN, sub:null },
                { label:"Notes saved", val:notes.length, sub:null },
              ].map((c,i) => (
                <div key={i} style={{ background:"#f8f8f6", borderRadius:10, padding:"14px 16px" }}>
                  <div style={{ fontSize:11, color:"#999", textTransform:"uppercase", letterSpacing:"0.5px" }}>{c.label}</div>
                  <div style={{ fontSize:26, fontWeight:700, marginTop:4 }}>{c.val}</div>
                  {c.sub && <div style={{ fontSize:11, color:c.subColor||"#999", marginTop:2 }}>{c.sub}</div>}
                </div>
              ))}
            </div>

            {/* Calendar - live or placeholder */}
            <section style={{ border:"1px solid #eee", borderRadius:12, padding:18, marginBottom:18 }}>
              <h2 style={{ fontSize:15, fontWeight:700, margin:"0 0 14px" }}>Today's calendar</h2>
              {calEvents.length > 0 ? calEvents.map((e,i) => (
                <div key={e.id} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<calEvents.length-1?"1px solid #f0f0ee":"none", alignItems:"flex-start" }}>
                  <div style={{ width:3, borderRadius:2, background:"#0F6E56", alignSelf:"stretch", minHeight:36, flexShrink:0 }} />
                  <div style={{ minWidth:72, fontSize:13, color:"#888", paddingTop:2 }}>{formatTime(e.start)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:500 }}>{e.title}</div>
                    {e.location && <div style={{ fontSize:12, color:"#999", marginTop:2 }}>{e.location}</div>}
                  </div>
                  <div style={{ display:"flex", gap:4, flexShrink:0, flexDirection:"column" }}>
                    <button onClick={()=>setNoteForm(e.title)} style={{ fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", color:"#666" }}>Notes</button>
                    <button onClick={()=>{setTfInit({title:`Follow up: ${e.title}`,catId:"admin"});setShowTF(true);}} style={{ fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", color:"#666" }}>Task</button>
                  </div>
                </div>
              )) : (
                <div style={{ fontSize:13, color:"#999", padding:"10px 0" }}>
                  {authenticated ? "No meetings today" : "Connect Google to see your calendar"}
                </div>
              )}
              {noteForm && <NoteForm title={noteForm} onSave={t=>saveNote(noteForm,t)} onCancel={()=>setNoteForm(null)} />}
            </section>

            {/* Quick actions */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:18 }}>
              <button onClick={()=>{setShowTF(true);setTfInit(null);}} style={{ fontSize:13, padding:"8px 16px", borderRadius:8, border:"1.5px solid #2D5016", background:"#f0f7ec", cursor:"pointer", color:"#2D5016", fontWeight:500 }}>+ New task</button>
              <button onClick={()=>setNoteForm("Quick note")} style={{ fontSize:13, padding:"8px 16px", borderRadius:8, border:"1px solid #ddd", background:"#fff", cursor:"pointer", color:"#555" }}>Quick note</button>
              {authenticated && <button onClick={()=>setView("emails")} style={{ fontSize:13, padding:"8px 16px", borderRadius:8, border:"1px solid #ddd", background:"#fff", cursor:"pointer", color:"#555" }}>Triage emails →</button>}
            </div>
            {showTF && <TaskForm initial={tfInit} onSave={addTask} onCancel={()=>{setShowTF(false);setTfInit(null);}} />}

            {/* Task preview */}
            {active.length > 0 && (
              <section style={{ border:"1px solid #eee", borderRadius:12, padding:18, marginBottom:18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <h2 style={{ fontSize:15, fontWeight:700, margin:0 }}>Active tasks</h2>
                  <button onClick={()=>setView("tasks")} style={{ fontSize:12, color:"#2D5016", background:"none", border:"none", cursor:"pointer" }}>View all →</button>
                </div>
                {Object.entries(URG).map(([k,{color,label}]) => {
                  const items = active.filter(t=>urgency(t.due)===k).slice(0,3);
                  if(!items.length) return null;
                  return (
                    <div key={k} style={{ marginBottom:12 }}>
                      <div style={{ fontSize:11, fontWeight:700, color, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
                      {items.map(t=>(
                        <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0" }}>
                          <input type="checkbox" checked={t.done} onChange={()=>toggle(t.id)} style={{ cursor:"pointer", width:16, height:16, accentColor:"#2D5016" }} />
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:500 }}>{t.title}</div>
                            <div style={{ display:"flex", gap:6, marginTop:3, alignItems:"center" }}>
                              <Badge catId={t.catId} />
                              {t.due && <span style={{ fontSize:11, color:"#999" }}>{t.due}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>
            )}

            {/* Seasonal */}
            <section style={{ background:"#f8f8f6", borderRadius:12, padding:18, marginBottom:18 }}>
              <h2 style={{ fontSize:14, fontWeight:700, margin:"0 0 8px", color:"#2D5016" }}>
                {now.toLocaleDateString("en-US",{month:"long",timeZone:"America/Denver"})} seasonal focus
              </h2>
              <div style={{ fontSize:13, color:"#555", lineHeight:1.8 }}>{SEASONAL[month]}</div>
            </section>
          </main>
        )}

        {/* EMAILS */}
        {view==="emails" && (
          <main style={{ paddingTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h1 style={{ fontSize:18, fontWeight:700, margin:0 }}>Email triage</h1>
              {authenticated && (
                <button onClick={()=>{setLoading(true);fetch('/api/data').then(r=>r.json()).then(d=>{setEmails(d.emails||[]);setLoading(false);});}} style={{ fontSize:12, padding:"6px 14px", borderRadius:8, border:"1px solid #ddd", background:"#fff", cursor:"pointer", color:"#666" }}>Refresh</button>
              )}
            </div>
            {!authenticated ? (
              <div style={{ textAlign:"center", padding:60, color:"#bbb" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📧</div>
                <div style={{ fontSize:15, fontWeight:500 }}>Connect Google to see your emails</div>
                <a href="/api/auth/login" style={{ display:"inline-block", marginTop:12, fontSize:13, padding:"8px 20px", borderRadius:8, background:"#2D5016", color:"#fff", textDecoration:"none", fontWeight:500 }}>Connect Google</a>
              </div>
            ) : emails.length === 0 ? (
              <div style={{ textAlign:"center", padding:60, color:"#bbb" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>✨</div>
                <div style={{ fontSize:15, fontWeight:500 }}>Inbox zero!</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:12, color:"#999", marginBottom:12 }}>
                  {emails.length} emails · {unreadN} unread · Auto-categorized by your CEO categories
                </div>
                {emails.map(e => {
                  const cat = categorizeEmail(e.from, e.subject);
                  return (
                    <div key={e.id} style={{ display:"flex", gap:12, padding:"12px 0", borderBottom:"1px solid #f0f0ee", alignItems:"flex-start", opacity: e.unread ? 1 : 0.7 }}>
                      <div style={{ width:3, borderRadius:2, background:catStyle(cat).color, alignSelf:"stretch", minHeight:48, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                          <div style={{ fontSize:13, fontWeight: e.unread ? 700 : 500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {parseFrom(e.from)}
                          </div>
                          <div style={{ fontSize:11, color:"#999", flexShrink:0 }}>{formatEmailDate(e.date)}</div>
                        </div>
                        <div style={{ fontSize:14, fontWeight: e.unread ? 600 : 400, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {e.subject || "(no subject)"}
                        </div>
                        <div style={{ fontSize:12, color:"#999", marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {e.snippet}
                        </div>
                        <div style={{ display:"flex", gap:6, marginTop:6, alignItems:"center", flexWrap:"wrap" }}>
                          <Badge catId={cat} />
                          <button onClick={()=>{
                            setTfInit({ title: `Re: ${e.subject}`, catId: cat, notes: `From: ${parseFrom(e.from)}\n${e.snippet}`, source: "email" });
                            setShowTF(true);
                            setView("tasks");
                          }} style={{ fontSize:11, padding:"3px 10px", borderRadius:6, border:"1px solid #2D5016", background:"#f0f7ec", cursor:"pointer", color:"#2D5016", fontWeight:500 }}>
                            Create task
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {showTF && <TaskForm initial={tfInit} onSave={addTask} onCancel={()=>{setShowTF(false);setTfInit(null);}} />}
          </main>
        )}

        {/* TASKS */}
        {view==="tasks" && (
          <main style={{ paddingTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h1 style={{ fontSize:18, fontWeight:700, margin:0 }}>Tasks</h1>
              <button onClick={()=>{setShowTF(true);setTfInit(null);}} style={{ fontSize:13, padding:"8px 16px", borderRadius:8, background:"#2D5016", color:"#fff", border:"none", cursor:"pointer", fontWeight:500 }}>+ New task</button>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
              <button onClick={()=>setFilterCat("all")} style={btnStyle(filterCat==="all")}>All ({active.length})</button>
              {CATEGORIES.map(c=>{
                const n=active.filter(t=>t.catId===c.id).length;
                if(!n) return null;
                return <button key={c.id} onClick={()=>setFilterCat(c.id)} style={btnStyle(filterCat===c.id, c.color)}>{c.label} ({n})</button>;
              })}
            </div>
            {showTF && <TaskForm initial={tfInit} onSave={addTask} onCancel={()=>{setShowTF(false);setTfInit(null);}} />}
            {Object.entries(URG).map(([k,{color,label}])=>{
              const items=grouped[k]; if(!items?.length) return null;
              return (
                <div key={k} style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, color, marginBottom:8, paddingBottom:6, borderBottom:`2px solid ${color}`, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label} ({items.length})</div>
                  {items.map(t=>(
                    <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 0", borderBottom:"1px solid #f5f5f3" }}>
                      <input type="checkbox" checked={t.done} onChange={()=>toggle(t.id)} style={{ marginTop:3, cursor:"pointer", width:16, height:16, accentColor:"#2D5016" }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:500 }}>{t.title}</div>
                        <div style={{ display:"flex", gap:6, marginTop:4, alignItems:"center", flexWrap:"wrap" }}>
                          <Badge catId={t.catId} />
                          {t.due && <span style={{ fontSize:11, color:"#999" }}>Due {t.due}</span>}
                          {t.assignee&&t.assignee!=="me" && <span style={{ fontSize:11, color:"#999", background:"#f0f0ee", padding:"1px 6px", borderRadius:4 }}>→ {t.assignee}</span>}
                        </div>
                        {t.notes && <div style={{ fontSize:12, color:"#777", marginTop:6, lineHeight:1.5 }}>{t.notes}</div>}
                      </div>
                      <button onClick={()=>del(t.id)} style={{ fontSize:14, color:"#ddd", border:"none", background:"transparent", cursor:"pointer", padding:4 }}>✕</button>
                    </div>
                  ))}
                </div>
              );
            })}
            {filtered.length===0&&!showTF && (
              <div style={{ textAlign:"center", padding:60, color:"#bbb" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🌱</div>
                <div style={{ fontSize:15, fontWeight:500 }}>No tasks yet</div>
                <div style={{ fontSize:13, marginTop:4 }}>Create your first task to get started</div>
              </div>
            )}
            {done.length>0 && (
              <div style={{ marginTop:24 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#bbb", marginBottom:8, textTransform:"uppercase" }}>Completed ({done.length})</div>
                {done.slice(0,10).map(t=>(
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", opacity:0.5 }}>
                    <input type="checkbox" checked onChange={()=>toggle(t.id)} style={{ cursor:"pointer", accentColor:"#2D5016" }} />
                    <span style={{ fontSize:13, textDecoration:"line-through", flex:1 }}>{t.title}</span>
                    <button onClick={()=>del(t.id)} style={{ fontSize:12, color:"#ddd", border:"none", background:"transparent", cursor:"pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}

        {/* NOTES */}
        {view==="notes" && (
          <main style={{ paddingTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h1 style={{ fontSize:18, fontWeight:700, margin:0 }}>Meeting notes</h1>
              <button onClick={()=>setNoteForm("Quick note")} style={{ fontSize:13, padding:"8px 16px", borderRadius:8, background:"#2D5016", color:"#fff", border:"none", cursor:"pointer", fontWeight:500 }}>+ New note</button>
            </div>
            {noteForm && <NoteForm title={noteForm} onSave={t=>saveNote(noteForm,t)} onCancel={()=>setNoteForm(null)} />}
            {notes.length===0&&!noteForm && (
              <div style={{ textAlign:"center", padding:60, color:"#bbb" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📝</div>
                <div style={{ fontSize:15, fontWeight:500 }}>No notes yet</div>
                <div style={{ fontSize:13, marginTop:4 }}>Click Notes on any calendar event to start</div>
              </div>
            )}
            {notes.map(n=>(
              <div key={n.id} style={{ border:"1px solid #eee", borderRadius:10, padding:16, marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{n.meeting}</div>
                  <div style={{ fontSize:11, color:"#999" }}>{new Date(n.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                </div>
                <div style={{ fontSize:13, color:"#555", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{n.text}</div>
                <button onClick={()=>{setTfInit({title:`Follow up: ${n.meeting}`,catId:"external",notes:n.text.slice(0,200)});setShowTF(true);setView("tasks");}}
                  style={{ fontSize:11, marginTop:10, padding:"4px 12px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", color:"#666" }}>Create task from this</button>
              </div>
            ))}
          </main>
        )}

        <footer style={{ textAlign:"center", padding:"24px 0 16px", fontSize:11, color:"#ccc" }}>
          FFC Command Center v2.0 · Built for Kayla Birdsong · Fresh Food Connect
        </footer>
      </div>
    </>
  );
}
