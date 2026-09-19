# 11 — DTOs and Validation

## Purpose

Every byte that enters a service is validated at the boundary with Zod. Bounded,
typed input is the first line of defense against oversized payloads, injection,
and silent shape drift between frontend and backend.

## Applies to

`apps/claw-*/src/modules/<domain>/dto/*.dto.ts` and the frontend Zod schemas in
`apps/claw-frontend/src/lib/validation/*.schema.ts`.

## Mandatory rules

1. **All input validated with Zod** — never `class-validator`, never hand-parsing.
2. **Every `z.string()` has `.max()`**; **every `z.array()` has `.max()`.** Bounds
   are mandatory, not optional, to cap payload size.
3. **DTOs live in `dto/<name>.dto.ts`** and export **both** the schema and the
   `z.infer` type. No inline schemas in controllers/services.
4. **Refinements encode business constraints** at the DTO edge where cheap, e.g.
   `criticEnabled ⇒ judgeEnabled` and `criticEnabled ⇒ criticModel !== ''`.
5. **`.strict()` where the shape is closed** so unknown keys are rejected, not
   silently dropped — and the FE filter type must match that closed set exactly
   (see [06](06-frontend-queries-and-cache.md)).
6. **FE and BE field names match verbatim.** The FE schema mirrors the BE DTO;
   renames happen only in UI labels, never in the type.
7. **Enums, not string unions**, for constrained values (`z.nativeEnum(...)`).
8. **A DTO bound must fit the transport, and match its caller's bound.** Every
   layer a request passes through has its own size limit: nginx
   `client_max_body_size`, Express's JSON limit (**100 kB by default**), and
   the DTO's `.max()`. The service's JSON limit must hold the largest request
   any of its DTOs allows, at six bytes per character (a `\uXXXX` escape).
   Tie the two together with a named constant and a spec.
   An internal DTO must also accept everything its caller accepts: when
   chat-service passes the user's message on, the receiving `.max()` must be
   at least chat's own limit. Otherwise the request dies in body-parser, or
   after work was done and paid for, which is worse. See
   [ADR-105](../docs/13-adr/adr-105-answer-export-through-the-file-pipeline.md);
   file-generation had a 100 kB transport under a 10M-character DTO, and a
   4,000-character prompt limit under a 100k-character chat message.

## Prohibited patterns

- A `z.string()`/`z.array()` with no length/size bound.
- A Zod schema declared inline inside a controller or service.
- `z.enum(['a','b'])` where a shared enum exists — use `z.nativeEnum(Enum)`.
- A `.strict()` BE schema paired with a superset FE filter type (guaranteed 400).
- A `.max()` larger than the service's JSON body limit can carry, or smaller
  than the bound of the service that calls it.
- A free `z.string()` for a value that is written to a Prisma enum column: it
  fails in Prisma as a 500 instead of at the DTO as a 400.

## Correct pattern

```ts
// apps/claw-chat-service/src/modules/chat/dto/create-compare.dto.ts
export const CreateCompareSchema = z
  .object({
    content: z.string().min(1).max(20_000),
    models: z.array(z.string().max(200)).min(2).max(5),
    criticEnabled: z.boolean().default(false),
    criticModel: z.string().max(200).default(''),
  })
  .strict()
  .refine((d) => !d.criticEnabled || d.criticModel !== '', { message: 'criticModel required' });
export type CreateCompareDto = z.infer<typeof CreateCompareSchema>;
```

## Enforcement

- **ESLint** — bans inline type/schema declarations in logic files.
- **Unit test** — DTO fuzz tests (valid + boundary + null/empty/overflow + invalid enum).
- **TS config** — the exported inferred type keeps FE/BE in sync at typecheck.

## Related skills

- [05-qa-toolkit](../skills/05-qa-toolkit.md)

## Related context

- Root `CLAUDE.md` — "DTO/Validation Rules".

## Definition of done

- [ ] Every string/array has an explicit bound; schema is `.strict()` where closed.
- [ ] Schema + inferred type exported from the DTO file.
- [ ] DTO fuzz test covers valid/boundary/invalid cases.
- [ ] FE schema mirrors BE field names verbatim.
