# Coding Agent Release Ledger

Every coding-agent product version produced during this lab. Pack §6: a bump is
not a decoration — each row carries a concrete behavior change traced to an
observed failure or a qualification gap. No row may exist because a benchmark
was rerun.

| From   | To     | Observed failure / qualification gap                                                                                                                                                                                                                                                                                                                                                                       | Concrete enhancement                                                                                                                                                                                                                                                                                                                                                                                                | Regression tests                                                                                                                                 | VSIX                                     | UI proof                                                                                   | Commits                                        |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 0.52.0 | 0.53.0 | The product could not connect to its own production deployment. Both Cloud radios rendered `disabled`/"Coming soon" and `resolveConnectionEndpoint('…','CLOUD',…)` threw, while `https://claw-ai.co` had been live since parent `b78f9352`. A second, quieter gate: the webview→extension schema accepted only `LOCAL` and `CUSTOM`, so enabling the radio alone would have been rejected at the boundary. | Cloud resolves to `https://claw-ai.co` for backend and frontend independently, in the connection gate and the App connections dialog. Schema accepts the three lanes the UI can produce. `clawAI.backendEnvironment` / `clawAI.frontendEnvironment` accept `CLOUD`. Gate labels read the resolver's own exported constants instead of six hard-coded literals, and no longer clip the origin to `https://claw.lo…`. | `configuration.test.ts` ×3, `chat-markup.test.ts` ×2, `chat-inbound-message.test.ts` ×1, `connection.e2e.ts` ×2 round trips + refreshed snapshot | `builds/clawai-coding-agent-0.53.0.vsix` | Playwright 41/41 against the real webview markup; **live VS Code window not yet reloaded** | submodule `e158a6e`, parent pointer `90c767f6` |

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
