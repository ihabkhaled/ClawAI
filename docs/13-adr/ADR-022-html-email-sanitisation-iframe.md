# ADR-022 — HTML Email Sanitisation + iframe Sandbox

**Status:** Accepted (2026-05-01)
**Stream:** 22

## Context

Gmail (and any email surface) delivers HTML bodies. The frontend must render them readably without giving the email author any of: script execution, tracking-pixel callbacks to attacker-controlled servers, formaction redirects, srcdoc nested-iframe escapes, or VBScript execution on legacy targets.

Two-layer defence:
1. Server-side: every HTML body goes through DOMPurify (via `isomorphic-dompurify`) before persisting to `WorkspaceObject.metadata.renderedHtml`.
2. Frontend: render inside an iframe with `sandbox="allow-same-origin"` (no scripts, no top-nav, no forms).

## Decision

### Server side

`apps/claw-workspace-service/src/common/utilities/html-sanitiser.utility.ts`:

- `FORBID_TAGS`: `script`, `style`, `iframe`, `object`, `embed`, `base`, `meta`, `link`
- `FORBID_ATTR`: every `on*` event handler + `formaction` + `srcdoc`
- `ALLOWED_URL_REGEXP`: `/^(?:https?|mailto|cid|tel):/i` — strips `javascript:`, `data:` (except plain text), `vbscript:`, `view-source:`
- `ALLOW_DATA_ATTR: false` — defeats `data-` callbacks used as XSS vectors
- `KEEP_CONTENT: true` — text inside stripped elements is retained as plain text

Exposes `stripImages(html)` for the default-block-tracking-pixels mode (replaces `<img>` with `<span data-claw="image-blocked">` so the layout doesn't shift).

24 unit tests cover the OWASP filter-evasion catalog (mixed-case `<ScRiPt>`, mixed schemes, base href hijack, SVG with embedded script, polyglot URIs, data: text/html escapes).

### File-service `/upload-internal`

Gmail attachments are persisted via `POST /api/v1/internal/files/upload-internal`:
- Auth: service-token (`Authorization: Service <token>`) compared with `timingSafeEqual` against `INTER_SERVICE_AUTH_TOKEN` env var.
- Pipeline: every byte goes through the existing `FileSecurityManager` (ClamAV INSTREAM scan + 30-extension blocklist + magic-byte check + ZIP-bomb detector).
- Failures return HTTP 422 with `FILE_SECURITY_CHECK_FAILED`.

The workspace-side caller is `apps/claw-workspace-service/src/common/utilities/file-service-client.utility.ts`. Never inline; every `uploadInternal()` callsite goes through it.

### Gmail adapter

`gmail.adapter.ts` adds:
- `extractHtmlPart(payload)` — walks the MIME tree, returns the first decoded `text/html` part body.
- `extractTextPart(payload)` — same for `text/plain`.
- `flattenParts(payload)` — leaf-list of MIME parts for attachment enumeration.
- `fetchAndPersistAttachments({ accessToken, messageId, userId, payload })` — gated by `WORKSPACE_GMAIL_FETCH_ATTACHMENTS=true`; skips parts > `WORKSPACE_GMAIL_MAX_ATTACHMENT_BYTES` (default 26 MiB = Gmail upper bound).
- `renderMessageRichMetadata({ accessToken, message, userId })` — orchestrator that returns `{ renderedHtml, renderedText, attachmentRefs }` for the caller to merge into `WorkspaceObject.metadata`.

## Consequences

- **Security**: server-rendered HTML never contains executable script vectors. Even if the iframe sandbox is loosened later, the stored content is already safe.
- **Privacy**: tracking pixels are blocked by default until the user opts in; remote-image fetches go directly from the iframe (next iteration: image-proxy via file-service to fully strip referrer).
- **Bandwidth**: attachment fetch is opt-in via env flag; for huge mailboxes ops can flip `WORKSPACE_GMAIL_FETCH_ATTACHMENTS=false` for inbox-scan workloads.
- **Cost of v1**: large-attachment text-into-search-index (UAT row 22.3) is deferred to v1.x; the file-service has the bytes but the indexing crosswalk needs to be built.

## Verification

- 24 unit tests in `html-sanitiser.utility.spec.ts` cover the XSS payload catalog.
- `qa/test-stream-22-gmail-html.sh` verifies sanitiser strips XSS, /upload-internal rejects without service token, and Docker logs are clean.
- Stream 22 backend in production-shape; frontend iframe rendering deferred to a v1.1 frontend pass.
