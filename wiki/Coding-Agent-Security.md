> **Wiki source:** [`ihabkhaled/ClawAI-Coding-Agent/docs/SECURITY.md`](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/docs/SECURITY.md) on the current `main` branch.

# Threat model and controls

## Protected assets

- ClawAI access/refresh tokens and account passwords;
- source code and proprietary workspace context;
- provider/model entitlement and quota data;
- file-system integrity;
- backend and webview trust boundaries.

## Threats

### Credential disclosure

Passwords stay in the ClawAI web app. Browser authorization uses PKCE, exact
state validation, and a one-shot `127.0.0.1` callback. Tokens use
origin-scoped `SecretStorage`; exchanged candidate credentials remain staged
until profile validation and attempt-ownership checks succeed. The legacy
origin-agnostic credential is discarded instead of attributed by guesswork.
URLs reject embedded credentials. Non-local HTTP is rejected. Logger and
backend errors redact bearers, query parameters, secret keys, and assignment
syntax.

### Prompt injection and context exfiltration

Workspace files are labeled as untrusted data. Collection is opt-in through a
command/context mode, bounded, and receipt-producing. `.git`, dependencies,
outputs, `.env`, and credential-like paths are denied. User ignore rules can
add exclusions but cannot remove built-in denials.

### Untrusted attachments

Composer attachments are untrusted input. The webview rejects oversized
batches before reading their bytes, while the extension host independently
validates the count, canonical Base64 representation, decoded size, filename,
and MIME allowlist before any upload.

Attachment filenames are screened against the same credential-name policy that
denies `.env`, key material and credential-shaped names to context collection
and to every tool. The extension host is the boundary and refuses them whatever
the webview did; the webview repeats the check only so the refusal can name the
file instead of reporting a generic invalid request. Because the predicate is
shared, a name that code merely implements — `password-reset.controller.ts` — is
still attachable, and a name that stores credentials — `passwords.csv` — is not.
The screen is on the name, not the bytes: it stops an accidental sweep in a
multi-select or a folder drop, and it is not a defence against a user who is
determined to paste a secret into the composer. Files are uploaded only when their queued
request starts and only backend file IDs enter chat contracts. Attachment bytes
are never written to webview persistence. The backend validates filenames and
media signatures, keeps video payloads binary, and routes video only to a
provider path that declares native support.

### Malicious model edits

The edit plan is strict and bounded to 50 files and one megabyte per file.
Absolute paths, traversal, VCS metadata, environment files, and credential-like
targets are rejected. Approvals are rendered inside the workbench. Trust is
checked both before preview and immediately before atomic apply. The selected
workspace root is frozen for the reviewed batch, local targets and command
working paths are canonicalized to reject symlink escapes, and scope changes
cancel queued work and pending approvals. Preview reads unsaved editor content;
apply compares the current before-state with the reviewed one and requires a new
review after any intervening change.

In Manual mode, approving routine workspace access once stores only a boolean
grant in VS Code's workspace-scoped state. It covers non-sensitive context
collection and proposal generation for that workspace across reloads. It does
not authorize commands, and it never weakens Workspace Trust, secret
exclusions, path validation, command validation, or atomic apply. Full Access
applies validated file changes automatically after its one-time confirmation;
development commands remain an explicit approval boundary.

### Malicious model commands

Command plans are optional, bounded, and require an explicit in-extension
review even in Full Access. Executables use a development-tool allowlist.
Inline interpreter programs, outside-workspace arguments, shell chaining,
redirection, substitution, environment expansion, privilege tools, destructive
utilities, and mutating Git commands are rejected. Working directories must be
safe relative workspace paths; assignment-form and canonical filesystem paths
must remain inside the frozen workspace. Commands run in a visible VS Code task
terminal and are cancellable.

### Webview injection

Inbound messages use a discriminated Zod union with length and cardinality
limits. CSP uses `default-src 'none'`, a fresh cryptographic nonce, and
extension-local assets. Dynamic content is rendered with DOM text nodes and
`textContent`; it is never assigned to `innerHTML`.

### Backend compromise or drift

Runtime negotiation is authenticated, bodyless, response-bounded, and schema
validated. Capability discovery is descriptive and cannot authorize an
effect. Workspace Trust, canonical roots, account/workspace/target/policy
epochs, and replay identity are enforced locally. Unknown event fields are
rejected; syntactically valid future event names are retained as inert data.
The extension never sends the local manifest, paths, environment variables, or
secrets during negotiation, and never requests or stores hidden reasoning.

Every response is parsed through a narrow runtime schema. Error bodies are
bounded and redacted. Requests have timeouts and cancellation. Proposed
commands are treated as untrusted until strict local validation and the active
permission policy allow them.

### External output folders

An external output folder is not a second source workspace. The user grants it
with the native folder picker and may revoke it from **More settings → Output
folders**. Grants are stored in VS Code's workspace-scoped state and frozen into
each admitted request. Plans address them by an opaque `rootKey` plus a safe
relative path; absolute paths are normalized only when underneath a granted
root. Real-path containment is checked again at preview and apply time.

External roots allow create and update only. They cannot provide model context,
host commands, delete files, or participate in automatic undo. Every external
final diff requires explicit approval, including in Full Access mode.

## Residual risks

Approved generated code can still be incorrect. Users must review diffs and run
their repository gates. Workspace content sent to a configured hosted backend
leaves the local machine; the context receipt makes that set visible, but the
backend operator remains part of the trust model.
