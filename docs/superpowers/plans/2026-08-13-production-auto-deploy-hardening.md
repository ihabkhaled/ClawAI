# Production Auto-Deploy Hardening Implementation Plan

**Goal:** Preserve the existing release deployment architecture, recover from transient build downloads, and serve a branded maintenance response while the frontend is unavailable.

**Spec:** `docs/superpowers/specs/2026-08-13-production-auto-deploy-hardening-design.md`

## Constraints

- Never edit tracked files directly on `/srv/clawai`.
- Deploy only the exact release SHA supplied by GitHub Actions.
- Never touch database containers, volumes, or reverse migrations.
- Never bypass Git hooks or expose secrets.

## Tasks

1. Verify the existing CI-to-release-to-deploy chain and exact-SHA tests remain green.
2. Add red tests and implement at most two retries for recognized transient Docker build network errors.
3. Add red tests, a self-contained ClawAI maintenance page, and frontend-only nginx 502/503/504 interception through the existing read-only mount.
4. Validate focused tests, shell/nginx syntax, affected workspaces, generated artifacts, commit hooks, and PR checks.
5. After merge, observe automatic deployment and verify production state over read-only SSH commands.
