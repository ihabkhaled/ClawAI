# 12 — Types, Enums, Constants, and Declaration Ownership

## Purpose

Every declaration has exactly one home. Extracting types, enums, constants, and
functions out of logic files keeps those files focused, makes declarations
reusable, and lets ESLint mechanically enforce the "no god-file" discipline.

## Applies to

All backend logic files (`*.service.ts`, `*.manager.ts`, `*.controller.ts`,
`*.repository.ts`, `*.adapter.ts`, `*.utility.ts`, `*.guard.ts`, `*.filter.ts`,
`*.interceptor.ts`, `*.pipe.ts`, `*.module.ts`, `*.provider.ts`) and all frontend
`.tsx`/hook/store/service files.

## Mandatory rules

1. **No inline `type`/`interface`/`enum`/module-level `const`/standalone
   `function`** in any logic file. Extract to the dedicated location.
2. **Backend extraction targets:** types → `src/modules/<domain>/types/<name>.types.ts`
   (or `src/common/types/`); enums → `src/common/enums/<name>.enum.ts`; constants →
   `src/common/constants/` or `src/modules/<domain>/constants/`; utilities →
   `src/common/utilities/<name>.utility.ts`.
3. **Frontend extraction targets:** types → `src/types/`, enums → `src/enums/`,
   constants → `src/constants/`, utilities → `src/utilities/`, each re-exported from
   its `index.ts`.
4. **No string-literal union types** for domain values — use an enum.
5. **`type` over `interface`** unless declaration merging is required.
6. **Cross-service declarations go to a package** (see [14](14-shared-packages.md)):
   types → `@claw/shared-types`, constants → `@claw/shared-constants`.
7. **Only exception:** `private readonly logger = new Logger(ClassName.name)` may
   sit inside a class body.

## Prohibited patterns

- `type Foo = { … }` or `enum Bar { … }` declared inside a `*.service.ts`.
- `type Mode = 'auto' | 'manual'` — a string-literal union for a domain value.
- `const DEFAULTS = { … }` at module scope in a logic file.
- Re-declaring an enum locally that already exists in `@claw/shared-types`.

## Correct pattern

```
apps/claw-routing-service/src/common/enums/routing-mode.enum.ts   # the enum
apps/claw-routing-service/src/modules/routing/types/decision.types.ts
apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts
# routing.service.ts imports all three — declares none of them
```

## Enforcement

- **ESLint** (`no-restricted-syntax`) — flags inline interface/type/enum/const/
  function declarations and string-literal unions in logic files.
- **TS config** — extracted enums/types resolve via path aliases.

## Related skills

- [09-refactor-toolkit](../skills/09-refactor-toolkit.md)

## Related context

- Root `CLAUDE.md` — "No Inline Declarations Rule", "Extraction Rules".

## Definition of done

- [ ] Zero inline type/enum/const/function in touched logic files.
- [ ] Each declaration lives in its dedicated file and is re-exported.
- [ ] No string-literal unions for domain values.
