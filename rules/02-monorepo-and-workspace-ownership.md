# 02 — Monorepo and Workspace Ownership

## Purpose

ClawAI is an npm-workspaces monorepo: 17 NestJS services, one Next.js frontend,
and six shared packages. Ownership boundaries keep changes scoped, gates cheap,
and shared code from silently forking. This rule defines where code belongs and
how workspaces depend on each other.

## Applies to

`apps/claw-*`, `apps/claw-frontend`, `packages/shared-{auth,constants,entitlements,rabbitmq,types,utilities}`.

## Mandatory rules

1. **One workspace owns each concern.** A service owns its `apps/claw-<name>/`
   tree; shared code owns its `packages/shared-*` tree. Do not edit another
   service's source to work around a boundary — use HTTP or events.
2. **Depend on shared packages by name**, e.g. `import { CHAT_SERVICE_PORT } from '@claw/shared-constants'`,
   never by relative path into another workspace.
3. **Three shared kinds, three packages:** cross-service functions →
   `@claw/shared-utilities`; cross-service types/event payloads →
   `@claw/shared-types`; cross-service values → `@claw/shared-constants`.
   Auth glue → `@claw/shared-auth`; RabbitMQ glue → `@claw/shared-rabbitmq`;
   plan/entitlement gates → `@claw/shared-entitlements`.
4. **No duplicate utility across services.** If a helper lives identically in 2+
   services, it moves to `@claw/shared-utilities` and both import it.
5. **Gate only what you touched.** Run lint/typecheck/test/build in the changed
   workspace folder(s) only — never all-workspace (see [23](23-git-commits-hooks-and-release-gates.md)).

## Prohibited patterns

- `import x from '../../claw-auth-service/src/…'` — reaching into a sibling app.
- Copy-pasting a utility between services instead of promoting it to a package.
- Running the full-repo gate for a one-service change.

## Correct pattern

```ts
// apps/claw-chat-service/src/…  — consume shared packages, never sibling apps
import { EXCHANGE_NAME, CHAT_SERVICE_PORT } from '@claw/shared-constants';
import { httpClient } from '@claw/shared-utilities';
```

## Enforcement

- **ESLint** (`import-x/no-useless-path-segments`, no-relative-parent into apps) + **TS config** (path aliases only resolve to own workspace + `@claw/*`).
- **Knowledge check** — `.ai/manifests/workspace-dependency-graph.json` /
  `workspaces.json` describe the legal dependency edges.
- **CI job** — per-workspace matrix builds each workspace in isolation.

## Related skills

- [01-codebase-navigation](../skills/01-codebase-navigation.md)
- [09-refactor-toolkit](../skills/09-refactor-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Workspace Layout", "Shared-utilities-first mindset".
- `.ai/manifests/packages.json`, `.ai/manifests/workspaces.json`.

## Definition of done

- [ ] New/changed shared code lives in the correct `packages/shared-*`.
- [ ] No relative import crosses a workspace boundary.
- [ ] No utility is duplicated across services.
- [ ] Gates ran only in touched workspaces.
