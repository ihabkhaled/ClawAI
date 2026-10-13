import 'reflect-metadata';
import { PermissionGuard } from '@claw/shared-entitlements';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Plugin AppModule', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('wires the catalog, installs, admin, account deletion, the seeders, health and the permission guard', async () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('PLUGIN_DATABASE_URL', 'postgresql://localhost:5432/claw_plugin');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'x'.repeat(32));
    vi.stubEnv('PLUGIN_ENCRYPTION_KEY', 'd4'.repeat(32));

    const { AppModule } = await import('../app.module');
    const { CatalogModule } = await import('../../modules/catalog/catalog.module');
    const { InstallsModule } = await import('../../modules/installs/installs.module');
    const { AdminModule } = await import('../../modules/admin/admin.module');
    const { AccountDeletionModule } =
      await import('../../modules/account-deletion/account-deletion.module');
    const { SeedingModule } = await import('../../modules/seeding/seeding.module');
    const { HealthModule } = await import('../../modules/health/health.module');
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];
    const providers = Reflect.getMetadata('providers', AppModule) as Array<{
      useExisting?: unknown;
    }>;

    expect(imports).toEqual(
      expect.arrayContaining([
        CatalogModule,
        InstallsModule,
        AdminModule,
        AccountDeletionModule,
        SeedingModule,
        HealthModule,
      ]),
    );
    expect(providers.some((provider) => provider.useExisting === PermissionGuard)).toBe(true);
  });

  it('refuses to boot with the all-zero placeholder key', async () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('PLUGIN_DATABASE_URL', 'postgresql://localhost:5432/claw_plugin');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'x'.repeat(32));
    vi.stubEnv('PLUGIN_ENCRYPTION_KEY', '0'.repeat(64));
    vi.resetModules();

    await expect(import('../app.module')).rejects.toThrow('PLUGIN_ENCRYPTION_KEY');
  });
});
