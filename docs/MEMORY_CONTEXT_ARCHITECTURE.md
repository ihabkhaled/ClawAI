# ClawAI Memory, Context & Prompt Assembly Architecture

**Date**: 2026-04-07
**Scope**: Memory extraction, context assembly, token budgeting, deduplication, contradiction handling

---

## 1. Current State

### Context Assembly Order (ContextAssemblyManager)
```
1. System prompt (highest priority, never truncated)
2. Memories (type-labeled: [FACT], [PREFERENCE], [INSTRUCTION], [SUMMARY])
3. Context pack items (attached to thread)
4. File chunks (from attached files)
5. Thread history (last 20 messages, chronological)
```

### Memory Types
| Type | Purpose | Example |
|------|---------|---------|
| FACT | Objective information | "User works at Company X" |
| PREFERENCE | Likes/dislikes | "User prefers Python over JavaScript" |
| INSTRUCTION | Standing behavior rules | "Always respond in bullet points" |
| SUMMARY | Topic overviews | "Discussed database migration strategies" |

### What's REAL
- Memory CRUD (create, read, update, delete, toggle) with user ownership validation
- Memory extraction via Ollama (temp=0, Zod validated, max 3 per response)
- Context assembly pulls from 4 sources in parallel (memories, packs, files, history)
- Source attribution (sourceThreadId, sourceMessageId stored)
- User scoping on memory retrieval (filtered by userId)
- Token budgeting with character approximation (4 chars/token)

### What's MISSING/BROKEN
| Issue | Status | Impact |
|-------|--------|--------|
| No memory deduplication | MISSING | Duplicate memories accumulate |
| No contradiction detection | MISSING | Conflicting facts coexist |
| Truncation keeps tail, drops head | BUG | Loses system prompt on overflow |
| buildChatMessages skips truncation | BUG | Cloud provider calls unbounded |
| Context pack internal endpoint unscoped | SECURITY | Any pack fetchable by ID |
| No memory influence indicator in UI | MISSING | Users can't see what memories were used |

### Signs Memory is Fake/Harmful/Over-Injected
1. All memories injected regardless of relevance (no semantic filtering)
2. Memory count grows unbounded per user (no cap, no pruning)
3. Contradictory memories injected simultaneously
4. Truncation drops the most important context (system prompt) first
5. No way for users to see which memories influenced a response
6. Extraction happens on every message (no throttling)

---

## 2. Implementation Fixes

### Fix 1: Truncation should drop from end, not beginning
Current: `text.slice(-maxChars)` — keeps last N chars, drops system prompt
Fixed: Keep system prompt + memories, truncate thread history

### Fix 2: Add deduplication check before storing extracted memories
Check if a memory with same userId + type + similar content already exists

### Fix 3: Add memory limit per user
Cap enabled memories per user (e.g., 100) to prevent over-injection

---

## 3. Context Assembly Token Budget Allocation

| Section | Budget Share | Notes |
|---------|-------------|-------|
| System prompt | Unlimited (always included) | Never truncated |
| Instructions (memory type=INSTRUCTION) | 10% | Standing rules |
| Preferences (memory type=PREFERENCE) | 10% | User preferences |
| Facts (memory type=FACT) | 15% | Relevant facts |
| Context packs | 15% | Reusable context bundles |
| File chunks | 20% | Grounded document content |
| Thread history | 30% | Recent conversation turns |
| Summaries | Fills remaining | Low-priority background |

---

## 4. Memory Retrieval Strategy

**Current**: Fetch all enabled memories for user, ordered by updatedAt desc, limit 20
**Target**: Fetch by relevance (when embeddings available), with type-based priority

### Priority Order
1. INSTRUCTION memories (always include, they're behavioral rules)
2. PREFERENCE memories (always include, they affect response style)
3. FACT memories (include most recent, relevant to current thread)
4. SUMMARY memories (include if space allows)

---

## 5. Release Gates

| Gate | Status |
|------|--------|
| Memory extraction real (Ollama-based) | PASS |
| Context assembly from 4 sources | PASS |
| Token budgeting exists | PASS (approximate) |
| Truncation correct | FAIL (drops head) |
| Deduplication | FAIL (none) |
| Contradiction detection | FAIL (none) |
| Memory influence visible in UI | FAIL (not shown) |
| Context pack privacy | FAIL (unscoped internal endpoint) |
