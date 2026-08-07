# Current Benchmark State

Updated 2026-08-07. Read this first when resuming; do not redo completed work.

- **Current extension version:** source `0.53.0`, installed `0.53.0`, **active
  Extension Host still `0.52.0`** — the window has not been reloaded.
- **Current feature stage:** pre-Phase-0. Password Reset has not started.
- **Current benchmark branch/worktree:** none. Work is on `main` in both repos
  by operator instruction; no lab branch was created.
- **Current agent thread:** none.
- **Last agent run:** none. Zero runs have been issued in this lab.
- **Completed stages:** baseline capture (ITERATION-001); one product release,
  `0.53.0`, the Cloud connection lane (ITERATION-002). Both repos committed and
  pushed on `main`, nothing unpushed.
- **Unresolved feature findings:** none — there is no feature code yet.
- **Open product defects:** none observed. None have been _looked for_ through
  the real UI either, which is not the same thing.
- **Last product release:** `0.53.0` — see
  [`CODING_AGENT_RELEASE_LEDGER.md`](CODING_AGENT_RELEASE_LEDGER.md).

## Why the ladder has not started

Pack §15 sets the certification bar at the installed extension in a real VS Code
window: composer sends the request, activity stream updates, approval UI works,
final answer renders, edits appear on disk. This mentor session is a terminal
agent. It can install a VSIX, run the extension's harnesses, read logs and
journals, query the backend and review diffs — it cannot type into the
composer, press Send, answer an approval modal, or reload the window.

So every rung of the agent ladder (pack §10, Phases 0–10) needs an operator.
The mentor-owned half of the lab can continue without one.

## Next actions — operator

1. **Reload the VS Code window** (`Developer: Reload Window`). Until this
   happens the running Extension Host is `0.52.0` and anything observed is
   observing the old build.
2. **Confirm the loaded version.** ClawAI output channel or the Extensions view
   must read `0.53.0`. Pack §7: never test an installed VSIX without reloading
   and then assume new code is active.
3. **Exercise the Cloud lane end to end** — the one thing `0.53.0` ships that
   has not been proven through a live browser round trip. On the connection
   gate select Backend **Cloud** and Frontend **Cloud**, press Connect, and
   confirm: the browser opens on `https://claw-ai.co`, consent completes, the
   loopback callback returns, and the workbench appears. Then switch back to
   Local and confirm the local session is still there — sessions are keyed per
   backend origin and switching must not destroy the one left behind.
4. **Report what happened.** If the round trip fails, the failure class matters:
   a broken PKCE loop is `AGENT_PRODUCT_DEFECT` and triggers the repair loop; a
   backend route that 404s on the cloud host is an infrastructure defect in the
   parent repo.

## Next actions — mentor, once the operator is at the window

5. Run the capability probes from pack §17 before spending hours on the
   feature: list workspace root, read an exact file, create one disposable
   file, run one command, follow up once, retry after a forced failure. A basic
   probe that fails is cheaper to find now than inside Phase 4.
6. Send Phase 0 — the discovery prompt, staged verbatim at
   `prompts/agent/00_DISCOVER_PASSWORD_RESET_ARCHITECTURE.txt` in the pack.
   No code changes in that phase; the deliverable is an evidence-backed map of
   auth service, persistence, frontend routes, mail abstraction, i18n, test
   frameworks and governing rules.
7. Review the discovery output against the actual tree before allowing Phase 1.
   Pack §4: do not advance on unverified prose.

## Exact next agent prompt file

`D:\Freelance\Packs, Plans, And Prompts\ClawAI\ClawAI_Coding_Agent_Mentor_Driven_Feature_Qualification_Lab_Prompt_Pack_2026-08-07\prompts\agent\00_DISCOVER_PASSWORD_RESET_ARCHITECTURE.txt`

## Verdicts so far

Pack §13 requires the two goals to stay separate and never collapse into one
vague "done".

- **Goal A — market-ready coding-agent product:** NOT ASSESSED. No 100-round
  conformance, no effort-mode measurement, no speed-mode measurement, no
  follow-up/retry/resume labs. One qualification gap was closed.
- **Goal B — Password Reset by the agent:** NOT STARTED.
