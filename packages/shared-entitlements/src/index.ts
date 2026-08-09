export {
  EntitlementsAdapter,
  EntitlementsRequestError,
  type EntitlementsAdapterOptions,
  type QuotaReserveResult,
  type QuotaFinalizeInput,
  type FeatureUsageInput,
  type ResearchUsageFeature,
} from './entitlements-adapter';
export { hasPermission, hasPlanFeature, isModelAllowedForUsage, allowedModelKeys } from './helpers';
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
