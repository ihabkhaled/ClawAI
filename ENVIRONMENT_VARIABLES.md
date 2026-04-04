# Environment Variables

Complete reference for all environment variables used by Claw.

All variables are defined in `.env.example` at the project root and in each app's `.env.example`. Copy these to `.env` files and customize for your environment.

---

## Database

| Variable            | Required | Default                                                         | Description                                      |
|---------------------|----------|-----------------------------------------------------------------|--------------------------------------------------|
| `DATABASE_URL`      | Yes      | `postgresql://claw:claw_secret@localhost:5432/claw?schema=public` | PostgreSQL connection string (Prisma format)     |
| `POSTGRES_USER`     | Yes      | `claw`                                                          | PostgreSQL username (used by Docker Compose)     |
| `POSTGRES_PASSWORD` | Yes      | `claw_secret`                                                   | PostgreSQL password (used by Docker Compose)     |
| `POSTGRES_DB`       | Yes      | `claw`                                                          | PostgreSQL database name (used by Docker Compose)|

**Notes:**
- `DATABASE_URL` is used by Prisma in the backend application.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` are used by the Docker Compose PostgreSQL service.
- Keep these values in sync. The `DATABASE_URL` must use the same credentials and database name.

---

## Redis

| Variable    | Required | Default                  | Description                     |
|-------------|----------|--------------------------|---------------------------------|
| `REDIS_URL` | Yes      | `redis://localhost:6379` | Redis connection URL            |

**Notes:**
- Used by both the caching layer and BullMQ job queue.
- For Redis with authentication, use: `redis://:password@hostname:6379`.

---

## Backend

| Variable       | Required | Default       | Description                                     |
|----------------|----------|---------------|-------------------------------------------------|
| `BACKEND_PORT` | No       | `4000`        | Port the NestJS backend listens on              |
| `NODE_ENV`     | No       | `development` | Environment mode (`development` or `production`)|

**Notes:**
- In production, set `NODE_ENV=production` to enable optimizations and disable debug logging.

---

## Authentication / JWT

| Variable            | Required | Default | Description                                            |
|---------------------|----------|---------|--------------------------------------------------------|
| `JWT_SECRET`        | Yes      | --      | Secret key for signing JWTs (minimum 32 characters)    |
| `JWT_ACCESS_EXPIRY` | No       | `15m`   | Access token lifetime (e.g., `15m`, `1h`)              |
| `JWT_REFRESH_EXPIRY`| No       | `7d`    | Refresh token lifetime (e.g., `7d`, `30d`)             |

**Notes:**
- `JWT_SECRET` must be a cryptographically random string. Generate with: `openssl rand -base64 48`.
- Shorter access token lifetimes are more secure but increase refresh frequency.
- Refresh tokens are rotated on each use regardless of expiry.

---

## Encryption

| Variable         | Required | Default | Description                                              |
|------------------|----------|---------|----------------------------------------------------------|
| `ENCRYPTION_KEY` | Yes      | --      | 32-byte hex string (64 hex characters) for AES-256-GCM  |

**Notes:**
- Used to encrypt provider API keys and other secrets at rest in the database.
- Generate with: `openssl rand -hex 32`.
- Changing this key requires re-encrypting all stored secrets. A migration script is provided.
- Never commit this value to version control.

---

## Admin Seed

| Variable         | Required | Default                     | Description                           |
|------------------|----------|-----------------------------|---------------------------------------|
| `ADMIN_EMAIL`    | No       | `admin@claw.local`          | Email for the seeded admin account    |
| `ADMIN_USERNAME` | No       | `claw-admin`                | Username for the seeded admin account |
| `ADMIN_PASSWORD` | Yes      | `change-me-on-first-login`  | Password for the seeded admin account |

**Notes:**
- These values are only used during `npm run seed` to create the initial admin user.
- Change the password immediately after first login in production.

---

## Frontend

| Variable                | Required | Default                  | Description                                  |
|-------------------------|----------|--------------------------|----------------------------------------------|
| `NEXT_PUBLIC_API_URL`   | Yes      | `http://localhost:4000`  | Backend API URL (accessible from the browser)|
| `NEXT_PUBLIC_APP_NAME`  | No       | `Claw`                   | Application display name                     |
| `NEXT_PUBLIC_APP_URL`   | No       | `http://localhost:3000`  | Frontend public URL                          |
| `FRONTEND_PORT`         | No       | `3000`                   | Port the Next.js frontend listens on         |

**Notes:**
- Variables prefixed with `NEXT_PUBLIC_` are embedded in the frontend bundle and visible to browsers.
- Never put secrets in `NEXT_PUBLIC_` variables.
- `NEXT_PUBLIC_API_URL` must be reachable from the user's browser, not just the server.

---

## Ollama (Local AI Runtime)

| Variable          | Required | Default                    | Description                                |
|-------------------|----------|----------------------------|--------------------------------------------|
| `OLLAMA_BASE_URL` | No       | `http://localhost:11434`   | Ollama HTTP API base URL                   |

**Notes:**
- Only required if using local models via Ollama.
- If running Ollama in Docker, this is the URL from the backend's perspective (use Docker service name in production: `http://ollama:11434`).
- If running Ollama on the host, use `http://localhost:11434`.

---

## Provider API Keys (Optional)

These are optional and can also be configured through the UI connector management interface.

| Variable                | Required | Default | Description                          |
|-------------------------|----------|---------|--------------------------------------|
| `OPENAI_API_KEY`        | No       | --      | OpenAI API key                       |
| `ANTHROPIC_API_KEY`     | No       | --      | Anthropic API key                    |
| `GOOGLE_GEMINI_API_KEY` | No       | --      | Google Gemini API key                |
| `AWS_ACCESS_KEY_ID`     | No       | --      | AWS access key for Bedrock           |
| `AWS_SECRET_ACCESS_KEY` | No       | --      | AWS secret key for Bedrock           |
| `AWS_REGION`            | No       | `us-east-1` | AWS region for Bedrock           |
| `DEEPSEEK_API_KEY`      | No       | --      | DeepSeek API key                     |

**Notes:**
- Environment-based keys are used as fallback when no connector is configured in the UI.
- Keys configured through the UI (connectors) take precedence over environment variables.
- All keys are encrypted at rest when stored via the connector system.
- For development without any API keys, use mock providers by setting `USE_MOCK_PROVIDERS=true`.

---

## Testing

| Variable              | Required | Default | Description                                   |
|-----------------------|----------|---------|-----------------------------------------------|
| `USE_MOCK_PROVIDERS`  | No       | `false` | Use mock provider adapters instead of real APIs |

**Notes:**
- Set to `true` for development without API keys, CI pipelines, and testing.
- Mock adapters return deterministic responses and simulate provider behavior.

---

## Generating Secure Values

```bash
# JWT_SECRET (64 random characters, base64)
openssl rand -base64 48

# ENCRYPTION_KEY (32 bytes as 64 hex characters)
openssl rand -hex 32

# ADMIN_PASSWORD (strong random password)
openssl rand -base64 24
```
