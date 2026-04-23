# ClawAI — Backend Utilities Reference

> Every third-party library is wrapped in a `*.utility.ts` file. Services never import from `node_modules` directly. This document catalogs all utility files, what they wrap, and their test status.

---

## Common Utilities (present in every service)

### `jwt.utility.ts`

**Present in**: all 13+ services  
**Wraps**: `jsonwebtoken`  
**Purpose**: JWT verification only (services never sign tokens — only `claw-auth-service` signs). Extracts and validates `AuthenticatedUser` from Authorization header.  
**Pattern**:

```typescript
export const verifyToken = (token: string): JwtPayload => { ... }
```

**Test status**: Has tests in `claw-auth-service` only. Other services use identical implementation.

### `http-client.utility.ts` / `http.utility.ts`

**Present in**: claw-chat, claw-connector, claw-file-gen, claw-health, claw-image, claw-memory, claw-ollama, claw-routing  
**Wraps**: native `fetch` (Node 18+)  
**Purpose**: Generic HTTP GET/POST with configurable headers, timeout, retry logic. Returns typed response with `ok`, `status`, `data` fields.  
**Variants**:

- `httpGet<T>()` — typed JSON GET
- `httpGetText()` — HTML/plain text GET (used by Ollama catalog scraper)
- `httpPost<T>()` — typed JSON POST

**Test status**: No dedicated tests (integration-tested via service tests).

---

## claw-auth-service Utilities

### `hashing.utility.ts`

**Wraps**: `argon2`  
**Purpose**: Password hashing (hash) and verification (verify). Uses Argon2id variant.  
**Test**: ✅ `hashing.utility.spec.ts`

### `jwt.utility.ts`

**Wraps**: `jsonwebtoken`  
**Purpose**: Signs access tokens AND refresh token JTIs. Only service that signs tokens.  
**Test**: ✅ `jwt.utility.spec.ts`

### `crypto.utility.ts`

**Wraps**: Node.js `crypto` module  
**Purpose**: AES-256-GCM encrypt/decrypt with random IV and authentication tag. Used for storing connector API keys.  
**Test**: ❌ No test

### `password-policy.utility.ts`

**Purpose**: Validates passwords against security rules (length, complexity, no common passwords).  
**Test**: ❌ No test

### `to-safe-user.utility.ts`

**Purpose**: Strips `passwordHash`, `refreshTokenHash`, and other internal fields from User object before returning in API response.  
**Test**: ❌ No test

---

## claw-connector-service Utilities

### `http.utility.ts`

**Wraps**: native `fetch`  
**Purpose**: Typed HTTP GET for provider health checks + catalog scraping. `httpGetText()` added for HTML scraping of ollama.com.  
**Test**: ❌ No test

### `crypto.utility.ts`

**Wraps**: Node.js `crypto`  
**Purpose**: AES-256-GCM encrypt/decrypt for connector `apiKey` field storage.  
**Test**: ❌ No test

---

## claw-file-service Utilities

### `clamav-scanner.utility.ts`

**Wraps**: `clamav.js`  
**Purpose**: Virus scanning via ClamAV Docker container (TCP INSTREAM protocol). Graceful degradation if ClamAV unreachable.  
**Test**: ❌ No test  
**Config**: `CLAMAV_HOST` (default: `clamav`), `CLAMAV_PORT` (default: `3310`)

### `file-validator.utility.ts`

**Wraps**: `file-type` npm package  
**Purpose**: Magic byte validation (verify MIME type matches content), filename sanitization (blocks path traversal, null bytes, dangerous extensions), ZIP bomb detection.  
**Test**: ❌ No test  
**Dangerous extensions blocked**: `.exe`, `.dll`, `.bat`, `.ps1`, `.vbs`, `.sh` + 25 more

### `file-storage.utility.ts`

**Wraps**: Node.js `fs/promises`  
**Purpose**: Save file to disk path, delete file, read file contents. Sanitizes filenames before saving.  
**Test**: ❌ No test

### `pdf-parser.utility.ts`

**Wraps**: `pdf-parse`  
**Purpose**: Extract plain text from PDF files for chunking and indexing.  
**Test**: ❌ No test

### `docx-parser.utility.ts`

**Wraps**: `mammoth`  
**Purpose**: Extract plain text (and optionally HTML) from DOCX/Word documents.  
**Test**: ❌ No test

---

## claw-ollama-service Utilities

### `model-normalizer.utility.ts`

**Purpose**: Normalizes raw Ollama model names (e.g., `llama3.2:3b-instruct-fp16` → `{ slug: "llama3.2", tag: "3b-instruct-fp16", family: "llama" }`).  
**Test**: ✅

### `model-classifier.utility.ts`

**Purpose**: Classifies models into categories (CODING, REASONING, THINKING, ROUTING, FILE_GENERATION, IMAGE_GENERATION, GENERAL) based on name/family patterns.  
**Test**: ✅

### `model-ranker.utility.ts`

**Purpose**: Ranks models by parameter count, quantization quality, and benchmark scores. Used to surface "recommended" models in catalog.  
**Test**: ✅

### `model-deduplicator.utility.ts`

**Purpose**: Removes duplicate model entries when catalog scraping returns overlapping slugs. Uses slug-based deduplication with tag priority ordering.  
**Test**: ✅

### `hardware-profile.utility.ts`

**Purpose**: Profiles host system (VRAM, RAM, CPU cores) to filter catalog recommendations by hardware capability.  
**Test**: ✅

### `catalog-reference.utility.ts`

**Purpose**: Resolves Ollama library slugs to full model references (e.g., `llama3.2` → `llama3.2:3b`).  
**Test**: ✅

### `search-browser-classifier.utility.ts`

**Purpose**: Classifies whether a model is suitable for browser-based (JavaScript) inference. Used for catalog filtering.  
**Test**: ✅

---

## claw-research-service Utilities

### `html-extract.utility.ts`

**Purpose**: Lightweight HTML → plain text extraction (no heavy parser). Strips tags, normalizes whitespace, extracts title/headings.  
**Test**: ❌

### `url-safety.utility.ts`

**Purpose**: Validates URLs before fetching: blocks private IP ranges (10.x, 172.16.x, 192.168.x, 127.x), requires HTTPS, validates domain format.  
**Test**: ❌

### `content-safety.utility.ts`

**Purpose**: Scans scraped content for harmful material (adult, violence, hate speech patterns). Used as post-scrape filter.  
**Test**: ✅

### `hash.utility.ts`

**Purpose**: SHA-256 hashing for deduplication of scraped content/URLs. Prevents storing duplicate search results.  
**Test**: ❌

### `evidence-builder.utility.ts`

**Purpose**: Compiles search results into structured evidence objects with source citations, relevance scores, and content summaries.  
**Test**: ❌

### `domain-policy.utility.ts`

**Purpose**: Enforces per-domain access policies (allowlist/blocklist for scraping). Prevents scraping banned or restricted domains.  
**Test**: ✅

### `scrape-text.utility.ts`

**Purpose**: Fetches a URL and extracts readable text content. Handles redirects, encoding, and timeout.  
**Test**: ❌

### `provider-sanitizer.utility.ts`

**Purpose**: Normalizes search provider results (Tavily, SearXNG, Ollama Web) into a unified `SearchResult` shape.  
**Test**: ❌

---

## claw-workspace-service Utilities

### `crypto.utility.ts`

**Wraps**: Node.js `crypto`  
**Purpose**: AES-256-GCM encrypt/decrypt for OAuth2 tokens and workspace secrets.  
**Test**: ✅

### `pkce.utility.ts`

**Purpose**: PKCE (Proof Key for Code Exchange) — generates code verifier, code challenge for OAuth2 authorization flows.  
**Test**: ✅

### `url-safety.utility.ts`

**Purpose**: Validates OAuth2 redirect URIs and webhook callback URLs against allowlist.  
**Test**: ✅

### `webhook-signature.utility.ts`

**Purpose**: HMAC-SHA256 signature verification for incoming webhooks (GitHub, Slack, Jira event payloads).  
**Test**: ✅

### `connector-sanitizer.utility.ts`

**Purpose**: Strips OAuth tokens, secrets, and internal fields from WorkspaceConnector objects before API response.  
**Test**: ❌

### `oauth-app-probe.utility.ts`

**Purpose**: Tests OAuth app credentials (client_id + client_secret) against provider discovery endpoint to verify they're valid before storing.  
**Test**: ✅

---

## claw-agent-service Utilities

### `jwt.utility.ts`

**Purpose**: JWT verification for agent device tokens (different scope from user tokens).  
**Test**: ❌

### `token.utility.ts`

**Purpose**: Generates JTI (JWT ID), HMAC hashes for token storage, and base64-url encoded random strings.  
**Test**: ❌

### `policy-regex.utility.ts`

**Purpose**: Compiles shell command security policies (allow/deny patterns) into RegExp for terminal command approval.  
**Test**: ❌

### `risk-status.utility.ts`

**Purpose**: Maps risk assessment scores to terminal command approval status (AUTO_APPROVE / REQUIRE_HUMAN / BLOCK).  
**Test**: ❌

### `device.utility.ts`

**Purpose**: Transforms internal device records to public API representation (strips sensitive pairing tokens).  
**Test**: ❌

### `user-code.utility.ts`

**Purpose**: Generates unique human-readable device pairing codes (e.g., `HAWK-7392`).  
**Test**: ❌

---

## Test Coverage Summary

| Service                | Utilities | With Tests | Coverage % |
| ---------------------- | --------- | ---------- | ---------- |
| claw-auth-service      | 5         | 2          | 40%        |
| claw-connector-service | 3         | 0          | 0%         |
| claw-file-service      | 5         | 0          | 0%         |
| claw-ollama-service    | 7         | 7          | 100%       |
| claw-research-service  | 8         | 2          | 25%        |
| claw-workspace-service | 6         | 5          | 83%        |
| claw-agent-service     | 6         | 0          | 0%         |
| claw-chat-service      | 4         | 1          | 25%        |
| All others             | varies    | 0          | 0%         |

**Priority for adding tests**: claw-connector-service crypto/http, claw-file-service (all), claw-agent-service (all), claw-research-service scrape/evidence utilities.
