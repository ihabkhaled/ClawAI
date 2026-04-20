# 07 — Agent Service Schema, Guards, and Runtime Prompt

Redesign `claw-agent-service` so it supports durable devices, secure auth, stronger runtime state, and future power features.

The output must cover:
1. Prisma schema evolution
2. repository/service refactors
3. shared ownership-check helpers
4. pagination helper extraction
5. removal or real use of dead modules (`RedisService`, `ENCRYPTION_KEY`)
6. guard model:
   - user auth guard
   - device access-token guard
   - device refresh token handling
   - scope guard
   - admin/team device guard
7. event model:
   - session/device connected
   - device revoked
   - command requested/approved/started/streamed/completed/cancelled
   - file event observed
   - script scheduled/fired
8. runtime state model:
   - device
   - connection/session
   - command run
   - scheduled job
   - live stream
9. heartbeat redesign:
   - what remains heartbeat-based
   - what is no longer coupled to auth expiry
10. Redis role if retained:
   - presence
   - revocation cache
   - command stream fanout
   - rate limits
11. health endpoint upgrades:
   - dependency-aware health
   - queue/db/redis status
12. performance and resilience considerations

Do not only suggest models. Provide exact implementation boundaries and module map.
