# Service Guide: claw-threads-service

## Overview

| Property     | Value                              |
| ------------ | ---------------------------------- |
| Port         | 4019                               |
| Database     | None in the health-only foundation |
| Public route | `/api/v1/thread-publications`      |

This service is the future owner of publication revisions, owner approval, public reads, comments, reactions, change requests, and moderation state. The current foundation exposes only the authenticated service shell and public health endpoint.

## Boundaries

- Chat remains the owner of chat threads and messages; `/api/v1/threads` keeps its legacy chat alias.
- Generation jobs and private source snapshots belong to `claw-thread-generation-service`.
- Research evidence remains owned by `claw-research-service`.
- Cross-service data uses service APIs or RabbitMQ, never another service's database.

## References

- [Threads product spec](../02-business-product/clawai-threads-product-spec.md)
- [Threads architecture](../03-architecture/clawai-threads-architecture.md)
- [Backend service index](services-index.md)
