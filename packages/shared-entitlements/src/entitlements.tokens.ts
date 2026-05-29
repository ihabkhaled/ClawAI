// DI token for the EntitlementsAdapter instance provided by EntitlementsModule.
// Kept in its own file so the guard and the module can both import it without a
// circular dependency.
export const ENTITLEMENTS_ADAPTER = Symbol('CLAW_ENTITLEMENTS_ADAPTER');

// Reflector metadata key carrying the Permission[] required by an endpoint.
export const REQUIRE_PERMISSIONS_KEY = 'claw:require-permissions';
