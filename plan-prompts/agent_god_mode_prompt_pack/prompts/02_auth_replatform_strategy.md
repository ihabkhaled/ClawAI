# 02 — Auth Replatform Strategy Prompt

Design the full future authentication architecture for ClawAI desktop agent.

You must solve:
- no copy-paste auth
- durable authorization after initial approval
- silent refresh without user friction
- secure revocation
- secure storage on client
- headless and GUI use cases
- self-hosted compatibility
- migration from legacy sessionKey model

Use this decision framework:
1. compare magic-link pairing, loopback PKCE, device-code grant (RFC 8628), custom URL schemes, QR pairing
2. explicitly justify the chosen primary flow and fallback flow
3. define token model:
   - access token
   - refresh token
   - token rotation
   - reuse detection
   - scopes
   - device binding
   - expiry strategy
4. define DB changes:
   - Device
   - RefreshToken
   - PairingRequest
   - migration path from AgentSession
5. define backend endpoints:
   - pair/init
   - pair/approve
   - device-code/create
   - device-code/token
   - auth/refresh
   - auth/revoke
   - device list
   - device revoke
6. define CLI behavior:
   - login
   - auto-refresh on 401
   - logout
   - whoami
   - doctor
7. define frontend behavior:
   - connect device page
   - approve/cancel device screen
   - settings/devices management
8. define security controls:
   - hashed refresh tokens
   - revoked-device blocking
   - suspicious refresh-token reuse handling
   - audit trail
9. define migration from sessionKey and how to sunset it safely

Be concrete: endpoints, DTOs, claims, TTLs, state diagrams, failure paths, and rollout sequence.
