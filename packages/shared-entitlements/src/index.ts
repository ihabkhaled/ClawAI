export {
  EntitlementsAdapter,
  EntitlementsRequestError,
  type EntitlementsAdapterOptions,
  type QuotaReserveResult,
  type QuotaFinalizeInput,
  type FeatureUsageInput,
  type ResearchUsageFeature,
} from './entitlements-adapter';
export { describeEntitlementsFailure } from './describe-failure';
export {
  allowedModelKeys,
  hasPermission,
  hasPlanFeature,
  isModelAllowedForUsage,
  resolvePlanLimit,
} from './helpers';
export {
  ModelUsageType,
  type AllowedModel,
  type PlanFeature,
  type PlanFeatureGates,
  type UserEntitlements,
} from './types';
export { PermissionGuard } from './permission.guard';
export { RequirePermissions } from './require-permissions.decorator';
export { EntitlementsModule, type EntitlementsModuleOptions } from './entitlements.module';
export { ENTITLEMENTS_ADAPTER, REQUIRE_PERMISSIONS_KEY } from './entitlements.tokens';
export {
  ModelAuthorizationDenial,
  authorizeModel,
  type ModelAuthorizationFacts,
  type ModelAuthorizationResult,
} from './model-authorization';
export { PaygMeter } from './payg-meter';
export {
  PaygCreditExhaustedError,
  isPaygCreditExhaustedError,
} from './payg-credit-exhausted.error';
export type {
  PaygFinalizeCalls,
  PaygFinalizeUsage,
  PaygHold,
  PaygMeterOptions,
  PaygReleaseReason,
  PaygReserveInput,
  PaygUnmeteredReason,
} from './payg-meter.types';
