# Nginx Routing Reference

> Complete nginx.conf breakdown, every location block, SSE configuration, and URL rewriting.

---

## 1. Overview

Nginx serves as the single entry point reverse proxy on port 4000. All API requests from the frontend pass through Nginx to reach the appropriate backend microservice.

**Config file**: `infra/nginx/nginx.conf`
**Container**: `claw-nginx` (nginx:alpine)
**Host port**: 4000 (mapped to container port 80)

---

## 2. Global Configuration

```nginx
events {
    worker_connections 1024;
}

http {
    resolver 127.0.0.11 valid=5s ipv6=off;   # Docker DNS, 5s cache
    resolver_timeout 3s;

    proxy_connect_timeout 10s;   # Connection establishment timeout
    proxy_send_timeout    60s;   # Request send timeout
    proxy_read_timeout    60s;   # Response read timeout (overridden for SSE)

    client_max_body_size 75m;    # Max upload size (file uploads)

    server_tokens off;           # Hide nginx version
}
```

---

## 3. Security Headers

Applied to ALL responses:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "0" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

---

## 4. Proxy Headers

Set on ALL proxied requests:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Origin $http_origin;
```

---

## 5. Complete Route Map

### Auth Service (port 4001)

```nginx
location /api/v1/auth {
    set $auth_backend http://auth-service:4001;
    proxy_pass $auth_backend;
}

location /api/v1/users {
    set $auth_backend http://auth-service:4001;
    proxy_pass $auth_backend;
}
```

### Chat Service (port 4002)

**Important**: The SSE location (`/api/v1/chat-messages/stream`) MUST come BEFORE the generic `/api/v1/chat-messages` location.

```nginx
# URL rewrite: frontend uses /threads, backend uses /chat-threads
location /api/v1/threads {
    set $chat_backend http://chat-service:4002;
    rewrite ^/api/v1/threads/(.*)$ /api/v1/chat-threads/$1 break;
    proxy_pass $chat_backend;
}

# URL rewrite: frontend uses /messages, backend uses /chat-messages
location /api/v1/messages {
    set $chat_backend http://chat-service:4002;
    rewrite ^/api/v1/messages/(.*)$ /api/v1/chat-messages/$1 break;
    proxy_pass $chat_backend;
}

# Direct path
location /api/v1/chat-threads {
    set $chat_backend http://chat-service:4002;
    proxy_pass $chat_backend;
}

# SSE endpoint -- MUST be before generic /chat-messages
location /api/v1/chat-messages/stream {
    set $chat_backend http://chat-service:4002;
    proxy_pass $chat_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 86400;
    proxy_buffering off;
    proxy_cache off;
}

# Generic chat messages
location /api/v1/chat-messages {
    set $chat_backend http://chat-service:4002;
    proxy_pass $chat_backend;
}
```

### Connector Service (port 4003)

```nginx
location /api/v1/connectors {
    set $connector_backend http://connector-service:4003;
    proxy_pass $connector_backend;
}

location /api/v1/models {
    set $connector_backend http://connector-service:4003;
    proxy_pass $connector_backend;
}
```

### Routing Service (port 4004)

```nginx
location /api/v1/routing {
    set $routing_backend http://routing-service:4004;
    proxy_pass $routing_backend;
}
```

### Memory Service (port 4005)

```nginx
# URL rewrites for memory and context
location /api/v1/memory {
    set $memory_backend http://memory-service:4005;
    rewrite ^/api/v1/memory/(.*)$ /api/v1/memories/$1 break;
    proxy_pass $memory_backend;
}

location /api/v1/context {
    set $memory_backend http://memory-service:4005;
    rewrite ^/api/v1/context/(.*)$ /api/v1/context-packs/$1 break;
    proxy_pass $memory_backend;
}

# Direct paths
location /api/v1/memories {
    set $memory_backend http://memory-service:4005;
    proxy_pass $memory_backend;
}

location /api/v1/context-packs {
    set $memory_backend http://memory-service:4005;
    proxy_pass $memory_backend;
}
```

### File Service (port 4006)

```nginx
location /api/v1/files {
    set $file_backend http://file-service:4006;
    proxy_pass $file_backend;
}
```

### Audit Service (port 4007)

```nginx
location /api/v1/audits {
    set $audit_backend http://audit-service:4007;
    proxy_pass $audit_backend;
}

location /api/v1/usage {
    set $audit_backend http://audit-service:4007;
    proxy_pass $audit_backend;
}
```

### Ollama Service (port 4008)

```nginx
location /api/v1/ollama {
    set $ollama_backend http://ollama-service:4008;
    proxy_pass $ollama_backend;
}
```

### Image Service (port 4012)

```nginx
# Regular requests
location /api/v1/images {
    set $image_backend http://image-service:4012;
    proxy_pass $image_backend;
}

# SSE endpoint for image generation progress
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

### File Generation Service (port 4013)

```nginx
# Regular requests
location /api/v1/file-generations {
    set $file_gen_backend http://file-generation-service:4013;
    proxy_pass $file_gen_backend;
}

# SSE endpoint for file generation progress
location /api/v1/file-generations/ {
    set $file_gen_backend http://file-generation-service:4013;
    proxy_pass $file_gen_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 86400;
    proxy_buffering off;
    proxy_cache off;
}
```

### Log Services

```nginx
location /api/v1/client-logs {
    set $client_logs_backend http://client-logs-service:4010;
    proxy_pass $client_logs_backend;
}

location /api/v1/server-logs {
    set $server_logs_backend http://server-logs-service:4011;
    proxy_pass $server_logs_backend;
}
```

### Health Service (port 4009)

```nginx
location /api/v1/health {
    set $health_backend http://health-service:4009;
    proxy_pass $health_backend;
}
```

---

## 6. SSE Configuration Explained

Three endpoints use SSE and require special nginx configuration:

| Endpoint                   | Service          |
| -------------------------- | ---------------- |
| `/api/v1/chat-messages/stream` | chat-service |
| `/api/v1/images/`          | image-service    |
| `/api/v1/file-generations/`| file-gen-service |

Required directives:

| Directive                     | Value    | Why                                                      |
| ----------------------------- | -------- | -------------------------------------------------------- |
| `proxy_http_version`          | `1.1`    | HTTP/1.0 closes connections after each response          |
| `proxy_set_header Connection` | `""`     | Removes `Connection: close` to keep connection alive     |
| `proxy_read_timeout`          | `86400`  | 24-hour timeout prevents nginx from closing SSE early    |
| `proxy_buffering`             | `off`    | Events sent immediately, not buffered in nginx           |
| `proxy_cache`                 | `off`    | SSE responses must not be cached                         |

---

## 7. URL Rewriting

| Frontend Path        | Rewritten To              | Service        |
| -------------------- | ------------------------- | -------------- |
| `/api/v1/threads/*`  | `/api/v1/chat-threads/*`  | chat-service   |
| `/api/v1/messages/*` | `/api/v1/chat-messages/*` | chat-service   |
| `/api/v1/memory/*`   | `/api/v1/memories/*`      | memory-service |
| `/api/v1/context/*`  | `/api/v1/context-packs/*` | memory-service |

The `break` flag processes the rewrite internally without an external redirect.

---

## 8. Dynamic DNS Resolution

Every location block uses a variable for the upstream URL:

```nginx
set $auth_backend http://auth-service:4001;
proxy_pass $auth_backend;
```

This is required because Nginx normally resolves hostnames only at startup. Using a variable forces Nginx to resolve the hostname on every request using the Docker DNS resolver. When a container restarts and gets a new IP, the 5-second DNS TTL ensures Nginx picks up the change.

---

## 9. Adding a New Route

To add a new service route:

1. Add the location block in `infra/nginx/nginx.conf`:
   ```nginx
   location /api/v1/new-service {
       set $new_service_backend http://new-service:PORT;
       proxy_pass $new_service_backend;
   }
   ```

2. If the service has SSE endpoints, add SSE-specific configuration

3. Restart nginx:
   ```bash
   docker compose -f docker-compose.dev.yml restart nginx
   ```

4. Verify:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/new-service/health
   ```

---

## 10. Troubleshooting

### 502 Bad Gateway
- The upstream service is not running or unhealthy
- Check: `docker compose ps <service-name>`

### 504 Gateway Timeout
- The upstream service took too long to respond
- For non-SSE routes, timeout is 60s
- Consider increasing `proxy_read_timeout` for slow operations

### SSE Events Not Reaching Client
- Verify `proxy_buffering off` is set
- Verify the SSE location block is correctly positioned
- Check nginx logs: `docker compose logs nginx`

### DNS Resolution Failures
- Verify the service name in the location block matches the compose service name
- Check that resolver directive is present: `resolver 127.0.0.11 valid=5s`
