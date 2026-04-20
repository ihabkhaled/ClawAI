# 05 — Token Refresh, Rotation, and Revocation Prompt

Design and implement a production-grade refresh and revocation model for ClawAI desktop agent.

Today there is no refresh endpoint and sessions expire due to stale heartbeat behavior. Fix that completely.

You must define:
1. access token lifetime
2. refresh token lifetime
3. sliding expiration policy
4. rotation on every refresh
5. reuse detection strategy
6. what happens when an old refresh token is reused
7. device revocation semantics
8. instant invalidation strategy
9. server-side hashing/storage model
10. client-side reaction to:
   - access expired
   - refresh expired
   - device revoked
   - suspicious reuse
   - server clock skew
11. migration from plain sessionKey
12. observability signals and audit events

Add:
- exact Prisma models
- endpoint contracts
- guard changes
- middleware/interceptor changes
- CLI retry logic and backoff
- device lifecycle state machine
- deprecation timeline for old auth

Testing must cover normal, race, stolen-token, and reconnect scenarios.
