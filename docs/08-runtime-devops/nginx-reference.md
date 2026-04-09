# Nginx Configuration Reference

## Overview

Nginx runs as a reverse proxy on port 4000, routing all API requests from the frontend to the appropriate backend service. It handles DNS resolution, timeout management, security headers, and SSE (Server-Sent Events) streaming support.

**Configuration file**: `infra/nginx/nginx.conf`
**Container**: `claw-nginx` (nginx:alpine)
**Host port**: 4000 (mapped to container port 80)

---

## Route Mappings

All routes are prefixed with `/api/v1/`. Nginx uses dynamic variables for upstream resolution to survive service restarts without stale DNS.

### Auth Service (port 4001)

| Frontend Path     | Backend Destination        | Notes                      |
| ----------------- | -------------------------- | -------------------------- |
| `/api/v1/auth/*`  | `http://auth-service:4001` | Login, refresh, logout, me |
| `/api/v1/users/*` | `http://auth-service:4001` | User CRUD (admin only)     |

### Chat Service (port 4002)

| Frontend Path                  | Backend Destination        | Notes                                  |
| ------------------------------ | -------------------------- | -------------------------------------- |
| `/api/v1/threads/*`            | `http://chat-service:4002` | Rewritten to `/api/v1/chat-threads/*`  |
| `/api/v1/messages/*`           | `http://chat-service:4002` | Rewritten to `/api/v1/chat-messages/*` |
| `/api/v1/chat-threads/*`       | `http://chat-service:4002` | Direct path                            |
| `/api/v1/chat-messages/stream` | `http://chat-service:4002` | SSE endpoint (special config)          |
| `/api/v1/chat-messages/*`      | `http://chat-service:4002` | Message CRUD, feedback, regenerate     |

**Important**: The `/api/v1/chat-messages/stream` location must be defined BEFORE the general `/api/v1/chat-messages` location to ensure Nginx matches the more specific SSE route first.

### Connector Service (port 4003)

| Frontend Path          | Backend Destination             | Notes                      |
| ---------------------- | ------------------------------- | -------------------------- |
| `/api/v1/connectors/*` | `http://connector-service:4003` | Connector CRUD, test, sync |
| `/api/v1/models/*`     | `http://connector-service:4003` | Model listing              |

### Routing Service (port 4004)

| Frontend Path       | Backend Destination           | Notes                         |
| ------------------- | ----------------------------- | ----------------------------- |
| `/api/v1/routing/*` | `http://routing-service:4004` | Policies, decisions, evaluate |

### Memory Service (port 4005)

| Frontend Path             | Backend Destination          | Notes                                  |
| ------------------------- | ---------------------------- | -------------------------------------- |
| `/api/v1/memory/*`        | `http://memory-service:4005` | Rewritten to `/api/v1/memories/*`      |
| `/api/v1/context/*`       | `http://memory-service:4005` | Rewritten to `/api/v1/context-packs/*` |
| `/api/v1/memories/*`      | `http://memory-service:4005` | Direct path                            |
| `/api/v1/context-packs/*` | `http://memory-service:4005` | Direct path                            |

### File Service (port 4006)

| Frontend Path     | Backend Destination        | Notes                |
| ----------------- | -------------------------- | -------------------- |
| `/api/v1/files/*` | `http://file-service:4006` | Upload, list, chunks |

### Audit Service (port 4007)

| Frontend Path      | Backend Destination         | Notes             |
| ------------------ | --------------------------- | ----------------- |
| `/api/v1/audits/*` | `http://audit-service:4007` | Audit log queries |
| `/api/v1/usage/*`  | `http://audit-service:4007` | Usage statistics  |

### Ollama Service (port 4008)

| Frontend Path      | Backend Destination          | Notes                            |
| ------------------ | ---------------------------- | -------------------------------- |
| `/api/v1/ollama/*` | `http://ollama-service:4008` | Model management, pull, generate |

### Health Service (port 4009)

| Frontend Path    | Backend Destination          | Notes             |
| ---------------- | ---------------------------- | ----------------- |
| `/api/v1/health` | `http://health-service:4009` | Aggregated health |

### Client Logs Service (port 4010)

| Frontend Path           | Backend Destination               | Notes                  |
| ----------------------- | --------------------------------- | ---------------------- |
| `/api/v1/client-logs/*` | `http://client-logs-service:4010` | Frontend log ingestion |

### Server Logs Service (port 4011)

| Frontend Path           | Backend Destination               | Notes              |
| ----------------------- | --------------------------------- | ------------------ |
| `/api/v1/server-logs/*` | `http://server-logs-service:4011` | Backend log viewer |

### Image Service (port 4012)

| Frontend Path      | Backend Destination         | Notes                         |
| ------------------ | --------------------------- | ----------------------------- |
| `/api/v1/images`   | `http://image-service:4012` | Image generation requests     |
| `/api/v1/images/*` | `http://image-service:4012` | SSE endpoint (special config) |

---

## SSE (Server-Sent Events) Configuration

Two endpoints use SSE for real-time streaming: chat message streaming and image generation progress.

### Chat Message Streaming

```nginx
location /api/v1/chat-messages/stream {
    set $chat_backend http://chat-service:4002;
    proxy_pass $chat_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 86400;
    proxy_buffering off;
    proxy_cache off;
}
```

### Image Generation SSE

```nginx
location /api/v1/images/ {
    set $image_backend http://image-service:4012;
    proxy_pass $image_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 86400;
    proxy_buffering off;
    proxy_cache off;
}
```

### SSE Configuration Explained

| Directive                     | Value   | Purpose                                                                   |
| ----------------------------- | ------- | ------------------------------------------------------------------------- |
| `proxy_http_version`          | `1.1`   | Required for persistent connections (HTTP/1.0 closes after each response) |
| `proxy_set_header Connection` | `""`    | Removes the `Connection: close` header to keep the connection open        |
| `proxy_read_timeout`          | `86400` | 24-hour timeout to prevent Nginx from closing long-lived SSE connections  |
| `proxy_buffering`             | `off`   | Disables response buffering so events are sent to the client immediately  |
| `proxy_cache`                 | `off`   | Disables caching of SSE responses                                         |

---

## Timeout Settings

```nginx
proxy_connect_timeout 10s;   # Time to establish connection to upstream
proxy_send_timeout    60s;   # Time to send request to upstream
proxy_read_timeout    60s;   # Time to read response from upstream (overridden for SSE)
```

These apply to all non-SSE routes. SSE endpoints override `proxy_read_timeout` to 86400s (24 hours).

---

## Request Body Limits

```nginx
client_max_body_size 75m;
```

This allows file uploads up to 75 MB. This limit applies to all routes. If you need larger uploads, increase this value and restart the nginx container.

---

## Security Headers

Applied globally to all responses:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "0" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

| Header                   | Value                                      | Purpose                                           |
| ------------------------ | ------------------------------------------ | ------------------------------------------------- |
| `X-Content-Type-Options` | `nosniff`                                  | Prevents MIME type sniffing                       |
| `X-Frame-Options`        | `DENY`                                     | Prevents clickjacking (no iframe embedding)       |
| `X-XSS-Protection`       | `0`                                        | Disables legacy XSS filter (modern CSP preferred) |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`          | Controls referrer information sent with requests  |
| `Permissions-Policy`     | `camera=(), microphone=(), geolocation=()` | Disables access to sensitive browser APIs         |

Additionally, `server_tokens off;` hides the Nginx version from response headers.

---

## Proxy Headers

Set on all proxied requests:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Origin $http_origin;
```

| Header              | Value                        | Purpose                                      |
| ------------------- | ---------------------------- | -------------------------------------------- |
| `Host`              | `$host`                      | Preserves the original Host header           |
| `X-Real-IP`         | `$remote_addr`               | Passes the client's real IP to backend       |
| `X-Forwarded-For`   | `$proxy_add_x_forwarded_for` | Appends client IP to the forwarded chain     |
| `X-Forwarded-Proto` | `$scheme`                    | Indicates the original protocol (http/https) |
| `Origin`            | `$http_origin`               | Passes the Origin header for CORS handling   |

---

## DNS Resolution

```nginx
resolver 127.0.0.11 valid=5s ipv6=off;
resolver_timeout 3s;
```

- `127.0.0.11` is Docker's embedded DNS server
- `valid=5s` means DNS results are cached for 5 seconds, then re-resolved
- `ipv6=off` disables IPv6 resolution (not needed in the bridge network)
- `resolver_timeout 3s` sets the maximum time for a DNS query

This configuration allows Nginx to survive service restarts. When a service container is recreated, its IP address changes. The 5-second TTL ensures Nginx picks up the new IP quickly.

### Why Variables Are Used

Each location block uses a variable for the upstream:

```nginx
location /api/v1/auth {
    set $auth_backend http://auth-service:4001;
    proxy_pass $auth_backend;
}
```

This is required for dynamic DNS resolution. If the URL were passed directly to `proxy_pass` without a variable, Nginx would resolve the hostname at startup only and cache it indefinitely, causing failures when containers restart.

---

## URL Rewriting

Some frontend paths differ from backend API paths. Nginx rewrites these:

| Frontend Path        | Rewritten To              | Service        |
| -------------------- | ------------------------- | -------------- |
| `/api/v1/threads/*`  | `/api/v1/chat-threads/*`  | chat-service   |
| `/api/v1/messages/*` | `/api/v1/chat-messages/*` | chat-service   |
| `/api/v1/memory/*`   | `/api/v1/memories/*`      | memory-service |
| `/api/v1/context/*`  | `/api/v1/context-packs/*` | memory-service |

The rewrite uses `break` flag, which means the rewritten URL is processed internally without an external redirect:

```nginx
rewrite ^/api/v1/threads/(.*)$ /api/v1/chat-threads/$1 break;
```

---

## Upstream Definitions

The current configuration does not use `upstream` blocks because each service runs as a single instance. If horizontal scaling is needed, add upstream blocks:

```nginx
upstream chat-backend {
    server chat-service-1:4002;
    server chat-service-2:4002;
    server chat-service-3:4002;
}
```

Then replace `proxy_pass $chat_backend;` with `proxy_pass http://chat-backend;`.

---

## Nginx Dependencies

Nginx waits for ALL backend services to be healthy before starting:

```yaml
depends_on:
  auth-service: { condition: service_healthy }
  chat-service: { condition: service_healthy }
  connector-service: { condition: service_healthy }
  routing-service: { condition: service_healthy }
  memory-service: { condition: service_healthy }
  file-service: { condition: service_healthy }
  audit-service: { condition: service_healthy }
  ollama-service: { condition: service_healthy }
  client-logs-service: { condition: service_healthy }
  server-logs-service: { condition: service_healthy }
  health-service: { condition: service_healthy }
```

This means Nginx is the last infrastructure component to start, ensuring all routes are functional when the proxy becomes available.

---

## Modifying the Configuration

1. Edit `infra/nginx/nginx.conf`
2. Restart the nginx container:
   ```bash
   docker compose -f docker-compose.dev.yml restart nginx
   ```
3. Verify routes work:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/health
   ```

The configuration is mounted read-only (`:ro`), so changes require a container restart to take effect.
