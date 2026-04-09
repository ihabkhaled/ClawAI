# Claw Image Service - Development Rules

## Service Overview

Image generation microservice for the Claw platform. Orchestrates image generation across cloud providers (DALL-E 3, Gemini Imagen) and local Stable Diffusion. Runs on port 4012 with its own PostgreSQL database (claw_images).

## Tech Stack

- **Runtime**: NestJS 10 with TypeScript (strict mode enabled)
- **Database**: PostgreSQL with Prisma ORM (claw_images database, port 5448)
- **Cache**: Redis (ioredis)
- **Messaging**: RabbitMQ (amqplib)
- **Validation**: Zod (NOT class-validator, NOT class-transformer)
- **Auth**: JWT (jsonwebtoken) for token verification
- **Logging**: nestjs-pino / pino structured logging

## Absolute Rules

1. **NEVER use `any`** -- use `unknown`, generics, or proper types.
2. **NEVER disable ESLint rules** -- no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.
3. **NEVER use `console.log`** -- use the NestJS `Logger` service.
4. **NEVER use `!` non-null assertion** -- handle nullability explicitly.
5. **NEVER use `process.env` directly** -- use `AppConfig` from `src/app/config/app.config.ts`.
6. **NEVER put business logic in controllers** -- controllers call exactly ONE service method.
7. **NEVER put Prisma calls outside repositories** -- repositories are the sole data-access layer.
8. **EVERY function must have an explicit return type**.
9. **Service methods max 30 lines**.
10. **Controllers are 3-line methods**: extract params, call ONE service, return result.
11. **All errors use BusinessException with a code**.
12. **No default exports** -- use named exports exclusively.

## Library Wrapping Rule

Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`. Services and controllers NEVER import third-party packages directly.

## Architecture

```
Controller -> Service -> Repository
                      -> ImageExecutionManager -> Adapters (OpenAI, Gemini, SD)
```

## Owned Tables

- ImageGeneration

## Commands

```bash
npm run dev          # Start with hot reload
npm run build        # Production build
npm run typecheck    # TypeScript type check
npm run validate     # typecheck + lint:strict + format:check
npm run test         # Run unit tests
npm run migrate:dev  # Create and run migration
npm run prisma:generate  # Regenerate Prisma client
```
