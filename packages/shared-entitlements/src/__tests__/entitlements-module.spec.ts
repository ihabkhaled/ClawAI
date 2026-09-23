import { vi } from 'vitest';
import { type Provider } from '@nestjs/common';
import { EntitlementsAdapter } from '../entitlements-adapter';
import { EntitlementsModule } from '../entitlements.module';
import { ENTITLEMENTS_ADAPTER } from '../entitlements.tokens';

// Regression (QA 2026-09-23): forRoot took `interServiceToken` but handed the
// options object to an adapter that reads `serviceToken`, so the adapter every
// PermissionGuard uses sent no Authorization header. auth-service answered 401
// and every non-admin request to a @RequirePermissions route became a 503
// ("Permissions could not be checked right now") — files, audits, the model
// catalog. The adapter's own spec passed because it builds the adapter
// directly; this one builds it the way services do.
function adapterFrom(providers: Provider[] | undefined): EntitlementsAdapter {
  const provider = (providers ?? []).find(
    (candidate) =>
      typeof candidate === 'object' &&
      'provide' in candidate &&
      candidate.provide === ENTITLEMENTS_ADAPTER &&
      'useFactory' in candidate,
  );
  if (provider === undefined || !('useFactory' in provider)) {
    throw new Error('EntitlementsModule.forRoot registered no adapter factory');
  }
  const adapter: unknown = provider.useFactory();
  if (!(adapter instanceof EntitlementsAdapter)) {
    throw new Error('adapter factory did not build an EntitlementsAdapter');
  }
  return adapter;
}

describe('EntitlementsModule.forRoot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the guard adapter with the inter-service token', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ userId: 'u1', isAdmin: false, permissions: [] }), {
        status: 200,
      }),
    );
    const dynamicModule = EntitlementsModule.forRoot({
      authServiceUrl: 'http://auth:4001',
      interServiceToken: 's3cret-token',
    });

    await adapterFrom(dynamicModule.providers).getEntitlements('u1', { enforceTrial: false });

    const init = request.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get('Authorization')).toBe('Service s3cret-token');
  });
});
