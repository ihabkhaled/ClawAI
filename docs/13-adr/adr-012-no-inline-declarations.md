# ADR-012: No Inline Declarations in Logic Files

## Status

Accepted (2025-Q1)

## Context

As the codebase grew to 13 backend services and a complex frontend, the team observed recurring problems with inline type definitions, constants, and enums in logic files:

- **Duplication**: The same type or constant was defined in multiple files, leading to drift when one was updated but not the others.
- **Discovery**: Finding all types related to a domain required searching through service, controller, and manager files instead of looking in one predictable location.
- **File bloat**: Service files grew to 200+ lines, with half the file being type definitions and constants rather than business logic.
- **Circular imports**: Inline types in service files created import cycles when a manager needed the same type.
- **Review difficulty**: Code reviews spent time on type definitions mixed with logic, making it harder to focus on behavior changes.

## Decision

Ban all inline type, interface, enum, and module-level constant declarations in logic files. Every declaration must be extracted to its dedicated file.

### Backend Extraction Rules

| Declaration      | Must go in                                         |
| ---------------- | -------------------------------------------------- |
| Types/interfaces | `src/modules/<domain>/types/<name>.types.ts`       |
| Enums            | `src/common/enums/<name>.enum.ts`                  |
| Constants        | `src/common/constants/` or module `constants/`     |
| Utilities        | `src/common/utilities/<name>.utility.ts`           |
| DTOs             | `src/modules/<domain>/dto/<name>.dto.ts`           |

### Frontend Extraction Rules

| Declaration      | Must go in                                |
| ---------------- | ----------------------------------------- |
| Types            | `src/types/<domain>.types.ts`             |
| Prop types       | `src/types/component.types.ts`            |
| Enums            | `src/enums/<name>.enum.ts`                |
| Constants        | `src/constants/<name>.constants.ts`       |
| Hooks            | `src/hooks/<domain>/use-<name>.ts`        |
| Utilities        | `src/utilities/<name>.utility.ts`         |

### Files Subject to This Rule

Backend: `*.service.ts`, `*.manager.ts`, `*.controller.ts`, `*.repository.ts`, `*.adapter.ts`, `*.utility.ts`, `*.guard.ts`, `*.filter.ts`, `*.interceptor.ts`, `*.pipe.ts`, `*.module.ts`

Frontend: `*.tsx` (components), hook files, store files, service files

### Single Exception

`private readonly logger = new Logger(ClassName.name)` is allowed inline in NestJS classes because it is the standard NestJS pattern and is tightly coupled to the class lifecycle.

## Consequences

### Positive

- **Single source of truth**: Every type, enum, and constant exists in exactly one file. No duplication, no drift.
- **Predictable location**: Developers know exactly where to find types (`types/`), constants (`constants/`), and enums (`enums/`).
- **Focused files**: Logic files contain only logic. Type files contain only types. Easier to review, easier to understand.
- **Reusability**: Extracted declarations are naturally reusable across files. An inline type in a service file is not.
- **ESLint enforced**: Custom ESLint rules automatically detect and report inline declarations, making the rule impossible to forget.

### Negative

- **More files**: A feature that might have been one file becomes 3-4 files (types, constants, logic, test). The file count is higher, but each file is more focused.
- **Import verbosity**: Logic files have more import statements. Mitigated by barrel exports (`index.ts` files) in type and constant directories.
- **Friction for small changes**: Adding a single constant requires creating or editing a separate file. This friction is intentional -- it forces developers to think about where the declaration belongs.

## Alternatives Considered

### Allow Inline for Small Files

Permit inline declarations in files under 50 lines. This would reduce friction for small files but creates an inconsistent rule (allowed here, banned there) that is harder to enforce and leads to exceptions creeping into larger files. Rejected for inconsistency.

### Co-locate Types with Their Consumer

Allow types in the same file as the only function that uses them. This is the default in many codebases. Rejected because "only used here" is temporary -- types frequently get reused as features grow, at which point they must be extracted anyway.

### No Rule (Trust Developer Judgment)

Let developers decide on a case-by-case basis. Rejected because inconsistency was the problem. Without a clear rule, some files had inline types and others did not, making the codebase unpredictable.
