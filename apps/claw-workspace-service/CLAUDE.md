# Claw Workspace Service — Development Rules

## Service Overview

Workspace connector microservice for the ClawAI platform. Manages connections to Slack, Jira, GitHub, Figma, ClickUp, Google Drive, Gmail, Microsoft SharePoint/OneDrive, and other workspace tools. Handles OAuth2 PKCE flows, token lifecycle, delta sync, and health monitoring. Runs on port 4014 with its own PostgreSQL database (claw_workspace).

## Tech Stack

- **Runtime**: NestJS 10 with TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM (claw_workspace database)
- **Cache**: Redis (ioredis) — OAuth state, refresh locks
- **Messaging**: RabbitMQ (amqplib)
- **Validation**: Zod
- **Auth**: JWT via @claw/shared-auth
- **Logging**: nestjs-pino structured logging
- **Encryption**: AES-256-GCM for all OAuth tokens and API keys

## Architecture

```
Controller → Service → Repository (data access)
                     → Manager (OAuth token lifecycle, sync, health)
                     → Adapter (provider-specific API calls)
```

## Owned Tables

- WorkspaceConnector
- WorkspaceSyncRun
- WorkspaceHealthEvent

## Key Environment Variables

- `WORKSPACE_DATABASE_URL`
- `WORKSPACE_PORT` (default: 4014)
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
- `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `ENCRYPTION_KEY` (shared 64-char hex)
- `REDIS_URL`, `RABBITMQ_URL`, `JWT_SECRET`

## Commands

```bash
npm run dev          # Start with hot reload
npm run build        # Production build
npm run typecheck    # TypeScript type check
npm run test         # Run unit tests
npm run migrate:dev  # Create and run migration
```

## Docker Rebuild Procedure

```bash
docker compose -f docker-compose.dev.yml stop workspace-service
docker compose -f docker-compose.dev.yml rm -f workspace-service
docker rmi claw-workspace-service
docker compose -f docker-compose.dev.yml up -d --build workspace-service
```
