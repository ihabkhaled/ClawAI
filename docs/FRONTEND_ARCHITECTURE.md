# ClawAI Frontend Architecture & UX Audit

**Date**: 2026-04-07
**Scope**: Frontend pages, components, UX patterns, wiring, trust signals, accessibility

---

## 1. Current-State Assessment

### Page Inventory (17 pages)

| Page | Route | Status | Loading | Empty | Error |
|------|-------|--------|---------|-------|-------|
| Login | /login | REAL | Y | N/A | Y |
| Dashboard | /dashboard | REAL | Y | N | Y |
| Chat List | /chat | REAL | Y | Y | Y |
| Thread Detail | /chat/[threadId] | REAL | Y | Y | Y |
| Connectors | /connectors | REAL | Y | Y | Y |
| Connector Detail | /connectors/[id] | REAL | Y | N | Y |
| Models Catalog | /models | REAL | Y | Y | Y |
| Local Models | /models/local | REAL | Y | Y | Y |
| Routing | /routing | REAL | Y | Y | Y |
| Memory | /memory | REAL | Y | Y | Y |
| Context Packs | /context | REAL | Y | Y | Y |
| Files | /files | REAL | Y | Y | Y |
| Observability | /observability | REAL | Y | Y | N |
| Audits | /audits | REAL | Y | Y | N |
| Logs | /logs | REAL | Y | Y | N |
| Admin | /admin | REAL | Y | N | N |
| Settings | /settings | REAL | Y | N/A | Y |

### Component Inventory (Key Components)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| MessageComposer | components/chat/message-composer.tsx | REAL | Model selector present, NO file attachment |
| MessageBubble | components/chat/message-bubble.tsx | REAL | Provider/model badges, feedback, regenerate |
| ModelSelector | components/chat/model-selector.tsx | REAL | Grouped by provider, Auto option |
| ThreadSettings | components/chat/thread-settings.tsx | REAL | System prompt, temp, tokens, model. NO context packs |
| RoutingTransparency | components/chat/routing-transparency.tsx | REAL | Confidence, reasons, privacy/cost class |
| ThinkingIndicator | components/chat/thinking-indicator.tsx | REAL | Shown during polling |
| ThreadListItem | components/chat/thread-list-item.tsx | REAL | Pin, archive, message count |
| FileUploadZone | components/files/file-upload-zone.tsx | REAL | Drag-and-drop, click upload |
| ConnectorCard | components/connectors/connector-card.tsx | REAL | Health, sync, edit, delete |

---

## 2. Frontend Gap Analysis

### P0 — Must Fix (Features claimed but not wired)

| # | Gap | Impact | Status |
|---|-----|--------|--------|
| F1 | No file attachment in message composer | Users can't use uploaded files in conversations | Backend supports fileIds, frontend doesn't send them |
| F2 | No context pack selector in thread settings | Context packs are disconnected from threads | Backend now has contextPackIds, frontend doesn't expose it |
| F3 | ChatThread type missing contextPackIds | Type out of sync with backend schema | Backend added field, frontend type not updated |
| F4 | CreateMessageRequest missing fileIds | Can't send file references with messages | Backend supports it, frontend doesn't |

### P1 — Important UX Gaps

| # | Gap | Impact |
|---|-----|--------|
| F5 | No memory influence indicator on messages | Users can't see which memories influenced the response |
| F6 | Polling instead of SSE for message updates | Higher latency, unnecessary requests |
| F7 | No file processing status in chat | Users don't know if attached files are ready |

### P2 — Quality Improvements

| # | Gap | Impact |
|---|-----|--------|
| F8 | Limited aria-live regions | Async updates not announced to screen readers |
| F9 | No onboarding wizard | New users don't know where to start |
| F10 | No keyboard shortcuts | Power users can't navigate efficiently |

---

## 3. What's Genuinely Well-Built

- **Dark mode**: CSS variables with system preference detection, persistent
- **i18n**: 8 languages (EN, ES, FR, DE, IT, PT, RU, AR) with RTL support for Arabic
- **Mobile responsiveness**: Collapsible sidebar, responsive grids, hidden text on small screens
- **Routing transparency**: Full decision visibility (confidence, reasons, privacy/cost class, fallback)
- **Provider/model attribution**: Every assistant message shows which model answered
- **Model selector**: Grouped dropdown with Auto + provider groups
- **Feedback system**: Thumbs up/down on every message
- **Structured logging**: Batched, redacted client logs sent to backend

---

## 4. Implementation Plan

### Phase F1: File Attachment in Chat

Add a file picker to the message composer that lets users select from their uploaded files.

**Changes needed**:
1. Update `CreateMessageRequest` type to include `fileIds?: string[]`
2. Create `FileAttachmentPicker` component (dialog showing user's uploaded files)
3. Add paperclip button to `MessageComposer`
4. Wire selected fileIds into `sendMessage` call
5. Show attached file badges above textarea

### Phase F2: Context Pack Selector in Thread Settings

Add a multi-select for context packs in thread settings.

**Changes needed**:
1. Update `ChatThread` type to include `contextPackIds: string[]`
2. Update `CreateThreadRequest` and `UpdateThreadRequest` to include `contextPackIds`
3. Create `ContextPackSelector` component
4. Add to `ThreadSettings` component
5. Wire into `useThreadSettings` hook save handler

### Phase F3: Type Updates

Sync frontend types with backend schema changes.

---

## 5. Trust-Building UX Recommendations

1. **Always show the model badge** — even during "thinking" state, show which model is being queried
2. **Routing reason in plain language** — translate reason tags to human-readable sentences
3. **File usage indicator** — when files influence a response, show a small "grounded in: filename.pdf" tag
4. **Memory usage indicator** — when memories influence a response, show "informed by N memories" tag
5. **Confidence meter** — visual indicator (not just number) for routing confidence
6. **Degraded mode banner** — when health service reports issues, show a banner

---

## 6. Release Gates

| Gate | Status |
|------|--------|
| All pages have loading states | PASS |
| All pages have empty states | PASS (most) |
| All pages have error handling | PARTIAL (some missing) |
| File attachment in chat | FAIL (not implemented) |
| Context pack selection in threads | FAIL (not implemented) |
| Mobile responsive | PASS |
| Dark mode works | PASS |
| i18n complete | PASS (8 languages) |
| Routing transparency visible | PASS |
| Provider/model attribution | PASS |
