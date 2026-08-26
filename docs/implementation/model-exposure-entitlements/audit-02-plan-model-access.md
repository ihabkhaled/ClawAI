# Audit 02 - Plan Model Access

Sources read: apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts, apps/claw-auth-service/src/modules/plans/services/plans.service.ts

## 1. Route that sets plan model access

The controller method `PlansController.setModelAccess` (plans.controller.ts lines
~108-113) handles `@Put(':id/model-access')`, i.e. `PUT /admin/plans/:id/model-access`.
The class is guarded at the controller level by `@Roles(UserRole.ADMIN)`
(`@Controller('admin/plans')`, line ~34); no per-method `@RequirePermissions`
decorator is present on `setModelAccess` (UNVERIFIED whether `@Roles` composes a
permissions guard downstream). It validates the body with
`@Body(new ZodValidationPipe(setPlanModelAccessSchema)) dto: SetPlanModelAccessDto`
and passes `(id, dto)` to `this.plansService.setModelAccess(id, dto)`.

## 2. Service-layer validation

`PlansService.setModelAccess` (plans.service.ts lines ~199-204) calls
`this.getPlan(id)` to confirm the plan exists, then directly calls
`this.plansRepository.replaceModelAccess(id, dto.models)` and logs the row count.
It performs NO check that each `(provider, model)` in `dto.models` exists in real
synced inventory; the rows are persisted as-is by `replaceModelAccess`.

## 3. Verdict

Yes - an admin can persist a model id that was never synced from any connector,
because `setModelAccess` never validates submitted rows against connector
inventory before `replaceModelAccess` writes them.
