# Chat Section Spec — Universal Chat Hub

## Panel Deliberation

### ED Users panel (6/6):
> "I have Slack for board members, Google Chat for staff, and occasionally someone texts me. I check three apps just to see if anyone messaged me. I want one view — who messaged, when, what did they say, can I reply from here."

ED vote: unified inbox across providers (6/6), reply from CC (5/6), unread count badge (6/6)

### UX panel (6/6):
> "Chat is high-frequency, low-complexity. The UI should be: left column = conversations list (grouped by provider), right column = message thread. No configuration upfront — detect which providers have tokens, show those. Provider icon on each conversation so she knows where it came from. Keep it fast — no loading spinners for chat."

UX vote: split-pane layout (6/6), provider icons (6/6), auto-detect connected providers (6/6)

### Unicorn CEO panel (5/6):
> "The abstraction layer is the product. Every chat provider has: conversations, messages, senders, timestamps. Normalize to one schema. The provider-specific code is a plugin — swap it, add one, remove one, the UI doesn't change. That's how you support 10 providers without 10x the code."

CEO vote: provider plugin architecture (6/6), normalized message schema (6/6)

### Data panel (6/6):
> "The normalized schema: Conversation { id, provider, name, participants[], lastMessageAt, unreadCount }. Message { id, conversationId, sender, text, timestamp, attachments[] }. Every provider maps to this. The API returns this shape regardless of source."

Data vote: normalized schema (6/6), provider-agnostic API response (6/6)

### COO panel (6/6):
> "Start with what she actually uses: Google Chat (staff) and Slack (board). Don't build 10 integrations — build the architecture for 10 and ship 2. The plugin contract is: fetchConversations(token) → Conversation[], fetchMessages(token, conversationId) → Message[], sendMessage(token, conversationId, text) → Message."

COO vote: ship Google Chat + Slack first (6/6), plugin contract (6/6), don't overbuild (6/6)

### CFO panel (5/6):
> "No new paid dependencies. Slack has a free API for reading messages. Google Chat is already integrated. The cost is zero if we use OAuth tokens she already has."

CFO vote: no new costs (6/6), use existing OAuth (5/6)

### CRO panel (4/6):
> "Board members use Slack. Being able to see and reply to board Slack messages from the same dashboard as email = fewer dropped conversations with key stakeholders."

CRO vote: Slack for board communication (5/6)

---

## Product team resolution (Kayla as PM):

### What to build:
1. **Chat tab** — new tab in the CC with split-pane layout (conversation list + message thread)
2. **Provider plugin architecture** — each provider is a separate API route implementing a standard contract
3. **Normalized schema** — all providers map to the same Conversation/Message shape
4. **Ship with:** Google Chat (already integrated) + Slack (new)
5. **Reply support** — send messages from the CC (both providers)
6. **Unread badge** — chat tab shows unread count

### Provider plugin contract:

Each provider is an API route at `/api/chat/{provider}` with actions:
- `GET ?action=conversations` → `{ conversations: Conversation[] }`
- `GET ?action=messages&conversationId=X` → `{ messages: Message[] }`
- `POST ?action=send` body `{ conversationId, text }` → `{ message: Message }`

### Normalized schema:

```
Conversation {
  id: string            // provider-specific ID
  provider: string      // "google-chat" | "slack" | "teams" | etc.
  name: string          // channel name, DM name, or group name
  type: "channel" | "dm" | "group"
  participants: string[]  // display names
  lastMessage: string   // preview text
  lastMessageAt: string // ISO timestamp
  unreadCount: number
  icon: string          // provider emoji
}

Message {
  id: string
  conversationId: string
  provider: string
  sender: string        // display name
  senderEmail: string   // if available
  text: string
  timestamp: string     // ISO timestamp
  attachments: { name, url, type }[]
  isOwn: boolean        // sent by Kayla
}
```

### Top 10 chat systems to design for:

| # | Provider | Auth method | API |
|---|---|---|---|
| 1 | Google Chat | Google OAuth (already have) | Chat API v1 |
| 2 | Slack | OAuth 2.0 (Bot token) | Web API |
| 3 | Microsoft Teams | Azure AD OAuth | Graph API |
| 4 | Discord | Bot token | REST API |
| 5 | WhatsApp Business | Meta Business API | Cloud API |
| 6 | Telegram | Bot token | Bot API |
| 7 | Signal | Not officially supported | — |
| 8 | iMessage | Apple ecosystem only | — |
| 9 | Facebook Messenger | Meta OAuth | Graph API |
| 10 | Zoom Chat | Zoom OAuth | REST API |

**Architecture note:** Providers 1-6 have public APIs and can be built as plugins. Providers 7-8 have no official API. Provider 9-10 are feasible but lower priority.

### Out of scope for v1:
- Threads/replies within messages (show flat for now)
- File/image preview in messages (show as links)
- Typing indicators
- Presence/online status
- Message reactions
- Provider settings UI (configure in Settings tab later)
- Providers beyond Google Chat + Slack

### New env vars needed:
- `SLACK_BOT_TOKEN` — Slack Bot OAuth token (xoxb-...)
- `SLACK_SIGNING_SECRET` — for webhook verification (future)

### Files to create:
- `/api/chat/google.js` — refactored from existing chat-messages.js
- `/api/chat/slack.js` — new Slack provider
- `/api/chat/registry.js` — provider registry + normalized schema helpers
- `src/components/ChatSection.js` — the chat tab UI
