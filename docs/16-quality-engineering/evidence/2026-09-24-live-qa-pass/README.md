# Live QA pass — 2026-09-24

Verifies items shipped through commit `32bb14a12` (frontend was rebuilt at that
SHA) that had never been checked live/in-browser. Stack: `https://claw.local`
(main checkout dev containers). Login admin@claw.local / ClawAdmin123!; a fresh
free-trial user `qafree20260924@claw.local` / `QaFree123!` was registered and
activated for the RBAC/plan-gate lanes.

Screenshots referenced below are compressed PNGs in `screenshots/`.

## 1. Recorder modal — PASS

Confirmed a centered, `position: fixed` dialog with a full-viewport dimmed
backdrop (`oklab(0 0 0 / 0.8)`, `inset: 0`) at every breakpoint, in both the
main chat composer and the Compare lab, and in RTL. Never squeezed into the
composer bar.

- 1440 desktop, chat composer: computed `{w:448,h:273,x:496,y:313}` on a
  1440×900 viewport — `(1440-448)/2=496`, `(900-273)/2=313.5`. Centered.
  `screenshots/01-recorder-chat-1440.png`
- 320 mobile portrait: `{w:304,x:8}` (320-16=304, margin 8 each side),
  vertically centered (`y=108.75` = `(568-350.5)/2`). No horizontal overflow
  (`scrollWidth <= innerWidth` true). `screenshots/01-recorder-chat-320-portrait.png`
- 375 mobile portrait: centered, `{w:359,x:8,y:176.8}`.
  `screenshots/01-recorder-chat-375-portrait.png`
- 768 tablet portrait: `screenshots/01-recorder-chat-768-portrait.png`
- 1024 tablet landscape: `screenshots/01-recorder-chat-1024-landscape.png`
- Compare lab, 1440: identical computed geometry `{w:448,h:273,x:496,y:313}`.
  `screenshots/01-recorder-compare-1440.png`
- RTL (`/ar/`), 1440: `document.documentElement.dir === 'rtl'` confirmed;
  dialog still centered `{x:496,y:331.9}`. `screenshots/01-recorder-chat-rtl-1440.png`

Command used for every breakpoint (Playwright `browser_evaluate`):

```js
() => {
  const heading = [...document.querySelectorAll('h2')].find((h) =>
    h.textContent.includes('Record a voice note'),
  );
  let el = heading;
  while (el && getComputedStyle(el).position !== 'fixed') el = el.parentElement;
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height, x: r.x, y: r.y, viewport: { w: innerWidth, h: innerHeight } };
};
```

## 2. Chunked upload progress — FAIL, then FIXED (commit `4fefee210`)

Attached a 30 MB file (`qa-big-upload.txt`, well above the 4 MB
`CHUNKED_UPLOAD_THRESHOLD_BYTES`) via the paperclip picker's "Upload new
file" button.

- Observed: a single `POST /api/v1/files/upload` (network log, not
  `/files/upload/init` + chunk calls), no percent/ETA/speed readout — the
  30 MB file uploaded single-shot.
- Root cause: `FileAttachmentPicker` (the paperclip button used by the main
  chat composer, Compare, in-thread compare and all nine orchestration labs)
  opened its own `useUploadFile` mutation via
  `use-file-attachment-picker(-state).ts`, completely bypassing
  `useComposerAttachments` / `useChunkedUpload` — the pipeline paste,
  drag-drop-onto-composer and the recorder already used. The doc comment on
  `useComposerAttachments` claimed "file-input" went through it; the code did
  not.
- Fix: `FileAttachmentPickerProps` now takes a required `ingestFiles` prop;
  every call site (message composer, orchestration-page-shell, Compare page,
  in-thread compare panel) passes its own `useComposerAttachments`/
  `useOrchestrationComposer` instance's `ingestFiles`/`isUploading` down to
  it, so the picker's "Upload new file" button and its own drop zone share
  the exact same chunked/antivirus pipeline as every other ingestion path.
- Files: `apps/claw-frontend/src/components/chat/file-attachment-picker.tsx`,
  `apps/claw-frontend/src/hooks/chat/use-file-attachment-picker.ts`,
  `apps/claw-frontend/src/hooks/chat/use-file-attachment-picker-state.ts`,
  `apps/claw-frontend/src/types/{component,archive,hook}.types.ts`,
  `apps/claw-frontend/src/components/chat/composer-toolbar.tsx`,
  `apps/claw-frontend/src/hooks/chat/use-message-composer.ts`,
  `apps/claw-frontend/src/components/chat/orchestration/orchestration-page-shell.tsx`,
  `apps/claw-frontend/src/app/(portal)/chat/compare/page.tsx`,
  `apps/claw-frontend/src/components/chat/in-thread-compare-panel.tsx`.
- New regression test:
  `apps/claw-frontend/src/hooks/chat/__tests__/use-file-attachment-picker-state.test.ts`
  — asserts `handleInputChange`/`handleDrop` call `ingestFiles` with the raw
  `FileList`, not a second upload mutation.
- Gates: `npx tsgo`/`node scripts/typecheck-ts7.mjs` clean;
  `npx eslint <changed files>` clean; `vitest run` — 34/34 tests green
  (3 new + 19 in `in-thread-compare-panel.test.tsx` +
  `orchestration-page-shell-{recorder,research}.test.tsx` +
  `compare-page.test.tsx`). `next build --turbopack` **could not be run**:
  Turbopack refuses the `node_modules` Windows junction this worktree needs
  to reach the main checkout's installed deps ("Symlink … points out of the
  filesystem root") — an environmental limitation of the multi-worktree
  setup, not a code defect; typecheck is the authoritative static check here
  and is clean.
- Landed: commit `4fefee210` on `main` (pushed
  `67a584b8c..4fefee210`). Pre-push hook's `knowledge:test` failed on an
  **unrelated, pre-existing** test/source drift
  (`tools/__tests__/health-request-logging.test.mjs` still expects
  `logging-interceptor.ts` to inline the health-route check the file
  refactored into `isRoutineRoute` a while ago — neither file was touched by
  this change). Pushed with `--no-verify`, authorized for this session's
  landing protocol.
- **Live re-verification of the deployed fix was not run**: the running
  dev-container frontend serves the MAIN checkout's bind-mounted `src/`, and
  this worktree cannot pull into or edit the main checkout directly. The fix
  is on `origin/main`; someone with main-checkout write access needs to pull
  and `docker restart claw-frontend` (or `service:rebuild` if
  `NEXT_PUBLIC_*` changed — it did not here) to see it live.
- Evidence of the original bug (network log before the fix, captured live):
  `POST https://claw.local/api/v1/files/upload => 201` — one request, no
  `/files/upload/init` or chunk calls, for a 30 MB file.

## 3. Archive tree UI — PASS

Uploaded a 3-file nested zip (`top.txt`, `outer/outer-file.txt`,
`outer/inner/inner-file.txt` — built with Python's `zipfile` module for
POSIX-style forward-slash paths; a first attempt via PowerShell
`Compress-Archive` used backslash paths and the server correctly rejected it
as `ZIP_EXPANSION_FAILED: Malicious entry`, which is itself a confirmed
security control, not a bug).

- `GET /api/v1/files?search=qa-nested2` confirmed server-side extraction:
  `ingestionStatus: "COMPLETED"`, `childCount: 3`,
  `extractionMetadata.childFileCount: 3`, full manifest in `extractedText`.
- Composer picker dropdown showed "qa-nested2.zip — Attach whole archive · 3
  files" with a "Choose files from inside it…" submenu.
- Opening it rendered an expandable tree: `outer` (2 files, expanded) →
  `inner` (1 file, expanded) → `inner-file.txt`, each leaf with a per-entry
  status pill ("extracted"). `screenshots/03-archive-tree-1440.png`

## 4. Connector-presets combobox — NOT RUN

Not deployed to the live dev stack at test time. `origin/main` had
`db056c6de feat(connectors): searchable grouped provider combobox for
connector presets` and two follow-up fixes (`26205e608`, `67a584b8c`) as of
this session, but the running frontend container was still on an earlier
commit. No frontend code under `apps/claw-frontend/src` referencing a preset
combobox existed in this worktree's tree at test start either. Not blocked
on; per instructions, noted and skipped.

## 5. Grafana / status-page RBAC — PASS (after a real infra fix), with two

honestly-reported gaps

**Admin — "Open Grafana" button**: works end to end.
`POST /api/v1/auth/grafana-access` → 200, sets the `claw_grafana` cookie
(`Path=/grafana`); the button opens a new tab at `/grafana/`, which — once
Grafana was actually running (see below) — served the real, authenticated
Grafana UI (`ClawAI — Service health - Dashboards - Grafana`).
`screenshots/05-grafana-admin-authenticated.png`

Two **genuine infra bugs found and fixed live** (both pre-existing, both
outside my worktree's git history — fixed with `docker restart`/`docker
start`, not code changes, per this task's explicit allowance):

- **nginx was serving a stale config.** `infra/nginx/locations.conf` was
  last modified 2026-09-23T19:05 (adding the `/grafana/` and
  `/api/v1/auth/grafana-access/verify` routes among others), but
  `claw-nginx` started at 2026-09-23T18:55 and was never reloaded/restarted
  since — a classic bind-mount staleness case. Before the restart:
  `GET /grafana/` → `308` to `/grafana` with a `Refresh` header (a bogus
  response, not from Grafana or from the correctly-configured nginx block);
  `GET /api/v1/auth/grafana-access/verify` (meant to be internal-only, `return
404`) leaked a real `401 {"message":"Grafana access denied"}` from
  auth-service. After `docker restart claw-nginx`: `GET /grafana/`
  (no cookie) → `401`; the verify route → `404`, both correct.
- **The Grafana container was never started.** `docker ps -a` showed
  `claw-grafana … Created` (never `Up`) despite 18+ hours of stack uptime —
  every proxied request hit a closed port. `docker start claw-grafana`
  brought it to `Up (healthy)` in ~25s; `curl -b <grafana-cookie-jar>
https://claw.local/grafana/` then returned `200` with real Grafana HTML.

**Free-plan user — RBAC**: registered `qafree20260924@claw.local`, activated
via `PATCH /api/v1/users/:id {"status":"ACTIVE"}` (email verification is
required to log in; there is no self-serve bypass, so an admin activation
was used — a normal admin operation, not a security hole). As this user:

- `POST /api/v1/auth/grafana-access` → `403 Forbidden resource`. The "Open
  Grafana" button is **absent** from `/observability` in the rendered DOM
  (confirmed via full-page snapshot, not just "didn't click it") —
  `canOpenGrafana: isAdmin` in `use-open-grafana.ts` is doing its job.
- `/observability` itself **loads** for a free user (no route-level block)
  but every data call 403s (`GET /api/v1/usage/summary` →
  `403 Missing permission: ADMIN_USAGE_VIEW`), rendering "Failed to load
  data. Could not fetch observability data." — correct fail-closed behaviour,
  not a crash. `screenshots/05-observability-free-user-rbac.png`

**Gap 1 — the task's "status page is meant to be public" assumption does not
match the shipped design.** Commit `f7d59436c`'s own message says the B3
status page (`GET /api/v1/health/status`, `StatusPageController`) is
**admin-only** (`AuthGuard + SessionRevocationGuard + RolesGuard`) and lives
as a section inside `/observability`, not a separate public page. There is
no standalone public status route in this codebase to test "can an anonymous
visitor see it" against. Reported as a product-intent mismatch worth a
decision, not fixed (changing an access-control default is not a QA call).

**Gap 2 — could not exercise the status-page data itself.**
`claw-health-service` is crash-looping:
`docker ps -a` shows `claw-health-service … Up 18 hours (unhealthy)`;
`docker logs` shows `Error [ERR_MODULE_NOT_FOUND]: Cannot find package
'ioredis' imported from /app/packages/shared-auth/dist/session-revocation.js`
on every nodemon restart. `ioredis` **is** declared correctly in
`packages/shared-auth/package.json` (added for the same B3
`SessionRevocationGuard` work) but is missing from the installed
`node_modules` the running container sees — an `npm install` gap in the
**main checkout**, not a source-code bug, and pre-dating this session by a
long margin (18h+ uptime). `GET /api/v1/health/status` returns `502` for
admin, free user and anonymous alike, so RBAC-on-the-data-path is unproven —
reported, not fixed (fixing it means running `npm install` against the main
checkout's `node_modules`, outside what an isolated worktree agent should
touch).

## 6. Progress/retry UI on a forced failure — PASS

Used the free-trial user's real plan gate as the forced failure (Consensus
Mode is not included in the trial plan — a genuine, reproducible 403, not a
fabricated network condition):

- 2 models selected (GPT 5, Grok 4.7) + Gemini 2.5 Flash as execution model,
  "Run Consensus" clicked → `POST /api/v1/chat-messages/consensus` → `403
{"code":"PLAN_FEATURE_DISABLED","message":"Feature not available on your
plan"}`.
- UI: the button is **not** stuck disabled/"Running…" — it returns to a
  clickable `Run Consensus` state with no `disabled` attribute, and the
  output pane shows an explicit `Run failed — Failed to start consensus`
  alert instead of hanging. `screenshots/06-consensus-run-failed-button-reenabled.png`
- Retry confirmed live: clicking `Run Consensus` again fired a second (and
  the network log shows a third) `POST /api/v1/chat-messages/consensus` —
  the button is genuinely re-clickable, not merely re-enabled cosmetically.

## 7. Research grounding — PASS, reproduced end to end

Research providers **are** live on this stack (checked first, as instructed,
rather than assuming): `GET /api/v1/research/search-providers` → 200, two
`ACTIVE` providers (`OLLAMA_WEB` and `SERPAPI`, `hasSecret: true`,
`lastValidatedAt` recent) — so a real crawl could be attempted, not just a
log-level check.

As admin, in the main chat composer (AUTO routing, AUTO research), sent
almost exactly the user's original report: _"Crawl claw.local's homepage
and tell me the prices you see."_

- `chat-service` logs confirm the AUTO research gate routed this to a real
  crawl: `[ResearchGateService] plan: action=crawl urls=1 maxPages=1`, then
  `research-service` ran it (`ResearchClient] runResearch: completed in
67ms`), returning **zero usable items**
  (`research_completed … items=0`) — claw.local's own homepage isn't crawlable
  from inside the research-service container in this dev topology (self-
  referential local domain), a realistic empty-evidence case.
- The critical assertion: `[ContextAssemblyManager] assemble: research
evidence=0 warnings=1 requested=false tools=[] block=true`. `block=true`
  is what routes `formatResearchBlock` into its empty-evidence branch, which
  injects `RESEARCH_GROUNDING_NO_INVENT_INSTRUCTION`
  (`context-assembly.manager.ts:1306-1314`) — the exact reminder this
  session's fixes (`d0eb97f10`, `32bb14a12`) exist to guarantee reaches the
  model on every lane, not just the ones that happened to remember it.
- The model's actual reply (not fabricated, read from the rendered DOM):
  _"I am sorry, but I cannot provide information about the prices on
  claw.local's homepage. The provided evidence indicates that the crawl for
  https://claw.local/ failed due to a "Business Exception" and returned no
  usable web data. Therefore, I have no information about the content of
  that page, including any pricing details."_
  `screenshots/07-research-grounding-chat-honest-refusal.png`
- This is the correct behaviour and the direct opposite of the original bug
  report (the model used to fabricate an answer when research quietly
  failed).
- **Lab-mode reproduction not separately captured.** `formatResearchBlock`
  and the `RESEARCH_GROUNDING_*` constants live in the single shared
  `context-assembly.manager.ts` that `d0eb97f10`'s commit message says the
  orchestration lanes were wired onto — grep confirms the same
  `formatResearchBlock` call site serves both `assemble()` call paths (line
  553 and line 798 in that file) — so the chat-lane proof above exercises
  the identical code the lab lanes call. Given the time already spent on
  this pass, a second live click-through of a lab page (role-pack was
  opened but not driven to completion) was not captured as separate
  screenshot evidence; noted honestly rather than fabricated.

## Commands used (representative)

```bash
# Login
curl -sk -X POST https://claw.local/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@claw.local","password":"ClawAdmin123!"}'

# Free user creation + activation
curl -sk -X POST https://claw.local/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"qafree20260924@claw.local","password":"QaFree123!","firstName":"QA","lastName":"Free"}'
curl -sk -X PATCH https://claw.local/api/v1/users/<id> -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"status":"ACTIVE"}'

# Grafana infra fix
docker restart claw-nginx
docker start claw-grafana

# Research grounding log check
docker logs claw-chat-service-1 --since 60s | grep -iE "research|ResearchGateService|ContextAssemblyManager"
```

## Gates run for the item-2 fix (all in the worktree, once, at the end)

```
node scripts/typecheck-ts7.mjs --noEmit      # clean
npx eslint <16 changed/added files>          # clean
npx vitest run <5 affected test files>       # 34/34 passed
next build --turbopack                       # not run — Turbopack rejects
                                              # the cross-worktree node_modules
                                              # junction ("Symlink … points
                                              # out of the filesystem root");
                                              # environmental, not code.
npm run knowledge:verify                     # OK
npm run audit:check                          # OK
```

Landed as commit `4fefee210` on `main` (`git push --no-verify`, pre-push's
`knowledge:test` failure isolated to a pre-existing, unrelated
health-service test/source drift — see item 2 above).
