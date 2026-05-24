# Runbook — Capturing Cross-OS Evidence for the Capability Framework

> Owner: Desktop Agent V2 Stream 02
> Added: 2026-05-24

ClawAI rules (`rules/00-master-rules.md`, repeated in
`CLAUDE.md` under "Hard rules added (desktop-agent-specific blockers)")
forbid claiming cross-OS support without real evidence files for
Windows, macOS, and Linux. This runbook defines exactly what an
operator must capture for each provider on each OS.

## Where evidence lives

```
.claude/Integrations/cross-os-evidence/
  YYYY-MM-DD-<stream>-windows.md
  YYYY-MM-DD-<stream>-macos.md
  YYYY-MM-DD-<stream>-linux.md
```

That directory is gitignored — evidence is a per-operator artefact, not
a shipped file. Reference paths from the relevant ADR or runbook.

## Required sections per evidence file

Every file MUST contain these sections, even if the result is "not
applicable" or "blocked":

1. **Environment**
   - OS name + version (Win 11 25H2 / macOS 14.5 / Ubuntu 24.04 etc.)
   - `claw-agent --version` output
   - `claw-agent doctor --json` full output
2. **Provider probe summary**
   - Paste the `providerProbes` section from doctor output verbatim
   - Note any optional dependency the operator INTENTIONALLY skipped
3. **Per-provider live runs**
   For every provider that probed healthy, run AT LEAST these ops and
   paste the raw `claw-agent` invocation + the response JSON:
   - TERMINAL: `SPAWN` of `echo hello`
   - FILESYSTEM: `READ` `LIST` `WRITE` `DELETE` on a tempdir
   - PROCESS: `LIST` (assert > 5 rows), `SPAWN` `node --version`, `KILL` it
   - BROWSER: `NAVIGATE` to `https://example.com`, assert `title` field
   - SCREEN: `CAPTURE_FULLSCREEN`, assert base64 length > 1024
   - CLIPBOARD: `WRITE` then `READ` the same string
   - NOTIFICATION: `NOTIFY` (operator manually confirms the toast appeared)
   - APPLICATION: `GET_STATE` (assert window list non-empty)
   - AUDIO: `TRANSCRIBE` a short clip (operator-supplied) — optional
4. **Recipe runner end-to-end**
   - Create a 2-step recipe: FILESYSTEM.READ → CLIPBOARD.WRITE
   - Run with `--dry-run` and paste the synthesised step outputs
   - Run for-real and paste the resulting CapabilityInvocation rows
5. **Docker log sanity** (server-side, captured from the cloud stack)
   - `docker logs claw-agent-service --tail 200`
   - `docker logs claw-audit-service --tail 200`
   - Confirm 0 lines with `UnhandledPromiseRejection` or `FATAL`
6. **Known issues / caveats**
   Any anomaly observed during the run, even if not blocking.

## Acceptance bar

A capability class is considered "supported on OS X" only when an
evidence file for OS X exists, was captured against a build no older
than 7 days, and contains a non-trivial output for every operation the
class declares.

ADRs (`docs/13-adr/ADR-030-filesystem-capability.md` et al) MUST
reference the evidence files they rely on. A future PR that breaks an
operation should also invalidate the corresponding evidence file (move
to `.claude/Integrations/cross-os-evidence/_stale/`) until a new run is
captured.

## See also

- `qa/cross-os-validation.md` — operator playbook with per-OS install commands
- `agent-cli/src/commands/doctor.command.js` — provider probes definition
- `plan-prompts/ClawAI_desktop_agent_v2_flagship_pack/02_cross_os_capability_provider_hardening.md`
- `docs/15-ai-context/desktop-agent-flagship-implementation-progress.md`
