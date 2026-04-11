# Admin Dashboard Product Specification

## Overview

ClawAI provides comprehensive administrative capabilities for managing users, monitoring system health, reviewing audit logs, tracking usage costs, and configuring routing policies. Admin features are restricted to users with the ADMIN role via RBAC enforcement.

---

## Admin Features by Page

### 1. User Management (Admin Page)

**Access**: ADMIN only

| Action | Description |
| --- | --- |
| List Users | Paginated table: email, username, role badge, status badge, last login |
| Create User | Form: email, username, temporary password, role (ADMIN/OPERATOR/VIEWER) |
| Update User | Change username, email, role |
| Deactivate User | Disable account (cannot log in, data preserved) |
| Reactivate User | Re-enable a deactivated account |
| Change Role | Promote/demote between ADMIN, OPERATOR, VIEWER |

**Business Rules**:
- Cannot deactivate your own account
- Cannot change your own role
- Email must be unique across all users
- Password is hashed with argon2 before storage

### 2. System Health (Observability Page)

**Access**: All roles (read-only)

Aggregated health dashboard checking all 13 backend services:

| Service | Port | Health Check |
| --- | --- | --- |
| auth-service | 4001 | HTTP GET /health |
| chat-service | 4002 | HTTP GET /health |
| connector-service | 4003 | HTTP GET /health |
| routing-service | 4004 | HTTP GET /health |
| memory-service | 4005 | HTTP GET /health |
| file-service | 4006 | HTTP GET /health |
| audit-service | 4007 | HTTP GET /health |
| ollama-service | 4008 | HTTP GET /health |
| health-service | 4009 | Aggregator |
| client-logs-service | 4010 | HTTP GET /health |
| server-logs-service | 4011 | HTTP GET /health |
| image-service | 4012 | HTTP GET /health |
| file-generation-service | 4013 | HTTP GET /health |

**Display**: Green/yellow/red status per service, last check timestamp, response time.

### 3. Audit Logs (Audits Page)

**Access**: ADMIN full access, OPERATOR read-only

10 auditable event types:

| Event | Source | Description |
| --- | --- | --- |
| user.login | auth-service | User authentication |
| user.logout | auth-service | Session termination |
| message.completed | chat-service | AI response generated |
| routing.decision_made | routing-service | Model selection recorded |
| connector.created | connector-service | New provider configured |
| connector.updated | connector-service | Provider config changed |
| connector.deleted | connector-service | Provider removed |
| connector.synced | connector-service | Model sync completed |
| connector.health_checked | connector-service | Health check result |
| memory.extracted | memory-service | Memories extracted from conversation |

**Filtering**: By date range, user, action type, severity, entity type.

**Each entry shows**: Timestamp, action, user, entity type, entity ID, severity badge, expandable details.

### 4. Usage Dashboard (Usage Page)

**Access**: ADMIN full access, OPERATOR read-only

| Metric | Visualization | Source |
| --- | --- | --- |
| Token consumption by provider | Bar chart | UsageLedger |
| Cost breakdown | Pie chart | UsageLedger |
| Messages per routing mode | Bar chart | RoutingDecision |
| Latency distribution | Percentile chart | ChatMessage |
| Model usage distribution | Pie chart | ChatMessage |
| Daily/weekly/monthly trends | Line chart | UsageLedger |

**Data Source**: MongoDB `UsageLedger` collection in audit-service, tracking:
- `resourceType`: TOKEN
- `action`: CONSUME
- `quantity`: inputTokens + outputTokens
- `metadata`: provider, model, userId

### 5. Connector Management (Connectors Page)

**Access**: ADMIN full CRUD, OPERATOR read-only

| Action | Description |
| --- | --- |
| Add Connector | Configure cloud AI provider (OpenAI, Anthropic, Gemini, DeepSeek, xAI) |
| Test Connection | Validate API key with lightweight test call |
| Sync Models | Discover available models from provider API |
| View Health | See health check history and current status |
| Edit Connector | Update name, API key, base URL |
| Delete Connector | Remove provider (affects routing availability) |

### 6. Routing Policy Management (Routing Page)

**Access**: ADMIN full CRUD, OPERATOR read-only

| Action | Description |
| --- | --- |
| List Policies | Table: name, routing mode, priority, active status |
| Create Policy | Name, mode, priority (0-1000), JSON config |
| Update Policy | Modify any field including activation toggle |
| Delete Policy | Remove policy |
| Evaluate Route | Test routing decision with sample input |
| View Decision History | Browse past routing decisions per thread |

### 7. Server/Client Logs (Logs Page)

**Access**: ADMIN only

| Log Type | Source | TTL | Fields |
| --- | --- | --- | --- |
| Server Logs | All 13 backend services | 30 days | level, serviceName, module, action, requestId, error |
| Client Logs | Frontend (browser) | 30 days | level, message, component, action, userId, route |

**Filtering**: By service name, log level, date range, search text.

---

## Role Permissions Summary

| Feature | ADMIN | OPERATOR | VIEWER |
| --- | --- | --- | --- |
| User Management | Full CRUD | -- | -- |
| Connectors | Full CRUD | Read | -- |
| Routing Policies | Full CRUD | Read | -- |
| Audit Logs | Full access | Read | -- |
| Usage Dashboard | Full access | Read | -- |
| Health Dashboard | Full access | Read | Read |
| Server/Client Logs | Full access | -- | -- |
| System Settings | Full access | -- | -- |

---

## System Settings

**Access**: ADMIN only

Key/value store for system-wide configuration:
- `SystemSetting` table in `claw_auth` database
- Set at initial deployment, rarely changed
- Examples: default routing mode, token limits, feature flags
