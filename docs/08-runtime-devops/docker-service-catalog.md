# Docker Service Catalog

> Every container: image, port, env vars, volumes, dependencies, and health check.

---

## 1. Infrastructure Containers

### PostgreSQL Instances (9 Containers)

All PostgreSQL instances use the `pgvector/pgvector:pg16` image, which includes the pgvector extension for embedding storage.

| Container              | Host Port | Database Name       | Env Vars                                          |
| ---------------------- | --------- | ------------------- | ------------------------------------------------- |
| `claw-pg-auth`         | 5441      | `claw_auth`         | PG_AUTH_USER, PG_AUTH_PASSWORD, PG_AUTH_DB         |
| `claw-pg-chat`         | 5442      | `claw_chat`         | PG_CHAT_USER, PG_CHAT_PASSWORD, PG_CHAT_DB        |
| `claw-pg-connector`    | 5443      | `claw_connectors`   | PG_CONNECTOR_USER, PG_CONNECTOR_PASSWORD, PG_CONNECTOR_DB |
| `claw-pg-routing`      | 5444      | `claw_routing`      | PG_ROUTING_USER, PG_ROUTING_PASSWORD, PG_ROUTING_DB |
| `claw-pg-memory`       | 5445      | `claw_memory`       | PG_MEMORY_USER, PG_MEMORY_PASSWORD, PG_MEMORY_DB  |
| `claw-pg-files`        | 5446      | `claw_files`        | PG_FILES_USER, PG_FILES_PASSWORD, PG_FILES_DB      |
| `claw-pg-ollama`       | 5447      | `claw_ollama`       | PG_OLLAMA_USER, PG_OLLAMA_PASSWORD, PG_OLLAMA_DB   |
| `claw-pg-images`       | 5448      | `claw_images`       | PG_IMAGES_USER, PG_IMAGES_PASSWORD, PG_IMAGES_DB   |
| `claw-pg-file-generations` | 5449  | `claw_file_generations` | PG_FILE_GEN_USER, PG_FILE_GEN_PASSWORD, PG_FILE_GEN_DB |

**Volume**: Each has a named volume mapped to `/var/lib/postgresql/data`
**Health check**: `pg_isready -U $USER -d $DB` (interval: 10s, retries: 5)

### MongoDB

| Property       | Value                              |
| -------------- | ---------------------------------- |
| Image          | `mongo:7`                          |
| Host Port      | 27018                              |
| Internal Port  | 27017                              |
| Volume         | `mongo-data:/data/db`              |
| Env Vars       | MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD |
| Health Check   | `mongosh --eval "db.runCommand('ping')"` |
| Databases      | claw_audit, claw_client_logs, claw_server_logs |

### Redis

| Property       | Value                              |
| -------------- | ---------------------------------- |
| Image          | `redis:7-alpine`                   |
| Host Port      | 6380                               |
| Internal Port  | 6379                               |
| Volume         | `redis-data:/data`                 |
| Health Check   | `redis-cli ping`                   |
| Purpose        | Cache, session store               |

### RabbitMQ

| Property       | Value                              |
| -------------- | ---------------------------------- |
| Image          | `rabbitmq:3-management-alpine`     |
| Host Ports     | 5672 (AMQP), 15672 (Management UI) |
| Volume         | `rabbitmq-data:/var/lib/rabbitmq`  |
| Env Vars       | RABBITMQ_DEFAULT_USER, RABBITMQ_DEFAULT_PASS |
| Health Check   | `rabbitmq-diagnostics check_running` |
| Management UI  | http://localhost:15672              |

### Ollama

| Property       | Value                              |
| -------------- | ---------------------------------- |
| Image          | `ollama/ollama:latest`             |
| Host Port      | 11434                              |
| Volume         | `ollama-data:/root/.ollama`        |
| Health Check   | `ollama list` (start_period: 30s)  |
| GPU Support    | Optional (via deploy.resources)    |
| Purpose        | Local LLM inference engine         |

---

## 2. Backend Service Containers

All backend services share these common properties:
- **Base image**: Node.js 20 (via custom Dockerfile.dev)
- **Env file**: `.env` (root)
- **Network**: `claw-network`
- **Restart**: `unless-stopped`
- **Health check**: `wget -qO- http://localhost:PORT/api/v1/health` (interval: 15s, retries: 10, start_period: 45s)

### Auth Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4001                                                           |
| Database    | PostgreSQL (pg-auth)                                           |
| Key Env     | AUTH_DATABASE_URL, JWT_SECRET, JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY |
| Depends On  | pg-auth, redis, rabbitmq                                       |
| Volumes     | src/, prisma/ (dev hot reload)                                 |

### Chat Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4002                                                           |
| Database    | PostgreSQL (pg-chat)                                           |
| Key Env     | CHAT_DATABASE_URL, OLLAMA_BASE_URL, CONNECTOR_SERVICE_URL, MEMORY_SERVICE_URL, FILE_SERVICE_URL |
| Depends On  | pg-chat, redis, rabbitmq                                       |

### Connector Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4003                                                           |
| Database    | PostgreSQL (pg-connector)                                      |
| Key Env     | CONNECTOR_DATABASE_URL, ENCRYPTION_KEY                         |
| Depends On  | pg-connector, redis, rabbitmq                                  |

### Routing Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4004                                                           |
| Database    | PostgreSQL (pg-routing)                                        |
| Key Env     | ROUTING_DATABASE_URL, OLLAMA_BASE_URL, OLLAMA_ROUTER_MODEL, CONNECTOR_SERVICE_URL |
| Depends On  | pg-routing, redis, rabbitmq                                    |

### Memory Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4005                                                           |
| Database    | PostgreSQL (pg-memory)                                         |
| Key Env     | MEMORY_DATABASE_URL, OLLAMA_BASE_URL, MEMORY_EXTRACTION_MODEL  |
| Depends On  | pg-memory, redis, rabbitmq                                     |

### File Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4006                                                           |
| Database    | PostgreSQL (pg-files)                                          |
| Key Env     | FILE_DATABASE_URL, FILE_STORAGE_PATH                           |
| Depends On  | pg-files, redis, rabbitmq                                      |
| Extra Volume| file-storage-data:/data/files                                  |

### Audit Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4007                                                           |
| Database    | MongoDB                                                        |
| Key Env     | AUDIT_MONGODB_URI                                              |
| Depends On  | mongodb, redis, rabbitmq                                       |

### Ollama Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4008                                                           |
| Database    | PostgreSQL (pg-ollama)                                         |
| Key Env     | OLLAMA_DATABASE_URL, OLLAMA_BASE_URL, AUTO_PULL_MODELS         |
| Depends On  | pg-ollama, redis, rabbitmq                                     |

### Health Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4009                                                           |
| Database    | None                                                           |
| Key Env     | All *_SERVICE_URL variables for health checks                  |
| Depends On  | redis, rabbitmq                                                |

### Client Logs Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4010                                                           |
| Database    | MongoDB                                                        |
| Key Env     | CLIENT_LOGS_MONGODB_URI                                        |
| Depends On  | mongodb, redis, rabbitmq                                       |

### Server Logs Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4011                                                           |
| Database    | MongoDB                                                        |
| Key Env     | SERVER_LOGS_MONGODB_URI                                        |
| Depends On  | mongodb, redis, rabbitmq                                       |

### Image Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4012                                                           |
| Database    | PostgreSQL (pg-images)                                         |
| Key Env     | IMAGE_DATABASE_URL, STABLE_DIFFUSION_URL, COMFYUI_BASE_URL    |
| Depends On  | pg-images, redis, rabbitmq                                     |

### File Generation Service

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Port        | 4013                                                           |
| Database    | PostgreSQL (pg-file-generations)                               |
| Key Env     | FILE_GENERATION_DATABASE_URL                                   |
| Depends On  | pg-file-generations, redis, rabbitmq                           |

---

## 3. Proxy and Frontend

### Nginx

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Image       | nginx:alpine                                                   |
| Host Port   | 4000                                                           |
| Config      | ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro              |
| Depends On  | All backend services (service_healthy)                         |

### Frontend

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Build       | apps/claw-frontend/Dockerfile.dev                              |
| Host Port   | 3000                                                           |
| Volumes     | src/, public/ (dev hot reload)                                 |
| Depends On  | nginx (service_started)                                        |
| Key Env     | NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_NAME                      |

---

## 4. Resource Estimates

| Component           | RAM (idle) | RAM (active) | Disk        |
| ------------------- | ---------- | ------------ | ----------- |
| 9x PostgreSQL       | ~1.8 GB    | ~3 GB        | ~500 MB     |
| MongoDB             | ~300 MB    | ~500 MB      | ~100 MB     |
| Redis               | ~50 MB     | ~100 MB      | ~10 MB      |
| RabbitMQ            | ~200 MB    | ~300 MB      | ~50 MB      |
| Ollama (5 models)   | ~2 GB      | ~6 GB        | ~10 GB      |
| 13x NestJS services | ~2.6 GB    | ~4 GB        | ~500 MB     |
| Nginx               | ~10 MB     | ~20 MB       | ~5 MB       |
| Next.js frontend    | ~500 MB    | ~800 MB      | ~300 MB     |
| **Total minimum**   | **~7.5 GB**| **~15 GB**   | **~11.5 GB**|
