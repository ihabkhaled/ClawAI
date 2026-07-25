import { BillingGateway } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import type { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { HealthService } from '../health.service';

function buildPrisma(queryImpl: () => Promise<unknown>): PrismaService {
  return { $queryRaw: jest.fn(queryImpl) } as unknown as PrismaService;
}

describe('HealthService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      PAYMENT_DATABASE_URL: 'postgresql://u:p@localhost:5453/claw_payments',
      REDIS_URL: 'redis://localhost:6379',
      RABBITMQ_URL: 'amqp://localhost:5672',
      JWT_SECRET: 's'.repeat(32),
      PAYMENT_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
    } as NodeJS.ProcessEnv;
    AppConfig.validate();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports ok when the database answers', async () => {
    const service = new HealthService(buildPrisma(async () => [{ '?column?': 1 }]));
    const report = await service.report();
    expect(report.status).toBe('ok');
    expect(report.database).toBe('ok');
    expect(report.service).toBe('payment-service');
  });

  it('reports degraded when the database is unreachable', async () => {
    // Liveness must not silently pass while the billing database is down —
    // the health aggregator is how an operator learns payments are impaired.
    const service = new HealthService(
      buildPrisma(() => Promise.reject(new Error('connection refused'))),
    );
    const report = await service.report();
    expect(report.status).toBe('degraded');
    expect(report.database).toBe('unavailable');
  });

  it('lists both gateways with their configuration state', async () => {
    const service = new HealthService(buildPrisma(async () => []));
    const report = await service.report();
    expect(report.gateways).toHaveLength(2);
    expect(report.gateways.map((g) => g.gateway)).toEqual([
      BillingGateway.PAYPAL,
      BillingGateway.PAYMOB,
    ]);
  });

  it('reports an unconfigured gateway as not configured', async () => {
    const service = new HealthService(buildPrisma(async () => []));
    const report = await service.report();
    for (const gateway of report.gateways) {
      expect(gateway.configured).toBe(false);
    }
  });

  it('reports a fully configured PayPal as configured', async () => {
    process.env['PAYPAL_CLIENT_ID'] = 'id';
    process.env['PAYPAL_CLIENT_SECRET'] = 'secret';
    process.env['PAYPAL_WEBHOOK_ID'] = 'wh';
    AppConfig.validate();
    const service = new HealthService(buildPrisma(async () => []));
    const report = await service.report();
    const paypal = report.gateways.find((g) => g.gateway === BillingGateway.PAYPAL);
    expect(paypal?.configured).toBe(true);
    expect(paypal?.mode).toBe('sandbox');
  });

  it('never leaks a credential through the health endpoint', async () => {
    process.env['PAYPAL_CLIENT_ID'] = 'super-secret-client-id';
    process.env['PAYPAL_CLIENT_SECRET'] = 'super-secret-value';
    process.env['PAYPAL_WEBHOOK_ID'] = 'wh';
    process.env['PAYMOB_HMAC_SECRET'] = 'hmac-secret-value';
    AppConfig.validate();
    const service = new HealthService(buildPrisma(async () => []));
    const serialized = JSON.stringify(await service.report());
    expect(serialized).not.toContain('super-secret-value');
    expect(serialized).not.toContain('super-secret-client-id');
    expect(serialized).not.toContain('hmac-secret-value');
  });
});
