# Service Guide: claw-thread-generation-service

## Overview

| Property   | Value                              |
| ---------- | ---------------------------------- |
| Port       | 4020                               |
| Database   | None in the health-only foundation |
| Public API | None; internal worker boundary     |

This isolated service is planned to own durable generation jobs, queue workers, immutable private source snapshots, author/review rounds, aggregate spend-cap enforcement, and owner-review readiness. The current foundation exposes only its service shell and public health endpoint.

## Boundaries

- The publication and community service owns approved public revisions.
- Chat supplies filtered snapshots through an internal API; this service never reads the chat database.
- Research evidence remains owned by `claw-research-service`.
- Existing entitlements and credit holds apply; no PAYG price surface is added.

## References

- [Threads product spec](../02-business-product/clawai-threads-product-spec.md)
- [Threads architecture](../03-architecture/clawai-threads-architecture.md)
- [Backend service index](services-index.md)
