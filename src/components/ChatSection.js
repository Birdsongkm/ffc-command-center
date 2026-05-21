import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ChatSection — Gmail-style chat popup docked to bottom-right.
 * Always visible as a minimized bar. Expands to show conversation list + thread.
 * Provider-agnostic — works with any provider that implements the plugin contract.
 *
 * Props: T (theme), showToast, auth
 */

const PROVIDERS = [
  { id: 'google-chat', name: 'Google Chat', apiPath: '/api/chat/google', icon: '💬' },
  { id: 'slack', name: 'Slack', apiPath: '/api/chat/slack', icon: '🟣' },
];

export default function ChatSection({ T, showToast, auth }) {
  const [expanded, setExpanded] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composing, setComposing] = useState('');
  const [sending, setSending] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch conversations when expanded
  useEffect(() => {
    if (!auth || !expanded || conversations.length > 0) return;
    setLoading(true);
    const fetchAll = async () => {
      const allConvos = [];
      const connected = [];
      for (const p of PROVIDERS) {
        try {
          const r = await fetch(`${p.apiPath}?action=conversations`, { credentials: 'include' });
          const d = await r.json();
          if (d.conversations?.length >= 0 && !d.error) {
            allConvos.push(...d.conversations);
            connected.push(p.id);
          }
        } catch {}
      }
      allConvos.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        const aT = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bT = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bT - aT;
      });
      setConversations(allConvos);
      setConnectedProviders(connected);
      setLoading(false);
    };
    fetchAll();
  }, [auth, expanded]);

  const selectConvo = useCallback(async (convo) => {
    setSelectedConvo(convo);
    setMessages([]);
    setLoadingMessages(true);
    const provider = PROVIDERS.find(p => p.id === convo.provider);
    if (!provider) { setLoadingMessages(false); return; }
    try {
      const r = await fetch(`${provider.apiPath}?action=messages&conversationId=${encodeURIComponent(convo.id)}`, { credentials: 'include' });
      const d = await r.json();
      const msgs = (d.messages || []).sort((a, b) => {
        const aT = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bT = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return aT - bT;
      });
      setMessages(msgs);
    } catch (e) {
      showToast('Failed to load messages');
    }
    setLoadingMessages(false);
  }, [showToast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!composing.trim() || !selectedConvo || sending) return;
    setSending(true);
    const provider = PROVIDERS.find(p => p.id === selectedConvo.provider);
    if (!provider) { setSending(false); return; }
    try {
      const r = await fetch(provider.apiPath, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', conversationId: selectedConvo.id, text: composing.trim() }),
      });
      const d = await r.json();
      if (d.message) { setMessages(prev => [...prev, d.message]); setComposing(''); }
      else showToast(d.error || 'Failed to send');
    } catch (e) { showToast('Send failed'); }
    setSending(false);
  };

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  const fmtTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Minimized bar
  if (!expanded) {
    return (
      <div onClick={() => setExpanded(true)} style={{
        position: 'fixed', bottom: 0, right: 24, width: 280,
        background: T.accent, color: '#fff', borderRadius: '10px 10px 0 0',
        padding: '10px 16px', cursor: 'pointer', zIndex: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>💬</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Chat</span>
        </div>
        {totalUnread > 0 && (
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: '#fff', color: T.accent, fontWeight: 700 }}>{totalUnread}</span>
        )}
      </div>
    );
  }

  // Expanded popup
  return (
    <div style={{
      position: 'fixed', bottom: 0, right: 24, width: 380, height: 500,
      background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px 12px 0 0',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', zIndex: 900,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header bar */}
      <div onClick={() => { if (selectedConvo) { setSelectedConvo(null); setMessages([]); } else setExpanded(false); }}
        style={{
          padding: '10px 16px', background: T.accent, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedConvo && <span style={{ fontSize: 14 }}>←</span>}
          <span style={{ fontSize: 16 }}>💬</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{selectedConvo ? selectedConvo.name : 'Chat'}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); setExpanded(false); setSelectedConvo(null); }}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, color: '#fff', fontSize: 16, cursor: 'pointer', padding: '2px 8px', lineHeight: 1 }}>—</button>
      </div>

      {selectedConvo ? (
        /* Message thread view */
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {loadingMessages ? (
              <div style={{ textAlign: 'center', color: T.textMuted, fontSize: 13, padding: 20 }}>Loading...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: T.textMuted, fontSize: 13, padding: 30 }}>No messages</div>
            ) : messages.map(m => (
              <div key={m.id} style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: m.isOwn ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: m.isOwn ? T.accent : T.text }}>{m.sender}</span>
                  <span style={{ fontSize: 10, color: T.textDim }}>{fmtTime(m.timestamp)}</span>
                </div>
                <div style={{
                  padding: '7px 12px', borderRadius: 10, maxWidth: '85%', fontSize: 13, lineHeight: 1.4,
                  background: m.isOwn ? T.accent : T.bg, color: m.isOwn ? '#fff' : T.text,
                  borderBottomRightRadius: m.isOwn ? 3 : 10, borderBottomLeftRadius: m.isOwn ? 10 : 3,
                }}>
                  {m.text}
                </div>
                {m.attachments?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                    {m.attachments.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.emailBlue, padding: '2px 6px', background: T.emailBlueBg, borderRadius: 4, textDecoration: 'none' }}>📎 {a.name}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {/* Compose */}
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 6, flexShrink: 0 }}>
            <input value={composing} onChange={e => setComposing(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              style={{ flex: 1, padding: '8px 12px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, background: T.surface, color: T.text, outline: 'none' }} />
            <button onClick={handleSend} disabled={!composing.trim() || sending}
              style={{ padding: '8px 14px', background: composing.trim() && !sending ? T.accent : T.bg, color: composing.trim() && !sending ? '#fff' : T.textMuted, border: 'none', borderRadius: 6, cursor: composing.trim() ? 'pointer' : 'default', fontWeight: 700, fontSize: 13 }}>
              {sending ? '...' : '↑'}
            </button>
          </div>
        </>
      ) : (
        /* Conversation list */
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: T.textMuted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 13 }}>{connectedProviders.length === 0 ? 'No chat providers connected' : 'No conversations'}</div>
            </div>
          ) : conversations.map(c => (
            <div key={`${c.provider}-${c.id}`} onClick={() => selectConvo(c)}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${T.borderLight}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>{c.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: c.unreadCount > 0 ? 700 : 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  {c.lastMessageAt && <span style={{ fontSize: 10, color: T.textDim, flexShrink: 0 }}>{fmtTime(c.lastMessageAt)}</span>}
                </div>
                {c.lastMessage && <div style={{ fontSize: 12, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{c.lastMessage}</div>}
              </div>
              {c.unreadCount > 0 && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: T.urgentCoral, color: '#fff', fontWeight: 700, flexShrink: 0 }}>{c.unreadCount}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
