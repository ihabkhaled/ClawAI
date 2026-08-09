# Coding Agent Release Ledger

Every coding-agent product version produced during this lab. Pack §6: a bump is
not a decoration — each row carries a concrete behavior change traced to an
observed failure or a qualification gap. No row may exist because a benchmark
was rerun.

| From   | To     | Observed failure / qualification gap                                                                                                                                                                                                                                                                                                                                                                       | Concrete enhancement                                                                                                                                                                                                                                                                                                                                                                                                | Regression tests                                                                                                                                 | VSIX                                     | UI proof                                                                                   | Commits                                        |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 0.52.0 | 0.53.0 | The product could not connect to its own production deployment. Both Cloud radios rendered `disabled`/"Coming soon" and `resolveConnectionEndpoint('…','CLOUD',…)` threw, while `https://claw-ai.co` had been live since parent `b78f9352`. A second, quieter gate: the webview→extension schema accepted only `LOCAL` and `CUSTOM`, so enabling the radio alone would have been rejected at the boundary. | Cloud resolves to `https://claw-ai.co` for backend and frontend independently, in the connection gate and the App connections dialog. Schema accepts the three lanes the UI can produce. `clawAI.backendEnvironment` / `clawAI.frontendEnvironment` accept `CLOUD`. Gate labels read the resolver's own exported constants instead of six hard-coded literals, and no longer clip the origin to `https://claw.lo…`. | `configuration.test.ts` ×3, `chat-markup.test.ts` ×2, `chat-inbound-message.test.ts` ×1, `connection.e2e.ts` ×2 round trips + refreshed snapshot | `builds/clawai-coding-agent-0.53.0.vsix` | Playwright 41/41 against the real webview markup; **live VS Code window not yet reloaded** | submodule `e158a6e`, parent pointer `90c767f6` |

| 0.53.0 | 0.54.0 | Pack §13 requires six effort modes with measurable behavioural differences. `grep -ri effort src/` matched three files and every hit was the English phrase "best effort" — the feature did not exist. Every run took one hardcoded `RunBudget` from a module constant, so a one-line rename and a cross-service feature were allowed to spend identically. | `clawAI.effortMode` selects one of six distinct budget profiles; the composer gained an **Effort** control; the runtime starts each run with the selected budget and records the mode in its trace and durable journal. Ultra is byte-identical to the old constant and is the default, so upgrading changes nothing until a lower mode is chosen. | `effort-mode.test.ts` ×9, `runtime-studio-effort-budget.test.ts` ×5, `chat-inbound-message.test.ts` ×1, `chat-markup.test.ts` ×1, `session-control-service.test.ts` ×2, `webview.e2e.ts` ×1 | `builds/clawai-coding-agent-0.54.0.vsix` | Playwright 42/42; **live VS Code window still not reloaded** | submodule `324eb4c` (+ `53985b5`), parent pointer pending |

## 0.54.0 — full release record (pack §21)

- **Previous version:** 0.53.0
- **New version:** 0.54.0 — minor. A new user-visible control and a new setting.
- **Root cause:** the budget was written as a single constant when there was one
  kind of run, and nothing forced it to become a choice as the runtime grew.
- **Changed product code:** `src/core/effort-mode.ts` (new),
  `src/core/extension-state.ts`, `src/extension.ts`,
  `src/services/configuration-service.ts`,
  `src/services/runtime-studio-execution.ts`,
  `src/services/session-control-service.ts`,
  `src/services/session-control.types.ts`,
  `src/webview/chat-inbound-message.ts`, `src/webview/chat-markup.ts`,
  `src/webview/chat-public-state.ts`, `src/webview/chat-view-actions.ts`,
  `src/webview/chat-view-provider.ts`, `media/chat.js`, `package.json`,
  `package.nls.json`.
- **Docs:** `CHANGELOG.md`, `README.md`, `docs/RUNTIME_ONBOARDING.md` (the full
  budget table). Locales regenerated across all 13 bundles.
- **Focused gates:** `npm run check` → 852/852 tests, `package:audit OK`.
- **VSIX path:** `apps/claw-coding-agent/builds/clawai-coding-agent-0.54.0.vsix`
- **Proof the installed build is the new one:**
  `clawai.clawai-coding-agent@0.54.0`; installed `dist/extension.js` has
  `effortMode` ×16 and `XHIGH` ×4 against zero of each in the `0.53.0` bundle.
- **Proof the Extension Host is running it:** **absent.** No reload has
  happened. Pack §7.
- **10 confirmation rounds / 100 affected-option rounds:** not run — both need
  the live window. The affected option family is
  effort ∈ {LOW, MEDIUM, HIGH, MAX, XHIGH, ULTRA}.
- **Unresolved risk:** the budgets are reasoned, not calibrated. The ladder is
  provably distinct and monotonic, but no run has yet been executed at LOW to
  confirm 6 model turns is enough for the tasks LOW claims to serve. The first
  real measurement may move the numbers; the contract and its tests are built to
  survive that.
- **Qualification still unresolved:** speed modes 1X / 1.5X / 2X shipped in
  `0.55.0` with automated coverage, but the pack's measured 100-round and human
  desktop certification evidence has not been recorded.

## 0.53.0 — full release record (pack §21)

- **Previous version:** 0.52.0
- **New version:** 0.53.0 — minor. Per `skills/version-every-change/SKILL.md`,
  a new user-visible capability and an intentional workflow expansion take a
  minor bump, not a patch.
- **Root cause:** the Cloud lane was written when there was no hosted
  deployment, and it stayed disabled after one appeared. Three independent
  places encoded "cloud is unavailable" — the resolver, the markup, and the
  inbound message schema — so enabling any one of them alone would not have
  worked.
- **Changed product code:** `src/core/configuration.ts`,
  `src/webview/chat-inbound-message.ts`, `src/webview/chat-markup.ts`,
  `media/chat.js`, `media/chat.css`, `package.json`, `package.nls.json`.
- **Lab-harness code (LAB_FIX, not product):**
  `scripts/serve-webview-fixture.mjs` now bundles instead of transpiling, so the
  Playwright fixture can resolve the markup's imports.
- **Docs:** `CHANGELOG.md`, `README.md`, `docs/AUTHENTICATION.md`. Locales
  regenerated across all 13 bundles; the now-dead "Coming soon" translation was
  removed from `scripts/generate-locales.mjs` in all 12 dictionaries.
- **Focused gates:** `npm run check` → format:check, lint, typecheck,
  scan:paths, 835/835 tests, build, `package:audit OK`.
- **Package gates:** `vsce` packaged 127 files / 16.48 MB.
- **VSIX path:** `apps/claw-coding-agent/builds/clawai-coding-agent-0.53.0.vsix`
- **Install command:**
  `code --install-extension builds/clawai-coding-agent-0.53.0.vsix --force`
- **Proof the installed build is the new one:**
  `code --list-extensions --show-versions` → `clawai.clawai-coding-agent@0.53.0`.
  Installed `dist/extension.js`: `claw-ai.co` ×2, "Coming soon" ×0. The retained
  `0.52.0` bundle: `claw-ai.co` ×0, "Coming soon" ×4.
- **Proof the Extension Host is running it:** **absent.** The window has not
  been reloaded. Pack §7 forbids inferring an active build from an install.
- **Reproduction before/after:** before, `resolveConnectionEndpoint` threw and
  the radio could not be clicked; after, the Playwright gate test checks the
  Cloud radio and observes `backendEnvironment: 'CLOUD'` on the posted message.
- **10 confirmation rounds:** not run — they require the live window.
- **100 affected-option rounds:** not run — same reason. The affected option
  family is Backend/Frontend environment × {LOCAL, CLOUD, CUSTOM}.
- **Unresolved risk:** no end-to-end authorization has been performed against
  `https://claw-ai.co` from the extension. The routes answer and the TLS chain
  is publicly trusted, but the full PKCE loopback round trip — init → browser
  consent → loopback callback → exchange → profile — is unproven on the cloud
  lane. It is the first thing the operator should exercise after the reload.
- **Also unresolved, out of scope:** `builds/` is gitignored as of `7a57131`,
  yet the `0.52.0` artifacts remain tracked from before that commit. The tree
  now advertises a `0.52.0` VSIX beside a `0.53.0` release. Untracking them is a
  release-layout decision for the repository owner, not something to do
  unasked.
