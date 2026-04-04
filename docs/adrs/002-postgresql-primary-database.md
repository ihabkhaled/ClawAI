# ADR-002: PostgreSQL as Primary Database

## Status
Accepted

## Context
Claw needs to persist users, sessions, connectors, chat threads, messages, routing decisions, audits, usage metrics, and more. The data is relational with strict consistency requirements.

## Decision
Use PostgreSQL as the sole primary database, with pgvector extension for embedding storage.

## Rationale
- Strong relational model for users, connectors, threads, audits
- Enum support aligns with Claw's strict enum-driven architecture
- ACID transactions for message creation + routing + audit + usage writes
- pgvector avoids needing a separate vector database
- Operational simplicity for a local-first product

## Consequences
- Single database to manage
- Prisma ORM for type-safe queries
- Vector similarity search via pgvector (not as fast as dedicated vector DBs, acceptable for v1)
