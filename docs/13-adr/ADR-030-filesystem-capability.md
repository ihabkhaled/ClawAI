# ADR-030: Filesystem Capability Provider

- **Status**: Accepted
- **Date**: 2026-04-26
- **Author**: Desktop Agent Flagship working group

## Context

Filesystem is the foundation capability for ~60% of recipes (organise downloads, find duplicates, backup, scan content). The existing CLI has a `FileWatchEvent`-only path; full read/write/delete/move with safety guarantees does not exist. `FS_READ` and `FS_WRITE` `DeviceScope` enum values are defined but unwired.

## Decision

CLI-side provider at `agent-cli/src/capability-providers/filesystem/` implementing 11 operations: `read`, `write`, `append`, `move`, `delete`, `mkdir`, `list`, `stat`, `watch`, `search-content`, `diff`. Backend records the capability invocation and the undoPlan; the CLI runs the actual fs work because that is where the user's filesystem lives.

Key safety design:

1. **Path canonicalisation** — every input path is `path.resolve()`d, then symlinks resolved (`fs.realpath`), then re-checked against allow-globs. Symlink escapes (`~/safe-link → /etc`) are blocked.
2. **Default deny-globs** — `/etc/**`, `/sys/**`, `/proc/**`, `/boot/**`, `C:/Windows/**`, `C:/Program Files/**`, `**/.ssh/**`, `**/.aws/**`, `**/.kube/**`, `**/credentials*`, `**/.env*`, `**/id_rsa*`, `**/id_ed25519*`. Configurable via `FS_DEFAULT_DENY_GLOBS`.
3. **Default allow-globs** — `~/Documents/**`, `~/Downloads/**`, `~/Desktop/**`, `~/Pictures/**`, `~/Videos/**`, `~/Music/**`. Configurable via `FS_DEFAULT_ALLOW_GLOBS`.
4. **Delete defaults to OS trash** (`gio trash` on Linux, `NSWorkspace recycleURLs` on macOS, `SHFileOperation` on Windows). Permanent delete requires `payload.permanent=true` AND matches `always-pending-fs-permanent-delete` policy (HIGH risk, never AUTO_APPROVE).
5. **undoPlan for COMPENSATABLE writes** — `fs.write` records the original file content as a base64 blob in `undoPlan.steps[0].payload.contentBase64`. Rollback writes it back byte-for-byte.
6. **Cross-filesystem moves fall back** to copy + delete-with-marker so that an interrupted move is still rollback-able.
7. **Search-content cap** at 1000 matches; **list cap** at 10000 entries.
8. **Watch depth cap** at `FS_MAX_WATCH_DEPTH` (default 5); event dedup window 250ms.

10 default `AccessPolicy` rows seeded under `capabilityClass=FILESYSTEM`. See `apps/claw-agent-service/src/common/constants/capability-policy.constants.ts`.

## Consequences

**Positive**
- Symlink + glob defence prevents the most common path-traversal escape.
- OS trash as default makes accidental delete recoverable without backend round-trip.
- Cross-filesystem moves are rollback-safe (copy+delete with marker).

**Negative**
- The cross-OS path semantics (Win backslash, mac case-insensitive HFS, Linux case-sensitive ext4) require careful normalization; a single `path-resolver.js` helper module owns this.
- Search-content over 1M+ files can take minutes; cap at 1000 matches is a UX trade-off that may surprise power users (mitigated by clear truncation banner in result).

## Alternatives Considered

- **Per-OS `chrootjail` or container** for filesystem access — rejected: too invasive, would break the agent's "operates on YOUR files" promise.
- **No allow-globs by default, deny-only** — rejected: too easy to accidentally allow `/`. Allow-list is the default, deny-list narrows it.
- **Cloud-staged fs.write with backup-to-S3** — rejected: violates local-first promise; user files leave the device.

## References

- Stream prompt: `plan-prompts/clawai_desktop_agent_flagship/11-stream-foundation-filesystem-capability.md`
- Default policies: `capability-policy.constants.ts` (rows starting `deny-fs-`, `allow-fs-`, `auto-approve-fs-`, `always-pending-fs-`, `catch-all-fs-`)
- Trash wrappers: `agent-cli/src/capability-providers/filesystem/helpers/trash.js` (planned)
- Path resolver: `agent-cli/src/capability-providers/filesystem/helpers/path-resolver.js` (planned)
- Predecessor: existing `FileWatchEvent` table + chokidar runtime in `agent-cli/src/runtime/file-watcher.js`
