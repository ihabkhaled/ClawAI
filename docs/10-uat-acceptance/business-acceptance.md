# Business Acceptance Criteria

Defines the acceptance criteria for ClawAI from a business perspective. Each feature area has specific pass/fail criteria, followed by operational readiness checklists and go-live requirements.

Last updated: 2026-04-09

---

## 1. Per-Feature Acceptance Checklist

### 1.1 Intelligent AI Routing

| #   | Criterion                                                | Pass Condition                                         | Status |
| --- | -------------------------------------------------------- | ------------------------------------------------------ | ------ |
| 1   | AUTO mode routes coding tasks to code-specialized models | Send 5 coding questions; >=4 route to Anthropic Claude |        |
| 2   | AUTO mode routes simple queries locally                  | Send 5 simple Q&A messages; >=4 route to local Ollama  |        |
| 3   | AUTO mode routes image-related tasks to vision models    | Send 3 image-related prompts; >=2 route to Gemini      |        |
| 4   | Fallback works when primary provider fails               | Disable primary connector; message still gets answered |        |
| 5   | All 7 routing modes function correctly                   | Test each mode with 2 messages; correct provider used  |        |
| 6   | Routing transparency shows decision rationale            | Every routed message has visible confidence + reasons  |        |
| 7   | Routing latency < 500ms for AUTO mode (warm Ollama)      | Measure 10 routing decisions; P95 < 500ms              |        |

### 1.2 Multi-Provider Chat

| #   | Criterion                                               | Pass Condition                                              | Status |
| --- | ------------------------------------------------------- | ----------------------------------------------------------- | ------ |
| 1   | Messages stream in real-time (SSE)                      | Token-by-token display visible; no batch loading            |        |
| 2   | Conversations persist across sessions                   | Close and reopen browser; all threads and messages intact   |        |
| 3   | Thread settings (temperature, max tokens) affect output | Change temperature to 0 vs 1; outputs differ in creativity  |        |
| 4   | System prompt is respected                              | Set "respond only in haiku"; AI follows instruction         |        |
| 5   | File attachments included in context                    | Attach CSV file; AI can answer questions about its contents |        |
| 6   | Context packs enrich AI responses                       | Attach context pack; AI uses pack knowledge in response     |        |
| 7   | Memory recall improves over time                        | Tell AI a preference; in new thread, AI remembers it        |        |
| 8   | Message feedback (thumbs up/down) records correctly     | Submit feedback; verify in audit logs                       |        |

### 1.3 Privacy and Data Control

| #   | Criterion                                         | Pass Condition                                             | Status |
| --- | ------------------------------------------------- | ---------------------------------------------------------- | ------ |
| 1   | LOCAL_ONLY mode never sends data to cloud         | Monitor network; zero external AI API calls in LOCAL_ONLY  |        |
| 2   | PRIVACY_FIRST prefers local                       | With healthy Ollama, all PRIVACY_FIRST messages stay local |        |
| 3   | Routing transparency shows privacy classification | Privacy class (LOCAL/CLOUD) visible in routing details     |        |
| 4   | Connector API keys never appear in logs           | Search all log files; no API keys in plaintext             |        |
| 5   | Passwords never appear in logs                    | Search all log files; no password values in plaintext      |        |

### 1.4 User Management and Access Control

| #   | Criterion                           | Pass Condition                                        | Status |
| --- | ----------------------------------- | ----------------------------------------------------- | ------ |
| 1   | Three roles function correctly      | Admin, Operator, Viewer each have appropriate access  |        |
| 2   | Admin can create/edit/disable users | Full CRUD on user accounts verified                   |        |
| 3   | Session management works            | Login, session persists, refresh works, logout clears |        |
| 4   | Concurrent sessions supported       | Same user logged in on two browsers simultaneously    |        |
| 5   | Disabled user cannot access system  | Disable account; verify immediate lockout             |        |

### 1.5 Connector Management

| #   | Criterion                                | Pass Condition                                                  | Status |
| --- | ---------------------------------------- | --------------------------------------------------------------- | ------ |
| 1   | CRUD operations for all provider types   | Create, read, update, delete connectors for each provider       |        |
| 2   | Connection testing validates API keys    | Valid key shows success; invalid key shows failure              |        |
| 3   | Model sync fetches available models      | Sync pulls provider's model catalog; models appear in selector  |        |
| 4   | Health checks detect unhealthy providers | Unhealthy provider shows warning; excluded from routing         |        |
| 5   | Encrypted storage of credentials         | API keys encrypted in database; raw key not retrievable via API |        |

### 1.6 Observability and Audit

| #   | Criterion                                 | Pass Condition                                                    | Status |
| --- | ----------------------------------------- | ----------------------------------------------------------------- | ------ |
| 1   | All user actions create audit records     | Login, message send, connector change all appear in audit log     |        |
| 2   | Usage tracking captures token consumption | Token counts per provider/model visible in usage dashboard        |        |
| 3   | Health dashboard shows all service status | All 13 services show health; unhealthy service highlighted        |        |
| 4   | Logs searchable by service, level, time   | Filter logs by each dimension; results match filters              |        |
| 5   | Audit logs retained indefinitely          | Verify no TTL on audit collection; logs from 30+ days ago present |        |

### 1.7 Internationalization

| #   | Criterion                           | Pass Condition                                        | Status |
| --- | ----------------------------------- | ----------------------------------------------------- | ------ |
| 1   | All 8 languages complete            | Switch to each language; no untranslated keys visible |        |
| 2   | Arabic RTL layout correct           | Full RTL mirroring; text alignment; sidebar position  |        |
| 3   | Language preference persists        | Set language; reload; language unchanged              |        |
| 4   | Date/number formatting locale-aware | Dates and numbers formatted per selected locale       |        |

---

## 2. Business Readiness Assessment

### 2.1 Functional Readiness

| Area       | Requirement                                         | Ready? | Notes |
| ---------- | --------------------------------------------------- | ------ | ----- |
| Core chat  | Send/receive messages with AI providers             |        |       |
| Routing    | All 7 modes operational; AUTO with Ollama           |        |       |
| Auth       | Login, RBAC, session management                     |        |       |
| Connectors | At least 2 cloud providers configured and healthy   |        |       |
| Memory     | Extraction and recall functional                    |        |       |
| Files      | Upload, chunk, attach to messages                   |        |       |
| Audit      | Events recorded; usage tracked                      |        |       |
| Health     | All services reporting status                       |        |       |
| i18n       | At least English fully complete; others best-effort |        |       |

### 2.2 Non-Functional Readiness

| Area           | Requirement                          | Metric                                     | Ready? |
| -------------- | ------------------------------------ | ------------------------------------------ | ------ |
| Response time  | Chat message to first token          | < 3 seconds (cloud), < 5 seconds (local)   |        |
| Availability   | System uptime during business hours  | > 99% over test period                     |        |
| Concurrency    | Simultaneous active users            | >= 5 without degradation                   |        |
| Data integrity | No data loss during normal operation | Zero lost messages over test period        |        |
| Security       | No critical vulnerabilities          | Penetration test or security review passed |        |
| Recoverability | System recovers from service crash   | Auto-restart within 30 seconds             |        |

---

## 3. Operational Readiness

### 3.1 Deployment Readiness

| Item                      | Description                                                | Status |
| ------------------------- | ---------------------------------------------------------- | ------ |
| Docker Compose validated  | All containers start successfully from clean state         |        |
| Environment configuration | `.env.example` covers all variables; documented            |        |
| Database migrations       | All Prisma migrations apply cleanly on fresh databases     |        |
| Seed data                 | Admin user created on first startup                        |        |
| Ollama models             | 5 default models pull successfully on startup              |        |
| Nginx routes              | All 20+ route mappings tested and functional               |        |
| Health checks             | All 13 services report healthy within 2 minutes of startup |        |

### 3.2 Monitoring Readiness

| Item                | Description                                            | Status |
| ------------------- | ------------------------------------------------------ | ------ |
| Service health      | Health endpoint aggregates all services                |        |
| Log aggregation     | Client and server logs collected with 30-day retention |        |
| Audit trail         | All user actions recorded with timestamps              |        |
| Usage tracking      | Token consumption tracked per provider                 |        |
| RabbitMQ dashboard  | Management UI accessible (port 15672)                  |        |
| Database monitoring | Connection pool and query performance observable       |        |
| Disk usage          | Storage usage monitorable per volume                   |        |

### 3.3 Backup Readiness

| Item                | Description                                | Status |
| ------------------- | ------------------------------------------ | ------ |
| PostgreSQL backup   | Automated daily backup for all 8 databases |        |
| MongoDB backup      | Automated daily backup for all 3 databases |        |
| Backup verification | Restore from backup tested successfully    |        |
| Backup retention    | 30-day retention with offsite copy         |        |
| Recovery time       | Documented RTO and RPO                     |        |

---

## 4. Support Readiness

### 4.1 Documentation

| Document                     | Audience              | Status |
| ---------------------------- | --------------------- | ------ |
| System architecture overview | Engineering team      |        |
| Service-level deep dives     | Backend developers    |        |
| Frontend architecture guide  | Frontend developers   |        |
| Deployment runbook           | DevOps/Platform       |        |
| Troubleshooting guide        | Support/Operations    |        |
| API reference (Swagger)      | Integrators           |        |
| User guide                   | End users             |        |
| Admin guide                  | System administrators |        |

### 4.2 Operational Procedures

| Procedure               | Description                               | Documented? |
| ----------------------- | ----------------------------------------- | ----------- |
| System startup          | Start all services from scratch           |             |
| System shutdown         | Graceful shutdown procedure               |             |
| Service restart         | Restart individual service without outage |             |
| Database migration      | Apply schema changes safely               |             |
| Log investigation       | Find and analyze relevant logs            |             |
| Connector setup         | Add new cloud provider connection         |             |
| User management         | Create, modify, disable user accounts     |             |
| Backup and restore      | Execute backup; restore from backup       |             |
| Incident response       | Steps when a service is unhealthy         |             |
| Ollama model management | Pull, remove, reassign model roles        |             |

### 4.3 Known Issues Register

Maintain a list of known issues with workarounds that support staff can reference:

| Category    | Issue                                 | Workaround                                                  |
| ----------- | ------------------------------------- | ----------------------------------------------------------- |
| Performance | Ollama cold start takes 10-30s        | Expected behavior; inform users first request may be slow   |
| Quality     | Local models lower quality than cloud | Use AUTO or cloud-specific modes for quality-critical tasks |
| Files       | Only text/CSV/JSON/MD supported       | Convert other formats before upload                         |
| Scaling     | Single-instance services              | Monitor resource usage; restart if needed                   |

---

## 5. Go-Live Checklist

### 5.1 Pre-Launch (T-7 days)

- [ ] All Critical and High UAT scenarios passed
- [ ] No Critical severity defects open
- [ ] High severity defects either fixed or have documented workarounds
- [ ] Database backups automated and tested
- [ ] Monitoring and alerting configured
- [ ] Deployment runbook reviewed and validated
- [ ] Admin user credentials set (not default values)
- [ ] ENCRYPTION_KEY generated and secured
- [ ] JWT_SECRET generated and secured
- [ ] All connector API keys configured and tested
- [ ] Ollama models pulled and role assignments verified

### 5.2 Launch Day (T-0)

- [ ] Fresh deployment from clean state verified
- [ ] All 13 services healthy
- [ ] All database migrations applied successfully
- [ ] Admin can log in
- [ ] Sample chat message succeeds (local + cloud)
- [ ] Audit log records launch-day activity
- [ ] Health dashboard shows all green
- [ ] RabbitMQ management UI accessible
- [ ] No error-level entries in server logs (beyond expected startup noise)
- [ ] Stakeholder sign-off obtained

### 5.3 Post-Launch (T+1 to T+7)

- [ ] Monitor error rates daily
- [ ] Check disk usage across all database volumes
- [ ] Verify audit log accumulation (not growing unboundedly without TTL where expected)
- [ ] Verify log rotation working (MongoDB TTL cleaning up old client/server logs)
- [ ] Check RabbitMQ queue depths (no growing backlogs)
- [ ] Collect user feedback
- [ ] Review and triage any new defects
- [ ] Verify backup jobs executed successfully each day
- [ ] Performance baseline established (response times, token throughput)

---

## 6. Rollback Plan

If critical issues are discovered post-launch:

### 6.1 Service-Level Rollback

For issues isolated to a single service:

1. Identify the affected service from health dashboard or logs.
2. Stop the affected container: `docker compose stop <service-name>`.
3. Rebuild with the previous image: `docker compose build <service-name> --no-cache`.
4. Restart: `docker compose up -d <service-name>`.
5. Verify health check passes.
6. If the issue involved a database migration, consult the migration rollback procedure (manual SQL).

### 6.2 Full System Rollback

For systemic issues affecting multiple services:

1. Notify all users of planned downtime.
2. Stop all services: `docker compose down`.
3. Restore databases from most recent backup.
4. Checkout the previous known-good git tag/commit.
5. Rebuild all containers: `docker compose build --no-cache`.
6. Start all services: `docker compose up -d`.
7. Verify all 13 services healthy.
8. Verify data integrity (spot-check recent threads, users, connectors).
9. Notify users of service restoration.

### 6.3 Rollback Decision Matrix

| Severity | Impact                           | Action                                      | Decision Maker            |
| -------- | -------------------------------- | ------------------------------------------- | ------------------------- |
| Critical | Data loss or security breach     | Immediate full rollback                     | Tech Lead + Product Owner |
| Critical | Core feature broken (chat, auth) | Service rollback within 1 hour              | Tech Lead                 |
| High     | Non-core feature broken          | Hotfix preferred; rollback if fix > 4 hours | Tech Lead                 |
| Medium   | Degraded experience              | Schedule fix for next business day          | Product Owner             |
| Low      | Cosmetic or minor                | Fix in next regular release                 | Development team          |

---

## Approval

| Role            | Name | Date | Signature |
| --------------- | ---- | ---- | --------- |
| Product Owner   |      |      |           |
| Tech Lead       |      |      |           |
| QA Lead         |      |      |           |
| Operations Lead |      |      |           |
