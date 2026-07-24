# Authorization Lessons

Durable lessons about _what_ an authenticated caller may do (RBAC, permission
catalog, plan feature gates, ownership checks). Authentication is in
[authentication-lessons](authentication-lessons.md). See [README](README.md).

---

### Ownership is a service-layer decision, tested to 100% branch coverage (2026-07-24)

**What happened.** Ownership/permission checks are pure decision logic — the exact
kind of code where one wrong branch means a user reads or mutates another user's data.

**The durable lesson.** Authorization decisions are the highest-blast-radius pure
logic in the system. They belong in the service layer (not controllers, not
repositories) and deserve exhaustive branch testing precisely because they have no
I/O to hide behind.

**How to apply.** Validate ownership/permissions in the service method, before any
side effect. Cover every branch: owner, non-owner, admin override, missing resource,
disabled resource. Target 100% branch coverage on these decisions per the coverage
policy.

**Related.** [testing/coverage-policy](../testing/coverage-policy.md);
[backend-patterns](backend-patterns.md); [testing/security-testing-standard](../testing/security-testing-standard.md).

---

### Permissions come from the enum catalog, never string literals (2026-07-24)

**What happened.** The permission set is a single source of truth
(`packages/shared-types` `Permission` enum). Comparing against raw strings risks
typos that silently grant or deny.

**The durable lesson.** A misspelled permission string is a silent authorization bug —
it fails open or closed with no compiler warning. An enum makes the mistake a type
error.

**How to apply.** Reference the `Permission` enum; never compare against raw strings.
New permissions are added to the enum catalog and to the relevant role's default
grants in the same change.

**Related.** `CLAUDE.md` → Permission catalog; ADR-051 workspace-view-and-connect-permissions.

---

### Read and write permissions are separate — narrow reads don't imply writes (2026-07-24)

**What happened.** `WORKSPACE_VIEW` / `WORKSPACE_APP_CONFIG_VIEW` were added as
narrow read-only grants so a USER can browse the shell and sanitized app-configs
(without `encryptedSecret`) while all mutation stayed gated by
`ADMIN_WORKSPACE_AUTOMATION_MANAGE`.

**The durable lesson.** "Can see it" and "can change it" are distinct permissions.
Bundling them over-grants; splitting them lets you expose read surfaces safely. And
a read surface must strip secret fields before it returns.

**How to apply.** Model read and write as separate permissions. Sanitize sensitive
fields (`encryptedSecret`, `passwordHash`, `encryptedTokens`) out of any read payload.
Verify in QA that read endpoints never leak secret columns.

**Related.** [authentication-lessons](authentication-lessons.md);
[testing/security-testing-standard](../testing/security-testing-standard.md).

---

### Plan gates and RBAC are two independent checks — enforce both (2026-07-24)

**What happened.** Feature access depends on BOTH the plan entitlement (`allow*`
flags via `@claw/shared-entitlements`) AND the role permission. Checking one but not
the other lets a permitted-but-unentitled (or entitled-but-unpermitted) caller
through.

**The durable lesson.** Entitlement ("does your plan include this?") and authorization
("does your role allow this?") are orthogonal gates. Passing one says nothing about
the other.

**How to apply.** Gate features on both the entitlement payload and the permission.
Encode dependencies explicitly (e.g. Critic requires Judge — DTO refine enforces
`criticEnabled ⇒ judgeEnabled`). The FE `useFeatureGates` and BE `AccessControlService`
must agree.

**Related.** `CLAUDE.md` → Plan feature gates; ADR-050 critic-as-sibling-of-judge.
