# Runbook — Filesystem Capability (Stream 11)

The FILESYSTEM capability provider lives at `agent-cli/src/capability-providers/filesystem/index.js`. It implements 8 operations: READ, WRITE, APPEND, MOVE, COPY, DELETE, LIST, STAT.

## Defense-in-depth (provider-side)

Even after a policy approves a capability invocation, the provider re-validates:

- Path must be **absolute** (no relative; no `..` segments)
- Path ≤ 4096 chars
- READ ≤ 32 MB; WRITE/APPEND ≤ 32 MB
- Directory deletes don't capture inline undo (too large) — `noUndoReason='directory_delete_no_inline_undo'`
- File deletes capture original bytes if ≤ 5 MB; larger files flagged `file_too_large_for_inline_undo`

## undoPlan generation

| Operation | Undo (when reversible) | When IRREVERSIBLE |
|-----------|------------------------|-------------------|
| READ      | none — read-only       | always |
| WRITE     | restore original bytes (if ≤ 5 MB) OR delete (if file was new) | original > 5 MB |
| APPEND    | TRUNCATE to original size | — |
| MOVE      | MOVE back              | — |
| COPY      | DELETE the destination | — |
| DELETE    | WRITE with captured bytes (if ≤ 5 MB) | file > 5 MB or directory |
| LIST      | none                   | always |
| STAT      | none                   | always |

## Common operational issues

### "FS WRITE succeeded but undoPlan is null"

The pre-existing file was over `FS_UNDO_CAPTURE_MAX_BYTES` (5 MB). Recovery requires the user's own backup. Document this expectation in any client-facing recipe that targets large files.

### "Path traversal rejected for a path I think is safe"

The provider rejects ANY raw `..` segment in the input string, even if `path.normalize` would resolve it. Callers must pass already-resolved absolute paths. Recipe authors should use `$params.target_path` rather than constructing paths via interpolation.

### "FS DELETE on a directory came back without undoPlan"

By design — directory deletes don't capture inline undo. If the recipe needs reversibility, COPY to a snapshot location first, then DELETE.

## Cross-OS validation status

- Windows: smoke 17/17 host-side (this dev's machine — Windows 11)
- macOS: deferred — needs paired macOS device
- Linux: deferred — needs paired Linux device

## Related documents

- [ADR-030 — Filesystem Capability](../13-adr/ADR-030-filesystem-capability.md)
- [Capability Framework Runbook](runbook-capability-framework.md)
