import { type DynamicModule, Global, Module, type Provider } from '@nestjs/common';
import { EntitlementsAdapter } from './entitlements-adapter';
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
    return {
      module: EntitlementsModule,
      providers: [adapterProvider, PermissionGuard],
      exports: [ENTITLEMENTS_ADAPTER, PermissionGuard],
    };
  }
}
