# ClawAI — Frontend Utilities Reference

> All utilities live in `apps/claw-frontend/src/utilities/`. They are pure functions, never contain React hooks or component logic. Every third-party library is wrapped here before use in hooks/components.

---

## Core / Framework Utilities

### `sse.utility.ts`

**Purpose**: SSE client using `fetch()` + `ReadableStream` — NOT `EventSource` API.  
**Why not EventSource**: EventSource cannot send `Authorization` headers. SSE connections require JWT authentication.  
**Usage**:

```typescript
const stream = createSSEConnection('/api/v1/chat-messages/stream/threadId', token);
stream.onMessage((event) => {
  /* handle event */
});
stream.close();
```

**Gotcha**: SSE connections bypass TanStack Query's cache — they are fire-and-forget subscription streams.

### `logger.utility.ts`

**Purpose**: Client-side logging wrapper. Sends `console.warn` / `console.error` to both browser console and `claw-client-logs-service`.  
**Never use `console.log`** — use this utility instead.  
**Batching**: Log entries are batched and sent every 5s to reduce HTTP calls.

### `api.utility.ts`

**Purpose**: Central API call wrapper with auth token injection and error handling.  
**Note**: Most code should use repositories (which use `apiClient` from `src/repositories/shared/api-client.ts`) rather than this utility directly.

---

## Formatting Utilities

### `format-bytes.utility.ts`

**Purpose**: Converts bytes to human-readable string.

```typescript
formatBytes(1024); // "1 KB"
formatBytes(1048576); // "1 MB"
formatBytes(0); // "0 Bytes"
```

### `format-duration.utility.ts`

**Purpose**: Converts milliseconds to human-readable duration.

```typescript
formatDuration(1200); // "1.2s"
formatDuration(65000); // "1m 5s"
```

### `format.utility.ts`

**Purpose**: Generic formatting (numbers with separators, percentages, truncate strings).

### `date.utility.ts`

**Purpose**: Date formatting with locale support and relative time (e.g., "2 hours ago").  
**Locale-aware**: Uses `Intl.DateTimeFormat` with the user's current locale setting.

### `confidence.utility.ts`

**Purpose**: Converts routing confidence scores (0-1 float) to display format (percentage, label: LOW/MEDIUM/HIGH).

### `cost.utility.ts`

**Purpose**: Calculates estimated cost from token counts and provider pricing tables.

### `model-size.utility.ts`

**Purpose**: Categorizes model sizes from parameter count (TINY/SMALL/MEDIUM/LARGE/XLARGE).

### `string.utility.ts`

**Purpose**: String manipulation — slugify, truncate with ellipsis, capitalize, extract mentions.

---

## Model and Routing Utilities

### `model-selector.utility.ts`

**Purpose**: Logic for the model selector dropdown — groups models by provider, filters router-only models, formats display names.  
**Key function**: `buildModelGroups(models, connectors)` → `ModelGroup[]`  
**Rule**: Models with `ROUTER` role are excluded from this output (never shown to users).

### `health-status.utility.ts`

**Purpose**: Maps `ConnectorStatus` enum values to display colors and labels.

```typescript
getStatusColor(ConnectorStatus.HEALTHY); // 'text-green-500' → uses CSS var
getStatusLabel(ConnectorStatus.DOWN); // 'Offline'
```

---

## Theme and Preferences

### `theme.utility.ts`

**Purpose**: Reads/writes theme preference (light/dark/system) to `localStorage`. Applies CSS class to `<html>` element.

### `locale.utility.ts`

**Purpose**: Reads/writes locale preference. Returns `{ locale, dir }` where `dir` is `ltr` or `rtl` (Arabic = rtl).

### `preference.utility.ts`

**Purpose**: Generic user preference storage/retrieval from `localStorage` with type safety.

---

## Workspace Utilities

### `workspace.utility.ts`

**Purpose**: General workspace helpers — connector type display names, icon mapping, action verb formatting.

### `workspace-action-payload.utility.ts`

**Purpose**: Constructs action payloads for AI-triggered workspace actions (e.g., builds the body for "create GitHub issue").

### `workspace-chat-handoff.utility.ts`

**Purpose**: Handles the flow of passing workspace context into a chat thread.

### `workspace-provider-field.utility.ts`

**Purpose**: Maps provider-specific fields to the generic workspace connector form fields.

---

## AI / Generation Utilities

### `image-generation.utility.ts`

**Purpose**: Helper for initiating image generation requests and polling for completion.

### `file-generation.utility.ts`

**Purpose**: Helper for initiating file export requests and downloading the result.

### `parallel.utility.ts`

**Purpose**: Helpers for the parallel model comparison feature — builds model pair arrays, formats comparison results.

### `search-browser-score-tone.utility.ts`

**Purpose**: Scores search result relevance and analyzes tone (informative, opinionated, neutral) for display badges.

### `escalation.utility.ts`

**Purpose**: Escalation logic — determines when to escalate to a more capable model based on quality score thresholds.

---

## Analytics / Observability Utilities

### `log-stats.utility.ts`

**Purpose**: Calculates log statistics for the observability dashboard (error rates, top modules, time series).

### `lifecycle.utility.ts`

**Purpose**: Component lifecycle helpers — safe state update check (prevents setState after unmount).

---

## Notes

- All utilities are pure functions — no React hooks, no side effects (except `logger.utility.ts` which batches)
- None currently have dedicated unit tests (tracked as gap in `docs/AUDIT_GAPS.md`)
- All i18n-adjacent utilities (`locale.utility.ts`) read from `localStorage`, never from React context
