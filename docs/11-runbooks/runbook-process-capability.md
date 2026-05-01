# Runbook — Process Capability (Stream 12)

The PROCESS capability provider lives at `agent-cli/src/capability-providers/process/index.js`. Implements 4 operations: SPAWN, KILL, LIST, INSPECT.

## Cross-OS strategy

The provider deliberately uses native shell utilities so we don't bundle a process library:

- Process listing: `tasklist /FO CSV /NH` (Windows) / `ps -A -o pid=,comm=` (Unix)
- Spawn: `child_process.spawn` with `shell: false` — bypasses the user's shell entirely (use TERMINAL.SPAWN if you want shell semantics).
- Kill: `process.kill(pid, signal)` with a fixed allow-list of 7 signals.

## Defense-in-depth

- SPAWN binary path must be absolute (no PATH lookups; no shell injection)
- args must be a string array, max 256 entries, each ≤ 4096 chars
- pid must be a positive integer
- signals limited to: SIGTERM, SIGINT, SIGHUP, SIGQUIT, SIGKILL, SIGUSR1, SIGUSR2

## All operations are IRREVERSIBLE

Every PROCESS operation records `noUndoReason`:
- SPAWN → `process_spawn_irreversible` (a separate KILL invocation can stop it, but that's a new approval)
- KILL → `signal_delivery_irreversible`
- LIST / INSPECT → `read_only_no_state_change`

## Common operational issues

### "PROCESS.KILL returned 'kill failed' for a known-running PID"

On Unix the user's process must own the target pid OR be root. The provider doesn't elevate privileges. If kill needs root, the user must be running agent-cli as root (rare; not recommended).

### "PROCESS.LIST returned <100 processes when system has thousands"

Output is capped at 2000 entries. Use `target.binaryNameRegex` to filter server-side (faster than client-side filtering).

### "tasklist not found" on Windows

The provider hard-depends on `tasklist.exe` being on PATH. It ships with all supported Windows versions. If missing (extremely stripped-down install), provider returns spawn_failed.

## Cross-OS validation status

Same as filesystem — Windows verified, macOS/Linux deferred.

## Related documents

- [ADR-031 — Process Capability](../13-adr/ADR-031-process-capability.md)
- [Capability Framework Runbook](runbook-capability-framework.md)
