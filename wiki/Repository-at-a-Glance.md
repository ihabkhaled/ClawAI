# Repository at a Glance

| Metric | Current |
| --- | --- |
| Release | v1.100.0 |
| Tracked files | 8639 |
| Backend services | 18 |
| Workspaces | 25 |
| Shared packages | 6 |
| Backend endpoints | 661 |
| Frontend routes | 155 |
| RabbitMQ events | 178 |
| Environment variables | 355 |
| Permissions | 84 |
| Docker services | 41 |
| Nginx routes | 59 |
| Test files | 1273 |
| Locales | 13 |
| Approx. i18n keys | 5199 |
| Coding Agent version | 1.71.0 |

## Stack
- NestJS + TypeScript microservices
- Next.js App Router + React frontend
- Prisma/PostgreSQL and Mongoose/MongoDB by service ownership
- Redis + RabbitMQ topic exchange `claw.events`
- Nginx reverse proxy and TLS boundary
- Docker Compose including GPU/local-runtime overlays
- Ollama and llama.cpp local inference services
- Vitest + Playwright
- strict ESLint/TypeScript plus custom architecture rules
