# Current Benchmark State

Updated 2026-08-09. Read this first when resuming; do not redo completed work.

- **Current extension version:** source `0.57.3`. The repository contains the
  matching versioned VSIX, but this audit did not install it or prove which
  version a human-operated Extension Host is running.
- **Current feature stage:** not established by this audit; the user-owned
  password-reset notes were deliberately excluded from inspection.
- **Current benchmark branch/worktree:** none. Work is on `main` in both repos
  by operator instruction; no lab branch was created.
- **Current agent thread:** none.
- **Last agent run:** none. Zero runs have been issued in this lab.
- **Completed product changes recorded in history:** `0.53.0` Cloud connection,
  `0.54.0` effort modes, `0.55.0` speed modes, and the subsequent Runtime V2
  reliability releases through `0.57.3`.
- **Unresolved feature findings:** this audit did not assess the password-reset
  implementation or provenance.
- **Open product defects:** none observed through the real UI, which has not
  been exercised. Effort modes shipped in `0.54.0`; speed modes 1X / 1.5X / 2X
  shipped in `0.55.0` and have unit plus Playwright coverage. Their remaining
  gap is measured 100-round and human desktop qualification, not implementation.
- **Last product release:** `0.57.3` — see
  [`CODING_AGENT_RELEASE_LEDGER.md`](CODING_AGENT_RELEASE_LEDGER.md).

## The ladder has started

`code serve-web` drives the real extension UI from a browser. Phase 0 has been
sent twice and observed. See ITERATION-006 in the ledger.

The two defects that previously blocked the benchmark are closed in code:

- Coding-agent commits `d1a1b78` and `901a811` preserve a trusted executor's
  bounded failure reason and let the model continue after a failed tool step.
  `runtime-tool-dispatcher.test.ts` covers reason propagation, empty reasons,
  redaction, and continuation after failure.
- Parent commits `27e20082` and `66772c3f` make agent AUTO routing capability
  aware and preserve the AUTO sentinel through Runtime V2 admission. The
  extension still correctly sends `provider: "AUTO"` and `model: "AUTO"`; the
  backend owns model selection.

The workspace-list incident itself was a harness addressing error, not a
general executor defect: `?folder=d:/Freelance/Claw` created a phantom root,
while `?folder=/d:/Freelance/Claw` addressed the real workspace. The corrected
harness produced a successful `workspace.files list` result in 14 ms. See
[`evidence/model-matrix-2026-08-08-root-cause.md`](evidence/model-matrix-2026-08-08-root-cause.md).

**Blocking certification now:** the repaired AUTO lane and current `0.57.3`
VSIX have not been certified through a human-operated desktop VS Code window.
Code tests and served-web harness evidence do not substitute for that proof.

## Superseded note — why the ladder was thought impossible

Pack §15 sets the certification bar at the installed extension in a real VS Code
window: composer sends the request, activity stream updates, approval UI works,
final answer renders, edits appear on disk. This mentor session is a terminal
agent. It can install a VSIX, run the extension's harnesses, read logs and
journals, query the backend and review diffs — it cannot type into the
composer, press Send, answer an approval modal, or reload the window.

So every rung of the agent ladder (pack §10, Phases 0–10) needs an operator.
The mentor-owned half of the lab can continue without one.

## Next actions — operator

1. Install `apps/claw-coding-agent/builds/clawai-coding-agent-0.57.3.vsix`, then
   **reload the VS Code window** (`Developer: Reload Window`).
2. **Confirm the loaded version.** ClawAI output channel or the Extensions view
   must read `0.57.3`. Pack §7: never infer the active Extension Host version
   from source files, an installed VSIX, or a successful package test.
3. **Exercise the Cloud lane end to end** — the one thing `0.53.0` ships that
   has not been proven through a live browser round trip. On the connection
   gate select Backend **Cloud** and Frontend **Cloud**, press Connect, and
   confirm: the browser opens on `https://claw-ai.co`, consent completes, the
   loopback callback returns, and the workbench appears. Then switch back to
   Local and confirm the local session is still there — sessions are keyed per
   backend origin and switching must not destroy the one left behind.
4. **Exercise the Effort control.** Open **More settings** in the composer. Six
   options must be present and Ultra selected. Run the same prompt at Ultra and
   at Low and confirm the difference is visible — Low should stop earlier on a
   task that needs more than six model turns, and should say so rather than
   hanging. That is the §13 measurement this release cannot make from here.
5. **Report what happened.** If the round trip fails, the failure class matters:
   a broken PKCE loop is `AGENT_PRODUCT_DEFECT` and triggers the repair loop; a
   backend route that 404s on the cloud host is an infrastructure defect in the
   parent repo; an effort mode with no observable effect is
   `EFFORT_MODE_NO_EFFECT` and reopens §13.

## Next actions — mentor, once the operator is at the window

6. Run the capability probes from pack §17 before spending hours on the
   feature: list workspace root, read an exact file, create one disposable
   file, run one command, follow up once, retry after a forced failure. A basic
   probe that fails is cheaper to find now than inside Phase 4.
7. Send Phase 0 — the discovery prompt, staged verbatim at
   `prompts/agent/00_DISCOVER_PASSWORD_RESET_ARCHITECTURE.txt` in the pack.
   No code changes in that phase; the deliverable is an evidence-backed map of
   auth service, persistence, frontend routes, mail abstraction, i18n, test
   frameworks and governing rules.
8. Review the discovery output against the actual tree before allowing Phase 1.
   Pack §4: do not advance on unverified prose.

## Exact next agent prompt file

`D:\Freelance\Packs, Plans, And Prompts\ClawAI\ClawAI_Coding_Agent_Mentor_Driven_Feature_Qualification_Lab_Prompt_Pack_2026-08-07\prompts\agent\00_DISCOVER_PASSWORD_RESET_ARCHITECTURE.txt`

## Verdicts so far

Pack §13 requires the two goals to stay separate and never collapse into one
vague "done".

- **Goal A — market-ready coding-agent product:** NOT CERTIFIED. No 100-round
  conformance for any option family, no measured effort/speed-mode timings, and
  no human desktop follow-up/retry/resume qualification are recorded here.
- **Goal B — Password Reset by the agent:** NOT CERTIFIED. This audit did not
  inspect or alter the user-owned password-reset notes and does not infer agent
  provenance from repository contents.
