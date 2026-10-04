# ADR-159: ClawAI Threads uses publication and generation services

- **Status:** Accepted
- **Date:** 2026-10-04
- **Deciders:** Product owner
- **Related:** [Threads product spec](../02-business-product/clawai-threads-product-spec.md) · [architecture](../03-architecture/clawai-threads-architecture.md)

## Context

Threads creates sourced publications from private chat and adds public
community actions. Generation is long-running, metered, and retryable. Chat and
research already own their data and APIs; publication and job state have
different security and lifecycle needs.

## Decision

Use `claw-threads-service` for publication and community state and
`claw-thread-generation-service` for isolated jobs and workers. Chat returns
immutable filtered snapshots; research remains in research-service. Reuse
existing auth, entitlement, credit, moderation, and discovery systems. Keep
`/api/v1/threads` for chat and expose publication APIs under
`/api/v1/thread-publications`.

Generation requires a user-selected spend cap and visible publication/indexing
disclosure. Starting generation records intent; a draft stays private until
owner approval. Approved work remains public after account deletion with
anonymous attribution; private generation data is erased.

## Consequences

The feature needs two service workspaces, separate data ownership, an internal
queue, and explicit lifecycle integration. Public indexing must remain
independent of chat-share eligibility. Every pushed batch must be deploy-safe
because pushes to main trigger release and deployment.
