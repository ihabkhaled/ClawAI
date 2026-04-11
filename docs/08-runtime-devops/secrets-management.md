# Secrets Management

> Encryption keys, JWT secrets, API key encryption, and security practices.

---

## 1. Secrets Inventory

| Secret                | Location      | Purpose                                | Format           |
| --------------------- | ------------- | -------------------------------------- | ---------------- |
| `JWT_SECRET`          | `.env`        | Signs JWT access and refresh tokens    | 64 hex chars     |
| `ENCRYPTION_KEY`      | `.env`        | AES-256-GCM encryption for API keys   | 64 hex chars     |
| `ADMIN_PASSWORD`      | `.env`        | Default admin user password            | String           |
| `PG_*_PASSWORD`       | `.env`        | PostgreSQL database passwords (x9)     | String           |
| `MONGO_PASSWORD`      | `.env`        | MongoDB root password                  | String           |
| `RABBITMQ_DEFAULT_PASS`| `.env`       | RabbitMQ broker password               | String           |
| Connector API keys    | PostgreSQL    | Cloud provider API keys (encrypted)    | AES-256-GCM blob |

---

## 2. JWT Secrets

### Configuration

```bash
JWT_SECRET=<64-character-hex-string>
JWT_ACCESS_EXPIRY=15m     # Access token lifetime
JWT_REFRESH_EXPIRY=7d     # Refresh token lifetime
```

### Generating a Secure Secret

```bash
# Linux/macOS
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Windows PowerShell
[System.BitConverter]::ToString((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32)).Replace('-','').ToLower()
```

### Token Architecture

- **Access tokens**: Short-lived (15m default), signed with HMAC-SHA256
- **Refresh tokens**: Longer-lived (7d default), stored in `sessions` table
- **Rotation**: Each refresh request invalidates the old token and issues a new pair
- **Password hashing**: Argon2id (not related to JWT_SECRET but part of auth security)

### Security Considerations

- JWT_SECRET must be the same across all services that validate tokens (auth-service signs, all others verify)
- Changing JWT_SECRET invalidates all existing tokens (users must re-login)
- Never commit JWT_SECRET to version control

---

## 3. API Key Encryption (AES-256-GCM)

### How It Works

Cloud provider API keys (OpenAI, Anthropic, Google, etc.) are encrypted at rest using AES-256-GCM:

```
User provides API key
  --> connector-service encrypts with ENCRYPTION_KEY
    --> Stored as encrypted blob in PostgreSQL (encryptedConfig column)
      --> Decrypted only when making API calls to the provider
```

### Configuration

```bash
ENCRYPTION_KEY=<64-character-hex-string>
```

The ENCRYPTION_KEY is 32 bytes (64 hex characters) for AES-256.

### Encryption Properties

| Property                | Value                              |
| ----------------------- | ---------------------------------- |
| Algorithm               | AES-256-GCM                        |
| Key length              | 256 bits (32 bytes / 64 hex chars) |
| IV (nonce)              | 12 bytes, randomly generated       |
| Auth tag                | 16 bytes                           |
| Storage format           | IV + encrypted data + auth tag     |

### Key Rotation

To rotate the ENCRYPTION_KEY:

1. Decrypt all existing connector configs with the old key
2. Re-encrypt with the new key
3. Update `.env` with the new key
4. Restart the connector-service

There is no built-in rotation command; this must be done manually or via a migration script.

---

## 4. Database Passwords

### PostgreSQL (9 instances)

Each database has its own credentials:

```bash
PG_AUTH_PASSWORD=claw_secret        # Auth database
PG_CHAT_PASSWORD=claw_secret        # Chat database
PG_CONNECTOR_PASSWORD=claw_secret   # Connector database
PG_ROUTING_PASSWORD=claw_secret     # Routing database
PG_MEMORY_PASSWORD=claw_secret      # Memory database
PG_FILES_PASSWORD=claw_secret       # Files database
PG_OLLAMA_PASSWORD=claw_secret      # Ollama database
PG_IMAGES_PASSWORD=claw_secret      # Images database
PG_FILE_GEN_PASSWORD=claw_secret    # File generations database
```

**Production**: Each database should have a unique, strong password.

### MongoDB

```bash
MONGO_USER=claw
MONGO_PASSWORD=claw_secret
```

Used for three databases: `claw_audit`, `claw_client_logs`, `claw_server_logs`.

### RabbitMQ

```bash
RABBITMQ_DEFAULT_USER=claw
RABBITMQ_DEFAULT_PASS=claw_secret
```

---

## 5. Log Redaction

Pino is configured to redact sensitive fields from all log output:

```typescript
redact: ['authorization', 'password', 'refreshToken', 'apiKey', 'token', 'secret']
```

Any log entry containing these field names will have the value replaced with `[REDACTED]`.

### What is Redacted

- HTTP Authorization headers
- Password fields in request bodies
- Refresh tokens in auth responses
- API keys in connector configurations
- Any field named `token` or `secret`

### Frontend Security

- **No `console.log`** -- ESLint enforced; only `console.warn` and `console.error`
- **No secrets in localStorage** -- only auth tokens (with security note in code)
- **No NEXT_PUBLIC_ secrets** -- only non-sensitive config uses NEXT_PUBLIC_ prefix
- **X-Request-ID** -- uses random UUIDs, no sensitive data

---

## 6. Security Headers

### Backend (Helmet)

All NestJS services use `@nestjs/throttler` and Helmet security headers:

- Rate limiting: 100 requests per 60 seconds (configurable via THROTTLE_TTL/THROTTLE_LIMIT)
- CORS: Restricted to origins in CORS_ORIGINS env var

### Nginx

```nginx
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 7. Environment File Security

### .env File

- **Never commit `.env`** to version control (listed in `.gitignore`)
- `.env.example` contains placeholder values for documentation
- Each developer generates their own `.env` from `.env.example`

### Docker Compose

All services use `env_file: .env` which passes the entire `.env` file to each container. In production, consider:

1. Using Docker secrets or a vault (HashiCorp Vault, AWS Secrets Manager)
2. Injecting secrets via orchestrator (Kubernetes secrets, ECS task definitions)
3. Using environment-specific `.env` files (`.env.production`, `.env.staging`)

---

## 8. Security Checklist for Production

- [ ] JWT_SECRET is a unique, randomly generated 64-character hex string
- [ ] ENCRYPTION_KEY is a unique, randomly generated 64-character hex string
- [ ] All database passwords are unique and strong
- [ ] ADMIN_PASSWORD is changed from default
- [ ] CORS_ORIGINS is restricted to your domain
- [ ] `.env` is not committed to version control
- [ ] SSL/TLS is configured for all external traffic
- [ ] RabbitMQ Management UI (port 15672) is not exposed publicly
- [ ] Database ports (5441-5449, 27018) are not exposed publicly
- [ ] Redis port (6380) is not exposed publicly
- [ ] Rate limiting is configured appropriately for production traffic
