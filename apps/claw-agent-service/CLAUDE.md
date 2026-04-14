# Claw Agent Service — Development Rules

## Service Overview

Desktop agent runtime microservice for the ClawAI platform. Manages local agent sessions, terminal command approval flows, repository awareness, and filesystem events. Runs on port 4015 with its own PostgreSQL database (claw_agent).

## Tech Stack

- Runtime: NestJS 10 with TypeScript (strict mode)
- Database: PostgreSQL with Prisma ORM (claw_agent database)
- Cache: Redis (ioredis) — session state
- Messaging: RabbitMQ (amqplib)
- Scheduler: @nestjs/schedule — cleanup expired commands/sessions
- Validation: Zod
- Auth: JWT via @claw/shared-auth (user endpoints) + AgentKeyGuard (agent endpoints)
- Logging: nestjs-pino structured logging

## Architecture

Controller → Service → Repository (data access)
→ Manager (background cleanup, atomic transitions)

## Owned Tables

- AgentSession
- TerminalCommand
- LocalRepo
- FileWatchEvent

## Key Environment Variables

- AGENT_DATABASE_URL
- AGENT_PORT (default: 4015)
- REDIS_URL, RABBITMQ_URL, JWT_SECRET, ENCRYPTION_KEY

## Authentication Dual Mode

- User-facing endpoints: JWT via @claw/shared-auth AuthGuard
- Agent-facing endpoints: @Public() + @UseGuards(AgentKeyGuard) — authenticates via sessionKey

## Commands

npm run dev # Start with hot reload
npm run build # Production build
npm run typecheck # TypeScript type check
npm run test # Run unit tests
npm run migrate:dev # Create and run migration

## Docker Rebuild Procedure

docker compose -f docker-compose.dev.yml stop agent-service
docker compose -f docker-compose.dev.yml rm -f agent-service
docker rmi claw-agent-service
docker compose -f docker-compose.dev.yml up -d --build agent-service
