import { type DynamicModule, Global, Module, type Provider } from '@nestjs/common';
import { EntitlementsAdapter } from './entitlements-adapter';
import { PaygMeter } from './payg-meter';
import { ENTITLEMENTS_ADAPTER } from './entitlements.tokens';
import { PermissionGuard } from './permission.guard';

export type EntitlementsModuleOptions = {
  authServiceUrl: string;
  timeoutMs?: number;
};

// Global module that provides a singleton EntitlementsAdapter (pointed at the
// auth-service) and the PermissionGuard. Import once per service via
// `EntitlementsModule.forRoot({ authServiceUrl })`, then either register
// PermissionGuard as an APP_GUARD or apply it with @UseGuards on admin
// controllers. @RequirePermissions(...) declares what each route needs.
@Global()
@Module({})
export class EntitlementsModule {
  static forRoot(options: EntitlementsModuleOptions): DynamicModule {
    const adapterProvider: Provider = {
      provide: ENTITLEMENTS_ADAPTER,
      useFactory: (): EntitlementsAdapter => new EntitlementsAdapter(options),
    };
    // Provided by CLASS token, not a symbol: every consumer injects it as
    // `private readonly payg: PaygMeter`, and an @Optional() injection against a
    // symbol token would silently resolve to undefined and skip metering
    // everywhere without a single error.
    const paygProvider: Provider = {
      provide: PaygMeter,
      useFactory: (): PaygMeter => new PaygMeter(options),
    };
    return {
      module: EntitlementsModule,
      providers: [adapterProvider, paygProvider, PermissionGuard],
      exports: [ENTITLEMENTS_ADAPTER, PaygMeter, PermissionGuard],
    };
  }
}
