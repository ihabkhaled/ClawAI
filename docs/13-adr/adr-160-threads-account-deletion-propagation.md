# ADR-160: Threads account deletion propagates through a durable event

**Status:** Accepted

**Date:** 2026-10-05

## Decision

Auth records account deletion and a `user.deleted` outbox event atomically. Auth publishes the event with bounded retries. Threads and Thread Generation consume it idempotently in their own databases and store hashed tombstones. Eligible approved public revisions remain available anonymously; private source snapshots, generation artifacts, reactions, and pending private requests are removed. Public comments are anonymized.

## Rationale

The services own separate databases, so synchronous cross-database deletion is not reliable. The outbox prevents losing propagation when Auth commits but RabbitMQ is unavailable. Tombstones make duplicate delivery safe and prevent delayed generation requests from recreating private data.

## Consequences

Deletion propagation is eventual. Consumers retry through RabbitMQ delivery and remain safe on duplicates. User identifiers are cleared from retained public records; tombstones use a one-way SHA-256 digest. Monitoring and QA must cover delayed delivery and anonymous public reads.
