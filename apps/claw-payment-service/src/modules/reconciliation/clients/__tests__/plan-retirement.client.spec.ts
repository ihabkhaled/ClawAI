import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { PlanRetirementMigrationStatus } from '../../enums/plan-retirement-migration-status.enum';
import { PlanRetirementClient } from '../plan-retirement.client';

jest.mock('@claw/shared-utilities', () => ({ httpRequest: jest.fn() }));
jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => ({
      AUTH_SERVICE_URL: 'http://auth-service:4001',
      INTER_SERVICE_AUTH_TOKEN: 'service-token',
    }),
  },
}));

const request = httpRequest as jest.MockedFunction<typeof httpRequest>;
const MIGRATION = {
  id: 'migration-1',
  userId: 'user-1',
  sourcePlanId: 'plan-old',
  replacementPlanId: 'plan-new',
  replacementPlanSlug: 'new',
  sourceSubscriptionId: 'subscription-1',
};

describe('PlanRetirementClient', () => {
  const client = new PlanRetirementClient();

  beforeEach(() => jest.clearAllMocks());

  it('polls a bounded internal endpoint with service authentication', async () => {
    request.mockResolvedValueOnce({ ok: true, status: 200, data: [MIGRATION] });
    await expect(client.listPending()).resolves.toEqual([MIGRATION]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('retirement-migrations/pending?limit=50'),
        method: HttpMethod.GET,
        headers: { Authorization: 'Service service-token' },
        timeoutMs: 5000,
      }),
    );
  });

  it('fails closed when auth returns a malformed response', async () => {
    request.mockResolvedValueOnce({ ok: true, status: 200, data: [{ id: '' }] });
    await expect(client.listPending()).rejects.toThrow('PLAN_RETIREMENT_CONTRACT_INVALID');
  });

  it('reports the exact pending-only outcome body', async () => {
    request.mockResolvedValueOnce({ ok: true, status: 200, data: { applied: true } });
    await expect(
      client.recordOutcome(
        'migration-1',
        PlanRetirementMigrationStatus.FAILED,
        'PLAN_RETIREMENT_SCHEDULE_FAILED',
      ),
    ).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: HttpMethod.POST,
        body: {
          status: PlanRetirementMigrationStatus.FAILED,
          errorCode: 'PLAN_RETIREMENT_SCHEDULE_FAILED',
        },
      }),
    );
  });
});
