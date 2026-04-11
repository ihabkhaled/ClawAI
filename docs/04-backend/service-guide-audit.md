# Service Guide: claw-audit-service

## Overview

| Property       | Value                        |
| -------------- | ---------------------------- |
| Port           | 4007                         |
| Database       | MongoDB (`claw_audit`)       |
| ODM            | Mongoose 8.x via @nestjs/mongoose |
| Env prefix     | `AUDIT_`                     |
| Nginx routes   | `/api/v1/audits/*`, `/api/v1/usage/*` |

The audit service records all significant actions across the platform and maintains a usage ledger for resource consumption tracking. It is a pure consumer of RabbitMQ events -- it never initiates actions, only records them.

## Data Models (MongoDB)

### AuditLog

| Field      | Type     | Notes                                |
| ---------- | -------- | ------------------------------------ |
| userId     | String   | Who performed the action             |
| action     | String   | AuditAction enum value               |
| entityType | String   | What was acted upon (user, connector, etc.) |
| entityId   | String   | ID of the affected entity            |
| severity   | String   | AuditSeverity (INFO, WARNING, CRITICAL) |
| details    | Object   | Action-specific metadata             |
| ipAddress  | String?  | Client IP if available               |
| userAgent  | String?  | Client user agent                    |
| createdAt  | Date     | Auto-set, indexed for TTL            |

### UsageLedger

| Field        | Type   | Notes                               |
| ------------ | ------ | ----------------------------------- |
| userId       | String | Who consumed the resource           |
| resourceType | String | What was consumed (tokens, images)  |
| action       | String | What triggered the consumption      |
| quantity     | Number | Amount consumed                     |
| unit         | String | Unit of measurement                 |
| metadata     | Object | Provider, model, cost estimate      |
| createdAt    | Date   | Auto-set, indexed                   |

## Audit Actions (10 Event Types)

| Action              | Source Service | Severity | Description                     |
| ------------------- | -------------- | -------- | ------------------------------- |
| USER_LOGIN          | auth           | INFO     | Successful login                |
| USER_LOGOUT         | auth           | INFO     | Logout                          |
| USER_CREATED        | auth           | INFO     | New user registration           |
| USER_ROLE_CHANGED   | auth           | WARNING  | Role escalation/demotion        |
| CONNECTOR_CREATED   | connector      | INFO     | New provider added              |
| CONNECTOR_UPDATED   | connector      | INFO     | Provider config changed         |
| CONNECTOR_DELETED   | connector      | WARNING  | Provider removed                |
| MESSAGE_COMPLETED   | chat           | INFO     | AI response generated           |
| IMAGE_GENERATED     | image          | INFO     | Image generation completed      |
| ROUTING_DECISION    | routing        | INFO     | Routing decision recorded       |

## API Endpoints

### Audits (`/api/v1/audits`)

| Method | Path       | Auth          | Description                      |
| ------ | ---------- | ------------- | -------------------------------- |
| GET    | /          | ADMIN         | List audit logs (paginated, filterable) |
| GET    | /stats     | ADMIN         | Aggregated audit statistics      |

### Usage (`/api/v1/usage`)

| Method | Path          | Auth          | Description                      |
| ------ | ------------- | ------------- | -------------------------------- |
| GET    | /             | Bearer        | User's usage history             |
| GET    | /summary      | Bearer        | Usage summary (totals by period) |
| GET    | /admin        | ADMIN         | All users' usage (admin view)    |

## Event Subscriptions

The audit service subscribes to events from multiple services:

| Event                    | Processing                                  |
| ------------------------ | ------------------------------------------- |
| user.login               | Create audit log (INFO)                     |
| user.logout              | Create audit log (INFO)                     |
| user.created             | Create audit log (INFO)                     |
| user.role_changed        | Create audit log (WARNING)                  |
| connector.created        | Create audit log (INFO)                     |
| connector.updated        | Create audit log (INFO)                     |
| connector.deleted        | Create audit log (WARNING)                  |
| message.completed        | Create audit log + usage ledger entry       |
| routing.decision_made    | Create audit log (INFO)                     |
| image.generated          | Create audit log + usage ledger entry       |
| image.failed             | Create audit log (WARNING)                  |
| file.generated           | Create audit log (INFO)                     |
| file_generation.failed   | Create audit log (WARNING)                  |

## MongoDB Aggregations

The usage summary endpoint uses MongoDB aggregation pipelines:

- Group by `resourceType` and time period (day, week, month)
- Sum `quantity` fields for total consumption
- Calculate cost estimates from metadata
- Support date range filtering

## Why MongoDB

MongoDB was chosen for audit/usage data because:

- Flexible schema accommodates varying `details` payloads per action type
- Time-series-friendly with TTL indexes for automatic cleanup
- Aggregation pipeline provides efficient analytics queries
- No need for relational integrity -- audit logs are append-only
