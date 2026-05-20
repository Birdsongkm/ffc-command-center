import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ChatSection — universal chat hub for the Chat tab.
 * Split-pane: conversation list (left) + message thread (right).
 * Provider-agnostic — works with any provider that implements the plugin contract.
 *
 * Props: T (theme), showToast, auth
 */

const PROVIDERS = [
  { id: 'google-chat', name: 'Google Chat', apiPath: '/api/chat/google', icon: '💬' },
  { id: 'slack', name: 'Slack', apiPath: '/api/chat/slack', icon: '🟣' },
];

export default function ChatSection({ T, showToast, auth }) {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composing, setComposing] = useState('');
  const [sending, setSending] = useState(false);
  const [providerFilter, setProviderFilter] = useState(null);
  const [connectedProviders, setConnectedProviders] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch conversations from all providers on mount
  useEffect(() => {
    if (!auth) return;
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
  }, [auth]);

  // Fetch messages when a conversation is selected
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
      showToast('Failed to load messages: ' + e.message);
    }
    setLoadingMessages(false);
  }, [showToast]);

  // Auto-scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
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
      if (d.message) {
        setMessages(prev => [...prev, d.message]);
        setComposing('');
      } else {
        showToast(d.error || 'Failed to send');
      }
    } catch (e) {
      showToast('Send failed: ' + e.message);
    }
    setSending(false);
  };

  const filteredConvos = providerFilter
    ? conversations.filter(c => c.provider === providerFilter)
    : conversations;

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

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)', minHeight: 400, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', background: T.card }}>
      {/* Left: Conversation list */}
      <div style={{ width: 320, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: T.text }}>Chat</span>
            {totalUnread > 0 && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: T.urgentCoralBg, color: T.urgentCoral, fontWeight: 700 }}>{totalUnread}</span>}
          </div>
          {/* Provider filter pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button onClick={() => setProviderFilter(null)} style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: !providerFilter ? T.accent : T.bg, color: !providerFilter ? '#fff' : T.textMuted, border: `1px solid ${!providerFilter ? T.accent : T.border}` }}>All</button>
            {connectedProviders.map(pid => {
              const p = PROVIDERS.find(pr => pr.id === pid);
              if (!p) return null;
              return (
                <button key={pid} onClick={() => setProviderFilter(providerFilter === pid ? null : pid)} style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: providerFilter === pid ? T.accent : T.bg, color: providerFilter === pid ? '#fff' : T.textMuted, border: `1px solid ${providerFilter === pid ? T.accent : T.border}` }}>
                  {p.icon} {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: T.textMuted, fontSize: 14 }}>Loading conversations...</div>
          ) : filteredConvos.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: T.textMuted }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 14 }}>{connectedProviders.length === 0 ? 'No chat providers connected' : 'No conversations found'}</div>
            </div>
          ) : filteredConvos.map(c => (
            <div key={`${c.provider}-${c.id}`} onClick={() => selectConvo(c)}
              style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${T.borderLight}`,
                background: selectedConvo?.id === c.id && selectedConvo?.provider === c.provider ? T.accentBg : 'transparent',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{c.icon}</span>
                <span style={{ fontSize: 14, fontWeight: c.unreadCount > 0 ? 700 : 500, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                {c.unreadCount > 0 && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: T.urgentCoral, color: '#fff', fontWeight: 700 }}>{c.unreadCount}</span>}
              </div>
              {c.lastMessage && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</div>}
              {c.lastMessageAt && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{fmtTime(c.lastMessageAt)}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Message thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConvo ? (
          <>
            {/* Thread header */}
            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}>{selectedConvo.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{selectedConvo.name}</span>
              <span style={{ fontSize: 12, color: T.textDim }}>{selectedConvo.type}</span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', color: T.textMuted, fontSize: 14, padding: 20 }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: T.textMuted, fontSize: 14, padding: 40 }}>No messages yet</div>
              ) : messages.map(m => (
                <div key={m.id} style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: m.isOwn ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: m.isOwn ? T.accent : T.text }}>{m.sender}</span>
                    <span style={{ fontSize: 11, color: T.textDim }}>{fmtTime(m.timestamp)}</span>
                  </div>
                  <div style={{
                    padding: '8px 14px', borderRadius: 12, maxWidth: '75%', fontSize: 14, lineHeight: 1.5,
                    background: m.isOwn ? T.accent : T.bg, color: m.isOwn ? '#fff' : T.text,
                    borderBottomRightRadius: m.isOwn ? 4 : 12, borderBottomLeftRadius: m.isOwn ? 12 : 4,
                  }}>
                    {m.text}
                  </div>
                  {m.attachments?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {m.attachments.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: T.emailBlue, textDecoration: 'none', padding: '3px 8px', background: T.emailBlueBg, borderRadius: 6 }}>📎 {a.name}</a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
              <input
                value={composing}
                onChange={e => setComposing(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message..."
                style={{ flex: 1, padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, background: T.surface, color: T.text, outline: 'none' }}
              />
              <button onClick={handleSend} disabled={!composing.trim() || sending}
                style={{ padding: '10px 20px', background: composing.trim() && !sending ? T.accent : T.bg, color: composing.trim() && !sending ? '#fff' : T.textMuted, border: 'none', borderRadius: 8, cursor: composing.trim() && !sending ? 'pointer' : 'default', fontWeight: 700, fontSize: 14 }}>
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: T.textMuted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 16 }}>Select a conversation</div>
          </div>
        )}
      </div>
    </div>
  );
}
