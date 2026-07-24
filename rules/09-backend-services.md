# 09 — Backend Services

## Purpose

Services are the business-logic layer: they own domain rules, ownership/permission
checks, and event publishing. They coordinate repositories, managers, and adapters
while staying small enough to read at a glance.

## Applies to

`apps/claw-*/src/**/*.service.ts`.

## Mandatory rules

1. **Method ceiling: ≤ 30 lines (hard ESLint warn at 50 / complexity 10).** Each
   public method does ONE thing; longer logic splits into private helpers or a Manager.
2. **Ownership and permission checks live here** — not in the controller, not in
   the repository. Verify the acting user owns/may act on the entity before mutating.
3. **Publish RabbitMQ events from the service, after persistence** — never from a
   controller or repository (see [17](17-rabbitmq-events-and-jobs.md)).
4. **Data access only via repositories.** Services never call Prisma/Mongoose.
5. **Handle nullability explicitly** — no `!` non-null assertion; branch or throw
   `EntityNotFoundException`.
6. **Domain errors are typed:** `BusinessException(message, status, code)` and
   `EntityNotFoundException` — with machine-readable codes (see [18](18-error-handling-and-reliability.md)).
7. **No inline declarations; full logging** on every public method (see [12](12-types-enums-constants-and-declaration-ownership.md), [19](19-logging-observability-and-redaction.md)).

## Prohibited patterns

- A service method calling `this.prisma.*` / a Mongoose model directly.
- Returning a raw persistence model to the controller (map to a DTO/plain object).
- Publishing an event before the write is committed, or from outside the service.
- `entity!.field` to dodge a null check.

## Correct pattern

```ts
// apps/claw-memory-service/src/modules/memory/memory.service.ts
async forget(userId: string, memoryId: string): Promise<void> {
  const memory = await this.memoryRepo.findById(memoryId);
  if (!memory) throw new EntityNotFoundException('Memory', memoryId);
  if (memory.userId !== userId) throw new BusinessException('Forbidden', HttpStatus.FORBIDDEN, 'MEMORY_FORBIDDEN');
  await this.memoryRepo.softDelete(memoryId);
  await this.events.publish(MEMORY_FORGOTTEN, { userId, memoryId }); // after persistence
}
```

## Enforcement

- **ESLint** (service-file restrictions) — method size/complexity, no inline
  declarations, no direct DB import.
- **Architecture test** — services import repositories, not the DB client.
- **Unit test** — ownership checks, error branches, and event publishing asserted.

## Related skills

- [02-service-scaffold](../skills/02-service-scaffold.md)
- [08-event-bus-toolkit](../skills/08-event-bus-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Service Rules", "Event Publishing Rules".

## Definition of done

- [ ] Methods ≤ 30 lines; each does one thing.
- [ ] Ownership/permission checked before mutation.
- [ ] Events published from the service after persistence.
- [ ] Nullability handled explicitly; errors typed with codes.
