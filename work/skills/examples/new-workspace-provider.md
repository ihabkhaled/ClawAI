# Example: Adding a new workspace provider

Pattern reference for any OAuth-based provider (Gmail, Slack, GitHub, etc.).

## Skills fired

| Step                   | Skill                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| 1. Analysis doc        | `workspace-integrations/provider-analysis`                               |
| 2. OAuth flow design   | `workspace-integrations/oauth-strategy`                                  |
| 3. Adapter             | `workspace-integrations/adapter-implementation`, `backend/module-design` |
| 4. Sync design         | `workspace-integrations/sync-workflow`                                   |
| 5. Secret storage      | `security/secret-handling` (AES-256-GCM)                                 |
| 6. Rate limiting       | `security/dependency-risk` (provider risk), backend retries              |
| 7. Health              | `devops/health-endpoint-quality`                                         |
| 8. Testing             | `testing/integration-testing`, `e2e-manual-testing/manual-api-testing`   |
| 9. Frontend connect UI | `frontend/page-planning`, `frontend/form-design`                         |
| 10. Docs               | `documentation/technical-documentation`                                  |

## Minimum checklist per provider

- [ ] Analysis doc in `.claude/Integrations/<provider>__ANALYSIS.md`
- [ ] OAuth app registered, scopes minimal
- [ ] Adapter under `apps/claw-workspace-service/src/modules/workspace/adapters/<provider>.adapter.ts`
- [ ] Encrypted token storage
- [ ] Rate-limit-aware retry
- [ ] Health check hits a cheap endpoint
- [ ] Sync: full + incremental paths
- [ ] Webhook handling (if supported)
- [ ] Frontend connect flow
- [ ] QA script covers: connect, sync, failed-auth, disconnect
- [ ] Docs: `docs/07-integrations/<provider>.md`

## Critical rules

1. **Never store raw tokens.** AES-256-GCM always.
2. **Least-privilege scopes.** Request only what you use.
3. **Rate-limit first, retry second.** Respect 429 Retry-After.
4. **Webhook signature verification.** Every webhook.
5. **Isolation.** A failing provider MUST NOT take down other providers.
