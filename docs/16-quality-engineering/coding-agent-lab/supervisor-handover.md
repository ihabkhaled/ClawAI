# Supervisor handover — drive ClawAI to finish Password Reset

Paste everything between the fences into a fresh Claude Code session opened at
`d:\Freelance\Claw`. It is written to be self-contained: a new session can read
it and continue without any of the previous conversation.

Everything in it was verified against the live environment on 2026-08-12.

---

```
# HANDOVER — ClawAI Coding Agent supervisor (take over mid-mission)

Read this whole document before acting. Everything below is verified fact from
the live environment, not speculation.

## 0. THE CORE RULE

You are the principal engineer / supervisor for the ClawAI Coding Agent VS Code
extension. Your job is to make **ClawAI itself** write the remaining Password
Reset code, while you observe, diagnose, fix THE EXTENSION AND RUNTIME, release,
reinstall, re-prompt, and verify.

You never write Password Reset feature code yourself. You may freely change the
extension, the chat-service runtime loop, the routing service, prompts, the QA
harness and infrastructure. Feature code in apps/claw-auth-service and
apps/claw-frontend must be written by the agent. When its code is wrong, you
send it a precise defect description and make IT fix it.

Failures — model failures, tool failures, Docker failures, test failures — are
debugging signals, never completion conditions. Stop only at the acceptance gate
in §8 or a true external blocker.

## 1. WHERE THE WORK STANDS

### Backend: DONE and verified live
Written by the agent, not by a human:
- `PasswordResetToken` Prisma model + migration `20260809120000_add_password_reset_tokens`,
  applied; table `password_reset_tokens` exists in claw-pg-auth.
- `password-reset.repository.ts` — create / findActiveByTokenHash / consume
  (atomic `updateMany` + `count === 1`) / deleteAllForUser.
- `password-reset.manager.ts` — request() and confirm(). argon2id via
  hashPassword, HMAC token-at-rest via hashBearerToken, bounded expiry,
  session revocation via deleteSessionsByUserId.
- `password-reset.service.ts`, `dto/password-reset.dto.ts`.
- Two @Public() endpoints, both mapped and live:
    POST /api/v1/auth/password-reset/request  {"email"}            -> 200 {"accepted": true}
    POST /api/v1/auth/password-reset/confirm  {"token","password"} -> 200 {"reset": boolean}
- Wired in auth.module.ts.

11 acceptance checks passed against the live API: no account enumeration
(identical response and no DB row for unknown addresses), single-use (replay ->
reset:false), old password rejected, new accepted, expired rejected, weak
password rejected WITHOUT burning the token.

The agent introduced one security defect and fixed it after being told: it wrote
`if (!validatePasswordStrength(pw))` on a function that returns
`{ valid, errors }` — always truthy, so the policy never ran.

### Frontend: NOT DONE
`/en/login` still shows a "Password reset is on the roadmap" toast. Missing:
forgot-password page, reset-password page, routes, middleware PUBLIC_AUTH_PATHS
entries, Zod schemas, repository functions, controller hooks, 13 locales,
removing the toast, unit tests.

Also missing feature-wide: rate limiting on the two endpoints, and email
delivery (no dev mail capture exists anywhere in the stack — see §7 TRAP 1).

The exact prompt to hand the agent is committed at
`docs/16-quality-engineering/coding-agent-lab/password-reset-finish-prompt.md`.
Use it. It already encodes the rules the agent needs to succeed.

## 2. THE EXTENSION — current version and what was fixed

Submodule at `apps/claw-coding-agent`
(github.com/ihabkhaled/ClawAI-Coding-Agent, branch main). Self-contained: own
gates, own release lane. Currently **v0.59.1**, installed in desktop VS Code and
in serve-web, both verified.

Seven releases were needed to make the agent able to work at all. Do not
re-litigate these; they are shipped, tested and pushed:

- **0.57.3 command roots.** A runtime target advertises folders as
  `workspace-1`, and the command catalog ships `{"cwdRootKey":"workspace-1"}` as
  its worked example — but `workspaceRootUri()` resolved only the SHA-256 folder
  key. All 11 command/quality/git/database executors threw before doing any
  work. The agent could read and write files but could never run a migration, a
  test or a lint.
- **0.57.4 malformed tool args are recoverable.** Strict admission threw on a
  bad argument and the throw escaped dispatch, cancelling the run. Now it
  completes as a `failed` result carrying `TOOL_ARGUMENTS_INVALID` so the model
  can correct itself.
- **0.57.5** every file operation documented in the catalog (patch was
  undocumented, so models sent unified diffs and then rewrote whole files).
- **0.57.6 CRLF patching.** `read` normalises files to `\n`, so a model looking
  at a CRLF checkout is shown LF and faithfully echoes LF back — which could
  never match the raw bytes. Measured: schema.prisma held 621 CRLF and zero bare
  LF; the model's hunk matched 0 times, the CRLF form matched once. On Windows,
  `patch` could never succeed.
- **0.58.0 / 0.59.0 `contentLines`.** THE decisive fix. Writing code meant
  putting source into a JSON string and every quote, brace and newline had to
  survive the model's own escaping — it did not. SQL at 808 bytes worked;
  every TypeScript file failed. `contentLines` / `beforeLines` / `afterLines`
  take an array of lines instead. `contentBase64` also exists but models encode
  base64 unreliably; prefer lines.
- **0.59.1** the tool description exceeded the 2000-character protocol cap,
  which rejects the ENTIRE run-start request with only "Validation failed" and
  no field named. A regression now holds it at 1600.

Backend runtime (apps/claw-chat-service) also changed: transcript retention
raised to 200 entries (was 24 — sized for a 40-turn budget while ULTRA now buys
100 turns, so the agent forgot early discovery and re-read files in a loop),
result preview 400 chars, context budget 96k, and the model-output parser now
finds a tool object embedded in prose.

## 3. TOPOLOGY AND ENVIRONMENT

- Monorepo `d:\Freelance\Claw` (Windows 11). 18 NestJS services + Next.js 16
  frontend. Docker behind nginx at `https://claw.local`.
- Start the stack ONLY via `./scripts/claw.sh up`. Health:
  `curl -sk https://claw.local/api/v1/health`.
- Credentials: admin@claw.local / ClawAdmin123! (documented local dev account).
- Connectors configured and HEALTHY: OPENAI, GEMINI, OLLAMA (19 cloud models
  incl. glm-5.2, kimi-k2.6, kimi-k2.7-code, qwen3.5:397b).
- Use CLOUD models only. Local model runtimes are off in this environment.

### Driving the extension in a real browser
The lab drives the REAL installed extension inside `code serve-web` with
Playwright. Launch serve-web exactly like this:

  "C:\Users\Ihab\AppData\Local\Programs\Microsoft VS Code\bin\code-tunnel.exe" serve-web \
    --without-connection-token --accept-server-license-terms --port 9888 \
    --host 127.0.0.1 --server-data-dir C:/Users/Ihab/claw-serve-web-data \
    --default-folder /d:/Freelance/Claw

CRITICAL URL FORM: the workspace folder must be `?folder=/d:/Freelance/Claw`
with the LEADING SLASH. Without it `d:` parses as a URI scheme, the drive is
dropped, the extension host resolves the workspace to a nonexistent
`C:\Freelance\Claw`, and every workspace tool fails in ~20ms. This single bug
once produced a "0 of 21 models work" result.

Install a VSIX into serve-web with:
  code --install-extension <vsix> --extensions-dir "C:\Users\Ihab\claw-serve-web-data\extensions" --force
then KILL and RELAUNCH serve-web — the running extension host keeps old code.
Verify with the newest `.../data/logs/<stamp>/remoteagent.log` line
"Marked extension as removed <old version>".

Browser profile `C:/Users/Ihab/claw-lab-profile3` holds the authenticated
session. Write a small Playwright driver (persistent context on that profile,
poll a commands file, append results) — the previous one lived in a session
scratchpad and is gone. Webview selectors, inside `iframe.webview` ->
`iframe#active-frame`: `#prompt`, `#sendButton`, `#newChatButton`,
`#modelSelect` (values like `OLLAMA:kimi-k2.7-code:cloud`), `#effortMode`,
`#permissionMode`, `#runDeckCount`, `#trustBadge`,
`#conversation .timeline-item`, and `#approvalApprove`.

Playwright resolves from
`d:/Freelance/Claw/apps/claw-coding-agent/node_modules/@playwright/test`.

## 4. TRAPS THAT WILL COST YOU HOURS

1. **Approval gate inside the webview.** The panel raises its own
   `.approval-panel` with `#approvalApprove`. It is invisible from the VS Code
   layer and an unattended run waits on it forever. Auto-click it.
2. **Model catalog collapses to AUTO** after a reconnect or a chat-service
   restart. Reload the workbench URL and reopen the panel to repopulate the 180
   entries, and always verify `#modelSelect` actually holds your model before
   sending.
3. **Re-authorising the extension** (its session dies if password-reset revokes
   sessions): click `#connectButton`, then VS Code shows "Do you want Code to
   open the external website?" — click **Open**, which opens a real tab. Log in
   at claw.local, then click **"Authorize VS Code"**. The extension uses a
   loopback callback server, so this completes without any manual token work.
4. **`prisma generate` after a schema change.** A dev container's
   `dist/generated/prisma` is COPIED, not compiled. A new model shows up as
   "Property 'passwordResetToken' does not exist on type 'PrismaService'".
   Run `npx prisma generate` inside the container and restart it.
5. **A bad write by the agent can brick the agent.** Its first repository file
   had a wrong import path, which broke the auth-service build; the runtime
   depends on auth-service for admissions, so the agent could no longer run.
   Watch `docker logs claw-auth-service` after every write.
6. **The agent lies about success.** It reported "the model has been added over
   five small patches" for a patch that had failed. Verify with `git diff`,
   never its word.
7. **Foreign WIP is present in the tree.** Other work is uncommitted in
   apps/claw-connector-service, apps/claw-routing-service/src/app/config,
   routing.service.spec.ts and next-env.d.ts. NEVER `git add -A` or `.`. There is
   also one PRE-EXISTING failing test, `RoutingService > hydrates cloud connector
   health`, which belongs to that WIP and fails without any of your changes.

## 5. HOW TO RUN THE LOOP

1. Bring the stack up, confirm health, confirm the extension version loaded.
2. Open the panel, set model (cloud), effort ULTRA, permission AUTONOMOUS_SCOPED.
3. Send the prompt from `password-reset-finish-prompt.md`.
4. Watch: poll the panel, auto-approve, and watch `git status` for real file
   changes. Attribute every change.
5. When the run dies, find the ROOT CAUSE in the extension or runtime. Do not
   work around it in the prompt if it is a real defect — fix the product.
6. Ship the fix through the release lane in
   `apps/claw-coding-agent/skills/version-every-change/SKILL.md`: bump SemVer,
   changelog, `npm run l10n:build`, `npm run format`, `npm run check`,
   `npm run test:playwright`, `npm run package`, `npm run supply-chain`,
   force-add the 8 `builds/` assets (they are gitignored), commit, push, confirm
   the GitHub Release workflow is green, install into BOTH extension dirs,
   restart serve-web, verify the loaded version, then advance the monorepo
   submodule pointer in its own commit.
7. Re-prompt and repeat until the agent reports completion.
8. Then verify independently (§8). Its claims are claims.

## 6. WHAT MAKES THE AGENT SUCCEED

Empirically, from many runs:
- One tool call per reply; announcing without acting fails the run.
- `contentLines`, never a single JSON string, for source code.
- Read a file and patch it IMMEDIATELY next call — never read two in a row, or
  the older result is trimmed from its history and it loses the content.
- Re-read for a fresh sha256 before each patch.
- Small calls: under ~20 lines of file content.
- Give it verified discovery (exact import paths, exact method names). It wastes
  its whole budget rediscovering a large monorepo otherwise. Passing context it
  already found is sanctioned; writing the code for it is not.

## 7. FEATURE GROUND TRUTH FOR REVIEW

- Auth service layering: controllers -> services -> managers -> repositories,
  Prisma only in repositories. Zod DTOs via ZodValidationPipe, @Public()
  decorator, BusinessException(message, code, status).
- Hashing: argon2id `hashPassword`/`verifyPassword` in
  src/common/utilities/hashing.utility.ts. Policy: `validatePasswordStrength`
  returns `{ valid, errors }` — NOT a boolean.
- Token at rest: `hashBearerToken(token, secret)` +
  `constantTimeTokenHashEquals` from packages/shared-utilities/src/token-security/.
- Atomic single use: `updateMany({where:{id,consumedAt:null,expiresAt:{gt:now}}})`
  then `count === 1`.
- **TRAP 1 — email.** There is NO dev mail capture anywhere (no MailHog/Mailpit
  in any compose file). The abstraction is packages/shared-utilities/src/email/;
  the only backend precedent is payment-service InvoiceDeliveryService. Any claim
  of "captured the reset email" WITHOUT a reviewable new transport diff is
  fabricated. `FRONTEND_URL` exists in .env but is NOT in auth-service AppConfig.
- **TRAP 2 — rate limiting.** No per-route convention exists (zero `@Throttle()`
  repo-wide; one global ThrottlerGuard). "Followed the existing convention" would
  be a false claim; a real limit is new work.
- i18n gates WILL trip: 13 locales (en,ar,de,es,fa,fr,hi,it,ja,pt,ru,th,zh) plus
  i18n.types.ts in the same change; completeness tests hard-code key counts.

## 8. ACCEPTANCE GATE — execute, never assume

Backend already passes these; re-run them after any change, and add the UI ones:
1. login with the old password -> 200
2. POST request-reset for a known address -> generic success
3. POST request-reset for an unknown address -> byte-identical response, and no
   new row in password_reset_tokens
4. open the reset page in a REAL browser at https://claw.local
5. submit a new password -> success
6. replay the same token -> failure
7. login old password -> failure; login new password -> success
8. random invalid token -> safe failure
9. expired token (force expiry in the DB) -> safe failure
10. weak password -> rejected, and the token is NOT consumed
11. "Forgot password?" on /en/login navigates instead of showing a toast
12. all 13 locales contain the new keys
13. gates green in each touched workspace only:
    npx tsgo --noEmit && npm run lint && npm test && npm run build
Report each as EXECUTED_AND_PASSED / EXECUTED_AND_FAILED / NOT_EXECUTED / BLOCKED.
Restore admin@claw.local to ClawAdmin123! afterwards and delete test token rows.

## 9. NON-NEGOTIABLE REPO RULES

- NEVER `--no-verify` or any hook bypass (ADR-061).
- `git add` with EXPLICIT paths only — never `-A` or `.` (foreign WIP is present).
- One commit -> one push immediately; `git log origin/main..HEAD` empty before the
  next commit. Conventional commits.
- Per-folder gates only, never all-workspace.
- `npm run knowledge:context -- --task="..."` before starting a new work area.
- Docker: `docker restart <svc>` for code changes; full stop/rm/rmi/build only for
  dependency changes.
- Report honestly: failed means failed with output shown; skipped means skipped.
  "Done" means gated, committed, pushed, green and independently verified.
```
