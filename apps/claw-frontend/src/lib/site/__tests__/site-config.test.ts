import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('site-config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('is not production-canonical and falls back to a dev origin when SITE_URL is unset', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    delete process.env['SITE_URL'];
    delete process.env['VERCEL_ENV'];
    const { getSiteUrl, isProductionCanonical, shouldNoIndexEverything } =
      await import('../site-config');

    expect(isProductionCanonical()).toBe(false);
    expect(shouldNoIndexEverything()).toBe(true);
    expect(getSiteUrl()).toBe('http://localhost:3000');
    vi.unstubAllEnvs();
  });

  it('rejects localhost as a production SITE_URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env['SITE_URL'] = 'http://localhost:3000';
    delete process.env['VERCEL_ENV'];
    const { isProductionCanonical, shouldNoIndexEverything } = await import('../site-config');

    expect(isProductionCanonical()).toBe(false);
    expect(shouldNoIndexEverything()).toBe(true);
    vi.unstubAllEnvs();
  });

  it('rejects a Vercel preview-shaped domain as production canonical', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env['SITE_URL'] = 'https://my-app-git-branch.vercel.app';
    delete process.env['VERCEL_ENV'];
    const { isProductionCanonical } = await import('../site-config');

    expect(isProductionCanonical()).toBe(false);
    vi.unstubAllEnvs();
  });

  it('rejects a SITE_URL with a path, query, or fragment', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env['SITE_URL'] = 'https://claw.example/some/path';
    delete process.env['VERCEL_ENV'];
    const { isProductionCanonical } = await import('../site-config');

    expect(isProductionCanonical()).toBe(false);
    vi.unstubAllEnvs();
  });

  it('accepts a valid bare https production origin', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env['SITE_URL'] = 'https://claw.example';
    delete process.env['VERCEL_ENV'];
    const { getSiteUrl, isProductionCanonical, shouldNoIndexEverything } =
      await import('../site-config');

    expect(isProductionCanonical()).toBe(true);
    expect(shouldNoIndexEverything()).toBe(false);
    expect(getSiteUrl()).toBe('https://claw.example');
    vi.unstubAllEnvs();
  });

  it('is crawlable with a valid SITE_URL even outside NODE_ENV=production (self-hosted)', async () => {
    // The self-hosted dev/prod container scenario: NODE_ENV is not literally
    // "production" but the operator has set a real canonical https origin.
    vi.stubEnv('NODE_ENV', 'development');
    process.env['SITE_URL'] = 'https://claw.local';
    delete process.env['VERCEL_ENV'];
    const { isProductionCanonical, shouldNoIndexEverything } = await import('../site-config');

    expect(isProductionCanonical()).toBe(true);
    expect(shouldNoIndexEverything()).toBe(false);
    vi.unstubAllEnvs();
  });

  it('treats a non-production Vercel preview environment as non-canonical even with a valid SITE_URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env['SITE_URL'] = 'https://claw.example';
    process.env['VERCEL_ENV'] = 'preview';
    const { isProductionCanonical, shouldNoIndexEverything } = await import('../site-config');

    expect(isProductionCanonical()).toBe(false);
    expect(shouldNoIndexEverything()).toBe(true);
    vi.unstubAllEnvs();
  });
});
