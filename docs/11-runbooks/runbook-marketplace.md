# Runbook — Recipe Marketplace (Stream 42)

Backend at `apps/claw-agent-service/src/modules/marketplace/`. Routes:

- `POST /agent/marketplace/listings` — publish a signed listing
- `GET /agent/marketplace/listings` — browse published listings
- `GET /agent/marketplace/listings/:id` — single listing
- `POST /agent/marketplace/listings/:id/install` — install (sandbox-gated)
- `GET /agent/marketplace/listings/:id/analyse` — preview sandbox findings

## Two layers of defense

1. **Ed25519 signature verification** at publish AND install time. Tampered DSL fails verification immediately.
2. **Sandbox runner** (worker_threads + static analysis) gates every install. Banned filesystem paths, terminal injection patterns, and banned browser domains block install with a typed error.

## Common operational issues

### "MARKETPLACE_SIGNATURE_INVALID at publish time"

The signature must be over the **canonical JSON** of the DSL (sorted keys at every depth). The publisher's signing tool must use the same canonicaliser as `apps/claw-agent-service/src/modules/marketplace/utilities/signature.utility.ts:canonicaliseDsl`. See `qa/saml-mock-idp.mjs` for a reference signing helper.

### "MARKETPLACE_SANDBOX_BLOCKED at install"

Hit `GET /listings/:id/analyse` first to see findings. Common causes:
- Step targets a banned FS path (`/etc/`, `/sys/`, `.ssh`)
- Step's terminal command contains `curl|sh`, command substitution, or rm -rf chain
- Step's browser URL hits banking / SSO domains

If the listing is a false-positive, the publisher must restructure the DSL to avoid the banned pattern. There is no override — the gate is hard.

### "MARKETPLACE_SIGNATURE_REVALIDATION_FAILED at install"

Defense in depth: the install endpoint re-verifies the signature even though publish already did. This catches DB tampering — a malicious sysadmin who edited the listing's DSL row would see this error. If you see it in the wild, audit the database and rotate the listing.

### "Install succeeded but no Recipe row in my library"

The install path tries to create a Recipe in the user's library; if that fails (e.g., duplicate name) it logs a warning and proceeds with bookkeeping only. Check agent-service logs for `install: recipe create failed for <id>`.

## Health checks

```bash
# Listings published in the last 24h
docker exec claw-pg-agent psql -U claw -d claw_agent -tAc \
  "SELECT status, COUNT(*) FROM marketplace_listings \
   WHERE \"createdAt\" > NOW() - INTERVAL '1 day' GROUP BY status;"

# Top installed listings this week
docker exec claw-pg-agent psql -U claw -d claw_agent -c \
  "SELECT name, installs FROM marketplace_listings \
   ORDER BY installs DESC LIMIT 10;"
```

## Related documents

- [ADR-029 — Capability framework](../13-adr/ADR-029-capability-framework-and-policy-generalisation.md)
- [Capability Framework Runbook](runbook-capability-framework.md)
