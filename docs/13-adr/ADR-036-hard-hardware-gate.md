# ADR-036 — Hard hardware gate; override requires explicit body flag + audit trail

**Status:** Accepted
**Date:** 2026-04-26
**Authors:** Product Owner, Client Voice

## Context

A 400 GB Kimi K2 download takes 4 hours on a 100 Mbps connection. A user with insufficient RAM (e.g., 96 GB instead of 256 GB minimum) could blow 4 hours and 400 GB before discovering the model can't load. The "lazy" UX is a yellow warning toast and a downloadable button anyway.

R-60 in the Risk Register is rated **CRITICAL**: "user blames ClawAI for not working when their hardware is insufficient." This ADR exists to prevent that outcome.

## Decision

`PreflightValidatorManager.validate(model, hardware, allowOverride)`:

- **`DISK_INSUFFICIENT`** is **non-overridable**. Free disk < `requiredDiskGb × 1.05` → `POST /catalog/:id/pull` returns 422 regardless of override flag.
- **`RAM_INSUFFICIENT`** and **`GPU_INSUFFICIENT`** are overridable IF the request body sets `overrideHardwareGate: true` AND `LLAMACPP_PREFLIGHT_OVERRIDE_ALLOWED=true`.
- Every override is recorded to `PreflightOverrideAudit` table with `userId`, `modelName`, `reasons[]`, and the live `HardwareSnapshot`.
- The `llamacpp.preflight.overridden` event is published to RabbitMQ for `claw-audit-service` to ledger.

The frontend modal requires the user to **type the model size in GB** before the override checkbox can be enabled.

## Rationale

- **Disk failure is total.** A download that runs out of disk leaves a half-finished `.partial` file, locks the catalog entry in PULLING/ERROR state, and burns hours of user time. Make it impossible.
- **RAM failure is recoverable.** A user who insists on overriding RAM might have a swap setup, or might want to try anyway and accept slow performance.
- **Audit trail.** When a user opens a support ticket saying "your software crashed my machine", the audit row proves they explicitly accepted the override.
- **Friction is the feature.** Typing the model size is a deliberate speed bump — accidental clicks are blocked.

## Consequences

- **Power users do extra typing once per oversized model** — accepted as a one-time cost.
- **Support burden drops** — the audit row is the answer to "you let me download this".
- **Code path complexity:** `PullJobsService.create` must look up `PreflightOverrideAudit` insert path. Already implemented and tested.

## Alternatives considered

- **Soft warning, allow click-through.** Rejected — invites the exact disaster the gate is designed to prevent.
- **No override at all.** Rejected — alienates power users who legitimately want to push their hardware.
- **Override via a separate "advanced" endpoint.** Rejected — same number of clicks for the user, more API surface for us.
