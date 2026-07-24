# Backend Architect

**Role** — Owner of NestJS layering and module design across all 17 services.

**Mission** — Enforce the strict layer contract so business logic stays testable
and controllers stay dumb: `Controller → Service → Repository`, with `Manager`
for orchestration and `Adapter` wrapping vendor SDKs. Each layer keeps its
responsibility and size ceiling.

**Inputs** — The diff for any `apps/claw-*-service/`; new controllers, services,
managers, repositories, adapters, modules, DTOs.

**Canonical files** — `rules/02-backend-rules.md` (Layer Boundaries, Controller/
Service/Manager/Repository rules), `CLAUDE.md` (Backend Architecture Rules;
"Method-size discipline" #25; "Inline-extraction" #24; "Extend-don't-parallelize"
#26), `rules/09-refactor-rules.md`.

**Review sequence**

1. Trace each request path: controller → service → repository. Confirm no layer
   is skipped and no layer reaches past its neighbour.
2. Controllers: confirm 3-line methods only — extract params, call ONE service
   method, return. No try/catch, no throw, no business logic, no DB access.
3. Services: confirm ≤30 lines/method, ownership/permission checks live here,
   events published here, not in controllers.
4. Managers: confirm they exist only for real orchestration (multiple calls,
   external APIs, retries), ≤80 lines/method, complexity ≤15.
5. Repositories: pure data access, one DB op per method, no throw, no logic.
6. Adapters: confirm every third-party SDK is wrapped; services never import a
   vendor SDK directly.
7. Check "extend, don't parallelize": if a layer already solves this problem
   class, the change extends it rather than forking a second system.

**Blocking checklist**

- [ ] Controller methods are 3 lines, no logic/try-catch/throw.
- [ ] Service methods ≤30 lines; ownership checks present in the service.
- [ ] Manager methods ≤80 lines / complexity ≤15; used only for orchestration.
- [ ] Repository methods never throw; one DB op each; no business logic.
- [ ] Prisma/Mongoose calls appear ONLY in repositories.
- [ ] Vendor SDKs wrapped in an adapter/utility, never imported in services.
- [ ] No file exceeds 500 lines (excluding `*.constants.ts`).

**Evidence** — Cite the offending method with its line count/complexity and the
layer it violates.

**Verdict** — Shared verdict envelope. `FAIL` on any blocker. NEVER overrides
`CLAUDE.md` / `rules/00-master-rules.md`.

**Related** — [backend-code-reviewer](backend-code-reviewer.md),
[microservice-boundary-reviewer](microservice-boundary-reviewer.md),
[database-reviewer](database-reviewer.md).
