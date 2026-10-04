# Intake: runtime managed connector providers

**Status:** Implementation delivered; QA verdict PARTIAL and release NO-GO.  
**Source packs:** `clawai-admin-connector-provider-management-prompt.md` and
`clawai-4-free-connectors-implementation-prompt.md`.

The first pack is the delivery. The second is an acceptance matrix: NVIDIA NIM
fits the existing OpenAI-compatible adapter; Hugging Face task APIs, Pollinations
media, and AI Horde async execution need separate adapter work and are excluded.

## User outcome

An administrator can add an OpenAI-compatible provider definition, then create a
connector with encrypted credentials. The definition and connector persist in
connector-service's database. Synced models retain the provider key into the
catalog and AUTO routing. Provider management reuses `ADMIN_CONNECTORS_MANAGE`.

## Current completion state

Backend CRUD, the admin page, connector creation, generic execution, model
identity, and runtime routing support are implemented. Scoped service tests,
typechecks, builds, direct provider API CRUD, and admin browser CRUD passed.
Full evidence is in `../../qa-evidence/2026-10-03-runtime-managed-connector-providers.md`.
Role/plan-tier RBAC, Lighthouse/accessibility/performance, live NIM chat, and
GitHub CI remain open. Built-in provider rows now have reversible status
controls while preserving their existing adapters; production migration
validation remains open, so release remains NO-GO.
