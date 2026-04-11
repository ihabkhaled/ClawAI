# Secrets Rotation Guide

## Overview

This guide covers procedures for rotating all secrets in the ClawAI platform. Regular rotation reduces the impact of undetected compromises.

---

## Secret Inventory

| Secret | Format | Used By | Risk If Compromised |
| --- | --- | --- | --- |
| `JWT_SECRET` | Random string (min 32 chars) | auth-service (sign), all services (verify) | Full account impersonation |
| `ENCRYPTION_KEY` | 64 hex characters (256 bits) | connector-service | Cloud provider API key exposure |
| `PG_*_PASSWORD` | String (9 instances) | Each PostgreSQL service | Database access |
| `MONGO_PASSWORD` | String | audit, client-logs, server-logs services | Audit/log data access |
| `RABBITMQ_PASSWORD` | String | All services | Event bus compromise |
| `REDIS_URL` | Connection string (may contain password) | Services using Redis | Cache/session access |
| `ADMIN_PASSWORD` | String | Initial seed only | Default admin account access |
| Cloud provider API keys | Various formats | connector-service (encrypted) | Financial abuse of provider accounts |

---

## Rotation Procedures

### 1. JWT_SECRET Rotation

**Impact**: All existing access tokens become invalid. All users must re-authenticate.

**Procedure**:

1. Generate new secret:
   ```bash
   openssl rand -base64 48
   ```

2. Update `.env`:
   ```
   JWT_SECRET=<new-value>
   ```

3. Restart ALL backend services (all verify JWT signatures):
   ```bash
   docker compose -f docker-compose.dev.yml restart
   ```

4. **Effect**: All existing access tokens are immediately invalidated. Users' next request receives 401 and must re-login. Refresh tokens also fail since sessions reference the old secret.

**Recommended frequency**: Every 90 days or after personnel changes.

---

### 2. ENCRYPTION_KEY Rotation

**Impact**: Existing encrypted connector configs must be re-encrypted with the new key.

**Procedure**:

1. Generate new key:
   ```bash
   openssl rand -hex 32
   ```

2. Create and run a migration script that:
   - Connects to `claw_connectors` database
   - Reads all `Connector.encryptedConfig` values
   - Decrypts each with the OLD `ENCRYPTION_KEY`
   - Re-encrypts each with the NEW `ENCRYPTION_KEY`
   - Updates all records in a single transaction

3. Update `.env`:
   ```
   ENCRYPTION_KEY=<new-64-hex-chars>
   ```

4. Restart connector-service:
   ```bash
   docker compose -f docker-compose.dev.yml restart connector-service
   ```

5. Verify: Test a connector connection to confirm decryption works.

**Recommended frequency**: Every 180 days or after personnel changes.

---

### 3. PostgreSQL Password Rotation

**Impact**: Service restarts required. Brief downtime per service.

**Procedure** (for each PG instance):

1. Connect to PostgreSQL as superuser:
   ```sql
   ALTER USER <username> WITH PASSWORD '<new-password>';
   ```

2. Update `.env` with new password values:
   ```
   PG_AUTH_PASSWORD=<new>
   PG_CHAT_PASSWORD=<new>
   PG_CONNECTORS_PASSWORD=<new>
   PG_ROUTING_PASSWORD=<new>
   PG_MEMORY_PASSWORD=<new>
   PG_FILES_PASSWORD=<new>
   PG_OLLAMA_PASSWORD=<new>
   PG_IMAGES_PASSWORD=<new>
   PG_FILE_GEN_PASSWORD=<new>
   ```

3. Update `DATABASE_URL` values in `.env` that reference the passwords.

4. Restart affected services:
   ```bash
   docker compose -f docker-compose.dev.yml restart auth-service chat-service connector-service routing-service memory-service file-service ollama-service image-service file-generation-service
   ```

**Recommended frequency**: Every 180 days.

---

### 4. MongoDB Password Rotation

**Impact**: Audit, client-logs, and server-logs services restart.

**Procedure**:

1. Connect to MongoDB as admin:
   ```javascript
   db.changeUserPassword("username", "newPassword")
   ```

2. Update `.env`:
   ```
   MONGO_PASSWORD=<new>
   ```

3. Update `*_MONGODB_URI` values in `.env`.

4. Restart affected services:
   ```bash
   docker compose -f docker-compose.dev.yml restart audit-service client-logs-service server-logs-service
   ```

**Recommended frequency**: Every 180 days.

---

### 5. RabbitMQ Password Rotation

**Impact**: All services restart. Brief async communication gap.

**Procedure**:

1. Update RabbitMQ user password via management UI or CLI:
   ```bash
   rabbitmqctl change_password <user> <new-password>
   ```

2. Update `.env`:
   ```
   RABBITMQ_PASSWORD=<new>
   RABBITMQ_URL=amqp://<user>:<new>@rabbitmq:5672
   ```

3. Restart all services:
   ```bash
   docker compose -f docker-compose.dev.yml restart
   ```

**Recommended frequency**: Every 180 days.

---

### 6. Cloud Provider API Key Rotation

**Impact**: No service restart needed. Updated via API.

**Procedure**:

1. Generate new API key in the cloud provider's dashboard (OpenAI, Anthropic, Google, DeepSeek).

2. Update the connector via the API or UI:
   - Navigate to Connectors page
   - Edit the connector
   - Enter the new API key
   - Save (system encrypts with AES-256-GCM)

3. Test the connection to verify the new key works.

4. Revoke the old API key in the provider's dashboard.

**Recommended frequency**: Every 90 days or after personnel changes.

---

### 7. ADMIN_PASSWORD Change

**Impact**: Only affects default admin account login.

**Procedure**:

1. Log in as admin
2. Navigate to Settings -> Change Password
3. Enter current and new password
4. Update `.env` if needed for documentation purposes

**Recommended**: Change from default immediately after first deployment.

---

## Rotation Schedule

| Secret | Frequency | Trigger Events |
| --- | --- | --- |
| JWT_SECRET | 90 days | Personnel change, suspected compromise |
| ENCRYPTION_KEY | 180 days | Personnel change, suspected compromise |
| Database passwords | 180 days | Personnel change |
| RabbitMQ password | 180 days | Personnel change |
| Cloud API keys | 90 days | Personnel change, billing anomaly |
| ADMIN_PASSWORD | Immediate | First deployment |

---

## Emergency Rotation (Suspected Compromise)

If a secret is suspected compromised:

1. **Identify scope**: Which secrets were potentially exposed?
2. **Rotate immediately**: Follow the procedures above for all affected secrets.
3. **Audit logs**: Review audit logs for unauthorized access during the exposure window.
4. **Revoke sessions**: If JWT_SECRET is compromised, all sessions are invalidated on rotation.
5. **Provider keys**: If ENCRYPTION_KEY is compromised, also rotate all cloud provider API keys at the provider level.
6. **Document**: Record the incident, timeline, and actions taken.
7. **Monitor**: Watch for anomalous activity in the days following rotation.
