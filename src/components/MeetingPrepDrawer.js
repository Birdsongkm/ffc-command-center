import { useState, useEffect, useCallback } from 'react';

/**
 * MeetingPrepDrawer — right-side drawer for external meeting prep briefs.
 *
 * Props:
 *   event — calendar event object (from Google Calendar API)
 *   T — theme object
 *   onClose — callback to close drawer
 *   showToast — callback for toast messages
 */

function ConfidenceChip({ level, T }) {
  const colors = {
    high: { bg: '#D4EDDA', text: '#155724', label: 'High' },
    med: { bg: '#FFF3CD', text: '#856404', label: 'Med' },
    low: { bg: '#F8D7DA', text: '#721C24', label: 'Low' },
  };
  const c = colors[level] || colors.low;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: c.bg, color: c.text }}>{c.label}</span>
  );
}

function SourcePill({ name, status, T }) {
  const statusColors = {
    loaded: { bg: '#D4EDDA', text: '#155724' },
    partial: { bg: '#FFF3CD', text: '#856404' },
    failed: { bg: '#F8D7DA', text: '#721C24' },
    'timed-out': { bg: '#F8D7DA', text: '#721C24' },
    skipped: { bg: '#E2E3E5', text: '#383D41' },
    loading: { bg: '#CCE5FF', text: '#004085' },
  };
  const c = statusColors[status] || statusColors.loading;
  return (
    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, marginRight: 4 }}>
      {name}: {status}
    </span>
  );
}

function Skeleton({ width, height, T }) {
  return (
    <div style={{ width: width || '100%', height: height || 16, background: T.border, borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
  );
}

function Citation({ citation, T }) {
  if (!citation) return null;
  const [type, id] = citation.split(':');
  const labels = { msg: 'Gmail', cal: 'Calendar', drive: 'Drive', email: 'Email' };
  return (
    <span style={{ fontSize: 10, color: T.textDim, marginLeft: 6, fontStyle: 'italic' }}>
      [{labels[type] || type}]
    </span>
  );
}

function BriefSection({ title, children, T, loading }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{title}</div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton T={T} width="90%" />
          <Skeleton T={T} width="70%" />
        </div>
      ) : (
        <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5 }}>{children}</div>
      )}
    </div>
  );
}

export default function MeetingPrepDrawer({ event, T, onClose, showToast }) {
  const [briefs, setBriefs] = useState({}); // keyed by attendee email
  const [loading, setLoading] = useState(true);
  const [docInfo, setDocInfo] = useState({}); // keyed by attendee email: { docId, docUrl, ... }
  const [manualContext, setManualContext] = useState('');
  const [savingContext, setSavingContext] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [staleWarning, setStaleWarning] = useState(false);

  // Find external attendees
  const externalAttendees = (event?.attendees || [])
    .filter(a => {
      const e = (a.email || '').toLowerCase().trim();
      return e && !e.endsWith('@freshfoodconnect.org') && !e.endsWith('@ffc.org');
    })
    .map(a => ({ email: a.email.toLowerCase().trim(), displayName: a.displayName || '' }));

  // Research all external attendees on mount
  useEffect(() => {
    if (!event || externalAttendees.length === 0) return;
    setDrawerOpened(true);

    const fetchAll = async () => {
      setLoading(true);
      const results = {};
      const docs = {};

      for (const att of externalAttendees) {
        try {
          // Parallel: research + ensure doc
          const [researchRes, docRes] = await Promise.all([
            fetch('/api/person-research', {
              method: 'POST', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: att.email, name: att.displayName, eventId: event.id }),
            }),
            fetch('/api/meeting-prep', {
              method: 'POST', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'ensureDoc', email: att.email, name: att.displayName }),
            }),
          ]);

          if (researchRes.ok) {
            const data = await researchRes.json();
            results[att.email] = data;

            // Check staleness (>14 days)
            if (data.generatedAt) {
              const age = (Date.now() - new Date(data.generatedAt).getTime()) / (1000 * 60 * 60 * 24);
              if (age > 14) setStaleWarning(true);
            }
          }

          if (docRes.ok) {
            const docData = await docRes.json();
            if (docData.privacyViolation) {
              showToast(docData.error);
            } else {
              docs[att.email] = docData;

              // Auto-append brief section to doc
              if (docData.docId && results[att.email]) {
                const meetingDate = (event.start?.dateTime || event.start?.date || '').slice(0, 10);
                await fetch('/api/meeting-prep', {
                  method: 'POST', credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'appendSection',
                    docId: docData.docId,
                    meetingDate,
                    briefData: results[att.email],
                  }),
                });
              }
            }
          }
        } catch (e) {
          console.error('MeetingPrepDrawer:fetch', { email: att.email, message: e.message });
        }
      }

      setBriefs(results);
      setDocInfo(docs);
      if (externalAttendees.length > 0) setSelectedPerson(externalAttendees[0].email);
      setLoading(false);
    };

    fetchAll();
  }, [event?.id]);

  const handleRefresh = async (email) => {
    const att = externalAttendees.find(a => a.email === email);
    if (!att) return;
    try {
      const r = await fetch('/api/person-research', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: att.email, name: att.displayName, eventId: event.id }),
      });
      if (r.ok) {
        const data = await r.json();
        setBriefs(prev => ({ ...prev, [email]: data }));
        showToast('Brief refreshed');
      }
    } catch (e) {
      showToast('Refresh failed: ' + e.message);
    }
  };

  const handleSaveManualContext = async () => {
    if (!selectedPerson || !manualContext.trim()) return;
    const doc = docInfo[selectedPerson];
    if (!doc?.docId) { showToast('No doc found'); return; }
    setSavingContext(true);
    try {
      const r = await fetch('/api/meeting-prep', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addManualContext', docId: doc.docId, text: manualContext.trim() }),
      });
      if (r.ok) {
        showToast('Context saved to doc');
        setManualContext('');
      }
    } catch (e) {
      showToast('Failed to save context');
    }
    setSavingContext(false);
  };

  const brief = selectedPerson ? briefs[selectedPerson] : null;
  const doc = selectedPerson ? docInfo[selectedPerson] : null;

  if (externalAttendees.length === 0) {
    return (
      <div style={{ position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: T.card, borderLeft: `1px solid ${T.border}`, zIndex: 1000, padding: 24, overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Meeting Prep</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.textMuted }}>✕</button>
        </div>
        <div style={{ textAlign: 'center', color: T.textMuted, padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <div>No external attendees — this is an internal meeting.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: T.card, borderLeft: `1px solid ${T.border}`, zIndex: 1000, overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Meeting Prep</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.textMuted }}>✕</button>
        </div>
        <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 10 }}>{event.summary}</div>

        {/* Source status pills */}
        {brief && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            <SourcePill name="Gmail" status={brief.sourceStatus?.gmail || 'loading'} T={T} />
            <SourcePill name="Drive" status={brief.sourceStatus?.drive || 'loading'} T={T} />
            <SourcePill name="Calendar" status={brief.sourceStatus?.calendar || 'loading'} T={T} />
            <span style={{ fontSize: 11, color: T.textDim, marginLeft: 4 }}>{brief.sourceSummary}</span>
          </div>
        )}

        {/* Person tabs (if multiple external attendees) */}
        {externalAttendees.length > 1 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {externalAttendees.map(att => (
              <button key={att.email} onClick={() => setSelectedPerson(att.email)}
                style={{
                  padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: selectedPerson === att.email ? T.accent : T.bg,
                  color: selectedPerson === att.email ? '#fff' : T.textMuted,
                  border: `1px solid ${selectedPerson === att.email ? T.accent : T.border}`,
                }}>
                {att.displayName || att.email.split('@')[0]}
              </button>
            ))}
          </div>
        )}

        {/* Generated timestamp + refresh */}
        {brief?.generatedAt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: T.textDim }}>
              Generated {Math.round((Date.now() - new Date(brief.generatedAt).getTime()) / 60000)}m ago
            </span>
            {staleWarning && <span style={{ fontSize: 11, color: '#856404', background: '#FFF3CD', padding: '2px 6px', borderRadius: 4 }}>Stale — refresh?</span>}
            <button onClick={() => handleRefresh(selectedPerson)} style={{ fontSize: 11, padding: '2px 8px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, cursor: 'pointer', color: T.textMuted }}>Refresh</button>
          </div>
        )}
      </div>

      {/* Body — brief sections */}
      <div style={{ flex: 1, padding: '18px 24px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {['Why this meeting', 'Last Contact', 'Identity', 'Organization', 'Relationship', 'Connections'].map(s => (
              <BriefSection key={s} title={s} T={T} loading={true} />
            ))}
          </div>
        ) : brief?.isSparse ? (
          /* Low-signal contact card */
          <div style={{ background: '#FFF3CD', border: '1px solid #FFE69C', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#856404', marginBottom: 10 }}>Low-Signal Contact</div>
            <div style={{ fontSize: 13, color: '#856404', marginBottom: 12, lineHeight: 1.5 }}>
              {['No prior email threads', 'No shared docs', 'No FFC giving history found'].map((m, i) => (
                <div key={i}>• {m}</div>
              ))}
            </div>
            <textarea
              placeholder="Add context manually before the meeting?"
              value={manualContext}
              onChange={e => setManualContext(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 10, border: '1px solid #FFE69C', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            {manualContext.trim() && (
              <button onClick={handleSaveManualContext} disabled={savingContext}
                style={{ marginTop: 8, padding: '8px 18px', background: '#856404', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {savingContext ? 'Saving...' : 'Save to prep doc'}
              </button>
            )}
          </div>
        ) : brief ? (
          <div>
            {/* Identity + Confidence */}
            <BriefSection title="Identity" T={T}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{brief.identity?.name || brief.identity?.email}</span>
                <ConfidenceChip level={brief.identity?.confidence} T={T} />
              </div>
              <div style={{ fontSize: 12, color: T.textDim }}>{brief.identity?.email}</div>
              {brief.identity?.confidence !== 'high' && brief.identity?.confidence !== undefined && brief.identity?.confidence === 'low' && (
                <div style={{ marginTop: 6, padding: '6px 10px', background: '#F8D7DA', borderRadius: 6, fontSize: 12, color: '#721C24' }}>
                  Identity unresolved — showing Gmail/Drive signals only.
                </div>
              )}
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>
                {brief.identity?.trail?.map((t, i) => <div key={i}>• {t}</div>)}
              </div>
            </BriefSection>

            {/* Why this meeting */}
            <BriefSection title="Why this meeting" T={T}>
              {brief.whyThisMeeting ? (
                <div>{brief.whyThisMeeting.text}<Citation citation={brief.whyThisMeeting.citation} T={T} /></div>
              ) : <div style={{ color: T.textDim, fontStyle: 'italic' }}>No meeting context found</div>}
            </BriefSection>

            {/* Last Contact */}
            <BriefSection title="Last Contact" T={T}>
              {brief.lastContact ? (
                <div>{brief.lastContact.text}<Citation citation={brief.lastContact.citation} T={T} /></div>
              ) : <div style={{ color: T.textDim, fontStyle: 'italic' }}>No prior email found</div>}
            </BriefSection>

            {/* Organization Overview */}
            {brief.orgOverview && (
              <BriefSection title="Organization" T={T}>
                <div>{brief.orgOverview.text}<Citation citation={brief.orgOverview.citation} T={T} /></div>
              </BriefSection>
            )}

            {/* Relationship with FFC */}
            <BriefSection title="Relationship with FFC" T={T}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                Stage: <span style={{ fontWeight: 600 }}>{brief.stage || 'unknown'}</span> · {brief.relationship?.threadCount || 0} threads
              </div>
              {brief.relationship?.donations?.length > 0 ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{brief.relationship.donations.length} donation signal(s):</div>
                  {brief.relationship.donations.slice(0, 3).map((d, i) => (
                    <div key={i} style={{ fontSize: 12, color: T.textMuted }}>• {d.subject}<Citation citation={d.citation} T={T} /></div>
                  ))}
                </div>
              ) : <div style={{ color: T.textDim, fontStyle: 'italic', fontSize: 13 }}>No FFC giving history found</div>}
            </BriefSection>

            {/* Connection Points */}
            <BriefSection title="Connections" T={T}>
              {brief.connectionPoints?.sharedDocs?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Shared Docs:</div>
                  {brief.connectionPoints.sharedDocs.slice(0, 3).map((d, i) => (
                    <div key={i} style={{ fontSize: 12 }}>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color: T.emailBlue }}>{d.name}</a>
                      <Citation citation={d.citation} T={T} />
                    </div>
                  ))}
                </div>
              )}
              {brief.connectionPoints?.mutualContacts?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Mutual Contacts:</div>
                  {brief.connectionPoints.mutualContacts.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ fontSize: 12, color: T.textMuted }}>{c.email} ({c.threadCount} shared threads)</div>
                  ))}
                </div>
              )}
              {brief.connectionPoints?.sharedThreadSubjects?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Recent Threads:</div>
                  {brief.connectionPoints.sharedThreadSubjects.slice(0, 3).map((t, i) => (
                    <div key={i} style={{ fontSize: 12, color: T.textMuted }}>
                      "{t.subject}" — {t.date}<Citation citation={t.citation} T={T} />
                    </div>
                  ))}
                </div>
              )}
              {(!brief.connectionPoints?.sharedDocs?.length && !brief.connectionPoints?.mutualContacts?.length && !brief.connectionPoints?.sharedThreadSubjects?.length) && (
                <div style={{ color: T.textDim, fontStyle: 'italic', fontSize: 13 }}>No connections found</div>
              )}
            </BriefSection>

            {/* Manual context */}
            <BriefSection title="Add Context" T={T}>
              <textarea
                placeholder="Add context manually before the meeting..."
                value={manualContext}
                onChange={e => setManualContext(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: 8, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: T.surface, color: T.text }}
              />
              {manualContext.trim() && (
                <button onClick={handleSaveManualContext} disabled={savingContext}
                  style={{ marginTop: 6, padding: '6px 14px', background: T.accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                  {savingContext ? 'Saving...' : 'Save to prep doc'}
                </button>
              )}
            </BriefSection>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: T.textMuted, padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <div>Failed to load brief data. Try refreshing.</div>
          </div>
        )}
      </div>

      {/* Footer — doc link */}
      {doc?.docUrl && (
        <div style={{ padding: '12px 24px', borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
          <a href={doc.docUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.emailBlue, textDecoration: 'none', fontWeight: 600 }}>
            📄 Open {doc.docName || 'Prep Doc'} in Drive
          </a>
        </div>
      )}
    </div>
  );
}
