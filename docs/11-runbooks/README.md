# Runbooks Index

> Operational runbooks for diagnosing and recovering ClawAI. Start with the
> **symptom → runbook** table, then drill into the categorized list.

## Symptom → runbook

| Symptom                                                                               | Start here                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A service won't start / crash-loops                                                   | [runbook-service-crash.md](runbook-service-crash.md) → check Docker logs, DB reachability, migrations                                                                                            |
| Uploads rejected: `antivirus_scan … ECONNREFUSED …:3310`                              | [runbook-clamav-unreachable.md](runbook-clamav-unreachable.md) → clamd died (OOM) inside a still-running container; restart, watchdog prevents recurrence                                        |
| Status page: "Web scraper: Crawl4AI/FlareSolverr/Firecrawl" Down; research degraded   | [runbook-scraper-sidecar-down.md](runbook-scraper-sidecar-down.md) → enabled row but container/profile not started, missing Crawl4AI token, or OOM                                               |
| Server unreachable / CPU 100% / disk full after deploys                               | [runbook-server-overloaded-by-builds.md](runbook-server-overloaded-by-builds.md) → `docker system df`, `.deploy/history.log`; releases no longer rebuild every image (ADR-123)                   |
| A new API route 404s as HTML in production                                            | [runbook-nginx-stale-config.md](runbook-nginx-stale-config.md) → nginx is pinned to a stale config inode; recreate the container                                                                 |
| A service fails on a symbol its source declares                                       | [runbook-stale-shared-package-dist.md](runbook-stale-shared-package-dist.md) → the container carries an image-baked `packages/*/dist`; rebuild the image                                         |
| Requests are slow / timing out                                                        | [runbook-high-latency.md](runbook-high-latency.md)                                                                                                                                               |
| Status page shows Degraded / Down / no history                                        | [runbook-status-page-degraded.md](runbook-status-page-degraded.md) → map the component to its services, then read the raw fan-out or Prometheus                                                  |
| A database is corrupt / needs restore                                                 | [runbook-database-recovery.md](runbook-database-recovery.md)                                                                                                                                     |
| The AI "forgot" something earlier in the thread                                       | [context-loss-triage.md](context-loss-triage.md) → read the receipt's `conversation` block; it says what was sent and why the rest was not                                                       |
| Routing picks the "wrong" model                                                       | [runbook-routing-misclassification.md](runbook-routing-misclassification.md)                                                                                                                     |
| A chat mode states web facts with no citations, or Consensus copies a fabricated lane | [runbook-fabricated-web-facts.md](runbook-fabricated-web-facts.md) → check whether evidence reached the prompt, then whether grounding fired for that mode                                       |
| `ollama pull` / model download fails                                                  | [runbook-model-pull-failure.md](runbook-model-pull-failure.md)                                                                                                                                   |
| Picking an image model always fails                                                   | [runbook-image-generation-failure.md](runbook-image-generation-failure.md) → did chat-service redirect it to image-service at all; read `image_generations.error_code`, never the stored message |
| TLS / cert / `Hostname doesn't match` errors                                          | [troubleshoot-tls.md](troubleshoot-tls.md)                                                                                                                                                       |
| Local frontier (llama.cpp) issues                                                     | [frontier-troubleshooting.md](frontier-troubleshooting.md) · [frontier-first-time-walkthrough.md](frontier-first-time-walkthrough.md)                                                            |
| A voice note is never transcribed / "transcription service is busy"                   | [runbook-voice-note-transcription-failed.md](runbook-voice-note-transcription-failed.md) → read the ranked walk in the file-service log; `kind=` names the cause                                 |
| An answer starts with the model's private notes ("Be concise.")                       | [rules/56](../../rules/56-model-reasoning-never-in-the-answer.md) → a reasoning channel reached `content`; GLM ends its reasoning with a bare `</think>`                                         |
| Chat says "every available AI provider failed"                                        | [runbook-provider-call-rejected.md](runbook-provider-call-rejected.md) → read the provider's own body; usually a dropped param or no credit                                                      |
| Provider connector: sync 500s but the test says OK                                    | [runbook-connector-model-sync-failure.md](runbook-connector-model-sync-failure.md) → the test toast lied; read `model_sync_runs.error_message`                                                   |
| Workspace connector sync failing                                                      | [runbook-workspace-automation.md](runbook-workspace-automation.md)                                                                                                                               |
| Billing reconciliation is stuck                                                       | [runbook-billing-reconciliation.md](runbook-billing-reconciliation.md)                                                                                                                           |
| Localized prices are wrong, absurd or all USD                                         | [runbook-display-fx-outage.md](runbook-display-fx-outage.md)                                                                                                                                     |
| A billing sweep or delivery job failed                                                | [runbook-failed-billing-sweep.md](runbook-failed-billing-sweep.md)                                                                                                                               |
| Credit paid for but never granted / nothing meters                                    | [runbook-payg-credit.md](runbook-payg-credit.md) → boot order, swallowed seed, empty price table; the log is not evidence                                                                        |
| Anything else                                                                         | [troubleshooting.md](troubleshooting.md) · [operational-runbooks.md](operational-runbooks.md)                                                                                                    |

> **Before any runbook**, do the standard triage from
> [../../skills/04-debug-toolkit.md](../../skills/04-debug-toolkit.md): Docker
> logs → DB query → API curl → RabbitMQ → nginx. Most incidents are diagnosed in
> that order. For build/compile failures, see
> [../08-runtime-devops/build-system.md §7](../08-runtime-devops/build-system.md#7-gotchas--troubleshooting).

## By category

### Core operations

- [operational-runbooks.md](operational-runbooks.md) — day-to-day ops
- [troubleshooting.md](troubleshooting.md) — general troubleshooting
- [runbook-service-crash.md](runbook-service-crash.md)
- [runbook-clamav-unreachable.md](runbook-clamav-unreachable.md)
- [runbook-scraper-sidecar-down.md](runbook-scraper-sidecar-down.md)
- [runbook-server-overloaded-by-builds.md](runbook-server-overloaded-by-builds.md)
- [runbook-high-latency.md](runbook-high-latency.md)
- [runbook-database-recovery.md](runbook-database-recovery.md)
- [troubleshoot-tls.md](troubleshoot-tls.md)

### Routing & models

- [runbook-routing-misclassification.md](runbook-routing-misclassification.md)
- [runbook-model-pull-failure.md](runbook-model-pull-failure.md)
- [runbook-image-generation-failure.md](runbook-image-generation-failure.md)
- [runbook-connector-model-sync-failure.md](runbook-connector-model-sync-failure.md)
- [runbook-provider-call-rejected.md](runbook-provider-call-rejected.md)
- [runbook-voice-note-transcription-failed.md](runbook-voice-note-transcription-failed.md)
- [runbook-fabricated-web-facts.md](runbook-fabricated-web-facts.md)

### Local frontier (llama.cpp)

- [frontier-first-time-walkthrough.md](frontier-first-time-walkthrough.md)
- [frontier-troubleshooting.md](frontier-troubleshooting.md)

### Desktop agent & capability framework

- [runbook-capability-framework.md](runbook-capability-framework.md)
- [runbook-filesystem-capability.md](runbook-filesystem-capability.md)
- [runbook-process-capability.md](runbook-process-capability.md)
- [runbook-browser-capability.md](runbook-browser-capability.md)
- [runbook-screen-capability.md](runbook-screen-capability.md)
- [runbook-application-capability.md](runbook-application-capability.md)
- [runbook-audio-capability.md](runbook-audio-capability.md)
- [runbook-clipboard-notification.md](runbook-clipboard-notification.md)
- [runbook-recipe-engine.md](runbook-recipe-engine.md)
- [runbook-activity-memory.md](runbook-activity-memory.md)
- [runbook-cross-os-evidence.md](runbook-cross-os-evidence.md)
- [runbook-desktop-agent-security.md](runbook-desktop-agent-security.md)
- [runbook-desktop-agent-qa-release-gate.md](runbook-desktop-agent-qa-release-gate.md)
- [runbook-desktop-agent-release-channels.md](runbook-desktop-agent-release-channels.md)
- [runbook-tauri-shell-release.md](runbook-tauri-shell-release.md)
- [runbook-marketplace.md](runbook-marketplace.md)

### Fleet & enterprise

- [runbook-fleet.md](runbook-fleet.md)
- [runbook-fleet-enterprise-sso.md](runbook-fleet-enterprise-sso.md)
- [runbook-saml-sso-production-tenant.md](runbook-saml-sso-production-tenant.md)

### Workspace

- [runbook-workspace-automation.md](runbook-workspace-automation.md)

### Billing

- [billing-operations.md](billing-operations.md)
- [runbook-billing-reconciliation.md](runbook-billing-reconciliation.md)
- [runbook-display-fx-outage.md](runbook-display-fx-outage.md)
- [runbook-failed-billing-sweep.md](runbook-failed-billing-sweep.md)
- [runbook-payg-credit.md](runbook-payg-credit.md) — deploying, verifying and killing PAYG connector credit
