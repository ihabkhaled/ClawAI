> **Canonical source:** `docs/11-runbooks/README.md`

# Runbooks Index

> Operational runbooks for diagnosing and recovering ClawAI. Start with the
> **symptom → runbook** table, then drill into the categorized list.

## Symptom → runbook

| Symptom                                            | Start here                                                                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A service won't start / crash-loops                | [runbook-service-crash.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-service-crash.md) → check Docker logs, DB reachability, migrations                                                    |
| A new API route 404s as HTML in production         | [runbook-nginx-stale-config.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-nginx-stale-config.md) → nginx is pinned to a stale config inode; recreate the container                         |
| A service fails on a symbol its source declares    | [runbook-stale-shared-package-dist.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-stale-shared-package-dist.md) → the container carries an image-baked `packages/*/dist`; rebuild the image |
| Requests are slow / timing out                     | [runbook-high-latency.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-high-latency.md)                                                                                                       |
| A database is corrupt / needs restore              | [runbook-database-recovery.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-database-recovery.md)                                                                                             |
| The AI "forgot" something earlier in the thread    | [context-loss-triage.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/context-loss-triage.md) → read the receipt's `conversation` block; it says what was sent and why the rest was not               |
| Routing picks the "wrong" model                    | [runbook-routing-misclassification.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-routing-misclassification.md)                                                                             |
| `ollama pull` / model download fails               | [runbook-model-pull-failure.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-model-pull-failure.md)                                                                                           |
| TLS / cert / `Hostname doesn't match` errors       | [troubleshoot-tls.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/troubleshoot-tls.md)                                                                                                               |
| Local frontier (llama.cpp) issues                  | [frontier-troubleshooting.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/frontier-troubleshooting.md) · [frontier-first-time-walkthrough.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/frontier-first-time-walkthrough.md)                    |
| Chat says "every available AI provider failed"     | [runbook-provider-call-rejected.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-provider-call-rejected.md) → read the provider's own body; usually a dropped param or no credit              |
| Provider connector: sync 500s but the test says OK | [runbook-connector-model-sync-failure.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-connector-model-sync-failure.md) → the test toast lied; read `model_sync_runs.error_message`           |
| Workspace connector sync failing                   | [runbook-workspace-automation.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-workspace-automation.md)                                                                                       |
| Billing reconciliation is stuck                    | [runbook-billing-reconciliation.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-billing-reconciliation.md)                                                                                   |
| Localized prices are wrong, absurd or all USD      | [runbook-display-fx-outage.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-display-fx-outage.md)                                                                                             |
| A billing sweep or delivery job failed             | [runbook-failed-billing-sweep.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-failed-billing-sweep.md)                                                                                       |
| Credit paid for but never granted / nothing meters | [runbook-payg-credit.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-payg-credit.md) → boot order, swallowed seed, empty price table; the log is not evidence                                |
| Anything else                                      | [troubleshooting.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/troubleshooting.md) · [operational-runbooks.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/operational-runbooks.md)                                                            |

> **Before any runbook**, do the standard triage from
> [../../skills/04-debug-toolkit.md](https://github.com/ihabkhaled/ClawAI/blob/main/skills/04-debug-toolkit.md): Docker
> logs → DB query → API curl → RabbitMQ → nginx. Most incidents are diagnosed in
> that order. For build/compile failures, see
> [../08-runtime-devops/build-system.md §7](https://github.com/ihabkhaled/ClawAI/blob/main/docs/08-runtime-devops/build-system.md#7-gotchas--troubleshooting).

## By category

### Core operations

- [operational-runbooks.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/operational-runbooks.md) — day-to-day ops
- [troubleshooting.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/troubleshooting.md) — general troubleshooting
- [runbook-service-crash.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-service-crash.md)
- [runbook-high-latency.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-high-latency.md)
- [runbook-database-recovery.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-database-recovery.md)
- [troubleshoot-tls.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/troubleshoot-tls.md)

### Routing & models

- [runbook-routing-misclassification.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-routing-misclassification.md)
- [runbook-model-pull-failure.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-model-pull-failure.md)
- [runbook-connector-model-sync-failure.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-connector-model-sync-failure.md)
- [runbook-provider-call-rejected.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-provider-call-rejected.md)

### Local frontier (llama.cpp)

- [frontier-first-time-walkthrough.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/frontier-first-time-walkthrough.md)
- [frontier-troubleshooting.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/frontier-troubleshooting.md)

### Desktop agent & capability framework

- [runbook-capability-framework.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-capability-framework.md)
- [runbook-filesystem-capability.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-filesystem-capability.md)
- [runbook-process-capability.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-process-capability.md)
- [runbook-browser-capability.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-browser-capability.md)
- [runbook-screen-capability.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-screen-capability.md)
- [runbook-application-capability.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-application-capability.md)
- [runbook-audio-capability.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-audio-capability.md)
- [runbook-clipboard-notification.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-clipboard-notification.md)
- [runbook-recipe-engine.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-recipe-engine.md)
- [runbook-activity-memory.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-activity-memory.md)
- [runbook-cross-os-evidence.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-cross-os-evidence.md)
- [runbook-desktop-agent-security.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-desktop-agent-security.md)
- [runbook-desktop-agent-qa-release-gate.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-desktop-agent-qa-release-gate.md)
- [runbook-desktop-agent-release-channels.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-desktop-agent-release-channels.md)
- [runbook-tauri-shell-release.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-tauri-shell-release.md)
- [runbook-marketplace.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-marketplace.md)

### Fleet & enterprise

- [runbook-fleet.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-fleet.md)
- [runbook-fleet-enterprise-sso.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-fleet-enterprise-sso.md)
- [runbook-saml-sso-production-tenant.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-saml-sso-production-tenant.md)

### Workspace

- [runbook-workspace-automation.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-workspace-automation.md)

### Billing

- [billing-operations.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/billing-operations.md)
- [runbook-billing-reconciliation.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-billing-reconciliation.md)
- [runbook-display-fx-outage.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-display-fx-outage.md)
- [runbook-failed-billing-sweep.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-failed-billing-sweep.md)
- [runbook-payg-credit.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/11-runbooks/runbook-payg-credit.md) — deploying, verifying and killing PAYG connector credit

