# ADR-031: Process Management Capability Provider

- **Status**: Accepted
- **Date**: 2026-04-26
- **Author**: Desktop Agent Flagship working group

## Context

The existing terminal-command flow handles "run a shell string" but not structured process control: list running processes, kill by PID, send a signal, tail output of an agent-spawned process, set environment for a future spawn. Recipes need these primitives to express "stop my dev server then restart it with new env".

## Decision

CLI-side provider at `agent-cli/src/capability-providers/process/` with 6 operations: `spawn`, `list-running`, `kill`, `signal`, `set-env`, `tail-output`. A managed-process registry tracks PIDs the agent has spawned so the agent knows what it is allowed to safely tail/kill.

Safety design:

1. **PID 1 + system-service deny** — `deny-process-kill-pid-1` and `deny-process-kill-system-services` policies block kernel/kernel-thread/init/services across all OSes. Binary-name regex includes `init|systemd|launchd|services\.exe|wininit\.exe|csrss\.exe|smss\.exe|kernel.*|kthreadd|sshd|gpg-agent|ssh-agent`.
2. **UID match required** — `deny-process-kill-other-uid` policy blocks any kill where the target PID's UID is not the current process UID. Cross-OS via wrapped `ps-list` + manual UID check.
3. **Race-safe execute** — at execute time the CLI re-checks PID owner + binary name against the proposal. If either changed (process exited and PID was reused), the invocation FAILS with `executionError=PID_MISMATCH` rather than killing the wrong process.
4. **Grace period** — `kill` defaults to SIGTERM, waits `PROCESS_KILL_GRACE_SECONDS` (default 5s), then SIGKILL via `tree-kill` wrapper for cross-OS process-tree termination.
5. **Tail ring buffer** — agent-spawned process stdout/stderr held in 64KB × 2 (one each) ring buffer; SSE endpoint streams them.
6. **Allow-list for spawn** — `allow-process-spawn-known-binaries` policy permits MEDIUM-risk spawn of common dev tools (`node`, `python`, `python3`, `docker`, `npm`, `pnpm`, `yarn`, `git`, `make`, `go`, `cargo`, `rustc`, `deno`, `bun`, `tsc`, `vite`, `next`, `jest`, `vitest`). Unknown binaries are PENDING_APPROVAL with full path inspection.

8 default `AccessPolicy` rows seeded under `capabilityClass=PROCESS`. The `tail-output` op for agent-spawned PIDs is `AUTO_APPROVE` LOW since we own the process lineage.

## Consequences

**Positive**
- Race-safe kill (PID owner + binary re-check at execute time) prevents the classic "killed the wrong process because PID got reused" bug.
- Grace period gives processes a chance to clean up before SIGKILL.
- Managed-process registry isolates "things we spawned" from "everything on the system" — kill of agent-spawned PIDs is permissive; kill of arbitrary PIDs is HIGH-risk.

**Negative**
- Cross-OS process API differs (Win uses Win32 / wmic / tasklist+taskkill; macOS / Linux use POSIX). The wrapped `ps-list` + `tree-kill` libs cover most cases but rare edge cases (Windows PID re-use semantics) need manual cross-OS evidence per release.
- `process.tail-output` requires SSE; nginx must have `proxy_buffering off` on the new path (existing `/agent/*` SSE rules cover it; verify in stream-12 implementation).

## Alternatives Considered

- **Always require approval for any process op** — rejected: list-running and tail-output of agent-spawned PIDs are read-only and constant; user fatigue would kill product trust.
- **Spawn via shell instead of native** — rejected: can't track resulting process tree; can't safely kill children. Native spawn via `child_process` with `detached:true` and our own registry is more reliable.
- **Use existing TerminalCommand for spawn** — rejected: that schema bakes in shell-string semantics; structured spawn (binary + args + env) needs different fields.

## References

- Stream prompt: `plan-prompts/clawai_desktop_agent_flagship/12-stream-foundation-process-management.md`
- Default policies: `capability-policy.constants.ts` (rows starting `deny-process-`, `allow-process-`, `auto-approve-process-`, `catch-all-process-`)
- CLI provider (planned): `agent-cli/src/capability-providers/process/`
- Predecessor: terminal-command flow in `agent-cli/src/runtime/spawn-manager.js`
