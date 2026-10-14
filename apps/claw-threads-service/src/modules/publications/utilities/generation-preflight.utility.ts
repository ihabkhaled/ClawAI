import { BadRequestException, ForbiddenException, HttpStatus } from '@nestjs/common';
import {
  hasPermission,
  isModelAllowedForUsage,
  ModelUsageType,
  type UserEntitlements,
} from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { ThreadGenerationErrorCode } from '../../../common/enums/thread-generation-error-code.enum';
import { ThreadGenerationRoleKind } from '../../../common/enums/thread-generation-role-kind.enum';
import { codedErrorBody } from '../../../common/utilities/coded-error-body.utility';
import {
  MICRO_USD_PER_USD,
  MIN_THREAD_SPEND_CAP_MICRO_USD,
} from '../constants/generation-preflight.constants';
import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import type {
  ModelRef,
  PreflightRole,
  PreflightRoleRequest,
  StoredGenerationRole,
} from '../types/generation-preflight.types';

export function modelKey(ref: ModelRef): string {
  return `${ref.provider}/${ref.model}`;
}

function toRoles(
  kind: ThreadGenerationRoleKind,
  position: number,
  role: PreflightRoleRequest,
): PreflightRole[] {
  const primary: PreflightRole = {
    kind,
    roleId: role.id,
    position,
    provider: role.provider,
    model: role.model,
    isFallback: false,
  };
  const fallbacks = role.fallbacks.map((fallback): PreflightRole => ({
    ...primary,
    ...fallback,
    isFallback: true,
  }));
  return [primary, ...fallbacks];
}

/** Every model the request names: authors first, then judge, critic, each with its fallbacks. */
export function collectPreflightRoles(input: StartThreadGenerationDto): PreflightRole[] {
  return [
    ...input.authors.flatMap((author, index) =>
      toRoles(ThreadGenerationRoleKind.AUTHOR, index + 1, author),
    ),
    ...toRoles(ThreadGenerationRoleKind.JUDGE, 1, input.judge),
    ...toRoles(ThreadGenerationRoleKind.CRITIC, 1, input.critic),
  ];
}

/** The distinct provider/model pairs to look up, so a model used in several seats is asked once. */
export function distinctModelRefs(roles: readonly PreflightRole[]): ModelRef[] {
  const byKey = new Map<string, ModelRef>();
  for (const { provider, model } of roles) {
    byKey.set(modelKey({ provider, model }), { provider, model });
  }
  return [...byKey.values()];
}

/** "Author 2", "Judge", "Critic": how the seat is named in a message. */
export function describeRoleSeat(role: PreflightRole): string {
  if (role.kind === ThreadGenerationRoleKind.AUTHOR) return `Author ${String(role.position)}`;
  return role.kind === ThreadGenerationRoleKind.JUDGE ? 'Judge' : 'Critic';
}

function roleDetails(role: PreflightRole): Record<string, string> {
  return { role: role.kind, roleId: role.roleId, provider: role.provider, model: role.model };
}

export function assertSpendCapAllowed(capMicroUsd: number): void {
  if (capMicroUsd >= MIN_THREAD_SPEND_CAP_MICRO_USD) return;
  const minimumUsd = (MIN_THREAD_SPEND_CAP_MICRO_USD / MICRO_USD_PER_USD).toFixed(2);
  throw new BadRequestException(
    codedErrorBody(
      `The spend cap is too low to pay for a generation. Set at least $${minimumUsd}.`,
      ThreadGenerationErrorCode.SPEND_CAP_TOO_LOW,
      HttpStatus.BAD_REQUEST,
      { minimumMicroUsd: MIN_THREAD_SPEND_CAP_MICRO_USD, capMicroUsd },
    ),
  );
}

export function assertGenerationPermitted(entitlements: UserEntitlements): void {
  if (hasPermission(entitlements, Permission.THREAD_GENERATION_USE)) return;
  throw new ForbiddenException(
    codedErrorBody(
      'Your account role does not include Thread generation. Ask an administrator to enable it.',
      ThreadGenerationErrorCode.NOT_PERMITTED,
      HttpStatus.FORBIDDEN,
    ),
  );
}

/** Every model is looked up; the first one the catalog does not know is named in the error. */
export function assertModelsKnown(
  roles: readonly PreflightRole[],
  knownKeys: ReadonlySet<string>,
): void {
  const unknown = roles.find((role) => !knownKeys.has(modelKey(role)));
  if (!unknown) return;
  const subject = unknown.isFallback ? 'fallback model' : 'model';
  throw new BadRequestException(
    codedErrorBody(
      `The ${subject} ${modelKey(unknown)} chosen for ${describeRoleSeat(unknown)} is not in the model catalog. Pick a model from the list.`,
      ThreadGenerationErrorCode.MODEL_UNKNOWN,
      HttpStatus.BAD_REQUEST,
      roleDetails(unknown),
    ),
  );
}

/**
 * The same test chat applies to a picked model, for every model the request names: a primary
 * must be allowed as a primary and a fallback as a fallback. Nothing downstream re-checks the
 * plan (the chat gateway only reserves credit), so a fallback the plan excludes would otherwise
 * run for a user who may not use it. Only the caller's own request and plan name appear in the error.
 */
export function assertModelsOnPlan(
  entitlements: UserEntitlements,
  roles: readonly PreflightRole[],
): void {
  const denied = roles.find(
    (role) =>
      !isModelAllowedForUsage(
        entitlements,
        role.provider,
        role.model,
        role.isFallback ? ModelUsageType.FALLBACK : ModelUsageType.PRIMARY,
      ),
  );
  if (!denied) return;
  const planName = entitlements.plan?.name ?? 'current';
  const subject = denied.isFallback ? 'uses the fallback' : 'uses';
  throw new ForbiddenException(
    codedErrorBody(
      `${describeRoleSeat(denied)} ${subject} ${modelKey(denied)}, which your ${planName} plan does not include. Pick a model your plan includes, or upgrade to a plan that lists it.`,
      ThreadGenerationErrorCode.MODEL_NOT_ALLOWED_FOR_PLAN,
      HttpStatus.FORBIDDEN,
      { ...roleDetails(denied), plan: entitlements.plan?.slug ?? 'none' },
    ),
  );
}

const RETRY_SEAT_KINDS: ReadonlyMap<string, ThreadGenerationRoleKind> = new Map([
  ['AUTHOR', ThreadGenerationRoleKind.AUTHOR],
  ['JUDGE', ThreadGenerationRoleKind.JUDGE],
  ['CRITIC', ThreadGenerationRoleKind.CRITIC],
]);

/**
 * Every model a retry will call: the stored seats with the owner's `models` overrides applied the
 * way the generation service applies them (a new primary replaces the old one and drops fallbacks
 * on the same provider). A role id the job does not have is a 400, the same answer the generation
 * service gives, so the refusal arrives before any budget is held.
 */
export function collectRetryRoles(
  stored: readonly StoredGenerationRole[],
  overrides: ReadonlyArray<{ roleId: string; provider: string; model: string }>,
): PreflightRole[] {
  const seats = stored.filter((role) => RETRY_SEAT_KINDS.has(role.roleKind));
  if (overrides.some(({ roleId }) => !seats.some((seat) => seat.roleId === roleId))) {
    throw new BadRequestException('Unknown role in model changes');
  }
  let authorPosition = 0;
  return seats.flatMap((seat) => {
    const kind = RETRY_SEAT_KINDS.get(seat.roleKind) ?? ThreadGenerationRoleKind.AUTHOR;
    if (kind === ThreadGenerationRoleKind.AUTHOR) authorPosition += 1;
    const override = overrides.find(({ roleId }) => roleId === seat.roleId);
    const role: PreflightRoleRequest = {
      id: seat.roleId,
      provider: override?.provider ?? seat.provider,
      model: override?.model ?? seat.model,
      maxOutputTokens: 0,
      fallbacks: override
        ? seat.fallbacks.filter((fallback) => fallback.provider !== override.provider)
        : [...seat.fallbacks],
    };
    return toRoles(kind, kind === ThreadGenerationRoleKind.AUTHOR ? authorPosition : 1, role);
  });
}

/** Whole micro-USD from a decimal dollar amount, by string formatting only (no float arithmetic). */
export function usdToMicroUsd(usd: number): number {
  const [whole = '0', fraction = ''] = usd.toFixed(6).split('.');
  return Number(`${whole}${fraction}`);
}

/** The cap a retry will run with: the owner's new one, else the one the job already has. */
export function retrySpendCapMicroUsd(
  storedMicroUsd: string,
  newCapUsd: number | undefined,
): number {
  return newCapUsd === undefined ? Number(storedMicroUsd) : usdToMicroUsd(newCapUsd);
}

/** True for the generic 403 the budget step answers with when the plan or allowance refused. */
export function isNotInPlanDenial(error: unknown): boolean {
  if (!(error instanceof ForbiddenException)) return false;
  const body = error.getResponse();
  return (
    typeof body === 'object' &&
    'code' in body &&
    body.code === ThreadGenerationErrorCode.NOT_IN_PLAN
  );
}

/** The plan has Thread generation, yet the budget step refused: the allowance is the problem. */
export function allowanceUnavailableDenial(): ForbiddenException {
  return new ForbiddenException(
    codedErrorBody(
      'Your plan includes Thread generation, but its allowance is used up or is held by a generation that is still running. It frees up when that generation ends, and renews with your plan period.',
      ThreadGenerationErrorCode.ALLOWANCE_UNAVAILABLE,
      HttpStatus.FORBIDDEN,
    ),
  );
}

/** The plan lacks features a generation reserves; they are named in plain words. */
export function missingFeaturesDenial(
  planName: string,
  missing: readonly string[],
): ForbiddenException {
  return new ForbiddenException(
    codedErrorBody(
      `Your ${planName} plan does not include ${missing.join(', ')}, which Thread generation needs. Upgrade your plan or ask an administrator.`,
      ThreadGenerationErrorCode.NOT_IN_PLAN,
      HttpStatus.FORBIDDEN,
      { missingFeatures: missing.join(', ') },
    ),
  );
}
