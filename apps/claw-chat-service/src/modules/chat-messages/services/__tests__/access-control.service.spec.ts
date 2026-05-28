import { AccessControlService } from '../access-control.service';

const getEntitlements = jest.fn();
const finalizeQuota = jest.fn();

jest.mock('@claw/shared-entitlements', () => {
  const actual = jest.requireActual('@claw/shared-entitlements');
  return {
    ...actual,
    EntitlementsAdapter: jest.fn().mockImplementation(() => ({
      getEntitlements: (...args: unknown[]) => getEntitlements(...args),
      finalizeQuota: (...args: unknown[]) => finalizeQuota(...args),
    })),
  };
});

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: jest.fn().mockReturnValue({ AUTH_SERVICE_URL: 'http://auth:4001' }) },
}));

const ent = (overrides: Record<string, unknown> = {}) => ({
  userId: 'u1',
  role: 'USER',
  isAdmin: false,
  permissions: ['CHAT_USE'],
  plan: { id: 'p1', slug: 'free', name: 'Free', featureGates: {} },
  allowedModels: [],
  allowedProviders: [],
  quota: { dailyLimit: 50000, used: 0, remaining: 50000, unlimited: false },
  ...overrides,
});

describe('AccessControlService', () => {
  let service: AccessControlService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AccessControlService();
  });

  it('allows when no model restriction and quota remaining', async () => {
    getEntitlements.mockResolvedValue(ent());
    await expect(service.assertCanSendMessage('u1', {})).resolves.toBeUndefined();
  });

  it('rejects a forbidden manual model (403)', async () => {
    getEntitlements.mockResolvedValue(
      ent({
        allowedModels: [
          {
            provider: 'OPENAI',
            model: 'gpt-4o',
            isAllowed: true,
            allowAsPrimary: true,
            allowAsFallback: true,
            allowAsJudge: false,
            allowInCompare: true,
            dailyTokenLimitOverride: null,
          },
        ],
      }),
    );
    await expect(
      service.assertCanSendMessage('u1', { provider: 'ANTHROPIC', model: 'claude-opus' }),
    ).rejects.toMatchObject({ code: 'MODEL_NOT_ALLOWED_FOR_PLAN' });
  });

  it('rejects when quota exhausted (429)', async () => {
    getEntitlements.mockResolvedValue(
      ent({ quota: { dailyLimit: 100, used: 100, remaining: 0, unlimited: false } }),
    );
    await expect(service.assertCanSendMessage('u1', {})).rejects.toMatchObject({
      code: 'quota.dailyLimitExceeded',
    });
  });

  it('ADMIN/unlimited bypasses quota and model checks', async () => {
    getEntitlements.mockResolvedValue(
      ent({ isAdmin: true, quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: true } }),
    );
    await expect(
      service.assertCanSendMessage('u1', { provider: 'ANTHROPIC', model: 'claude-opus' }),
    ).resolves.toBeUndefined();
  });

  it('fails OPEN when the entitlements service is unreachable', async () => {
    getEntitlements.mockRejectedValue(new Error('auth down'));
    await expect(service.assertCanSendMessage('u1', {})).resolves.toBeUndefined();
  });

  it('recordUsage swallows adapter errors (fail-soft)', async () => {
    finalizeQuota.mockRejectedValue(new Error('boom'));
    await expect(
      service.recordUsage({
        userId: 'u1',
        planId: 'p1',
        inputTokens: 10,
        outputTokens: 20,
        provider: 'OPENAI',
        model: 'gpt-4o',
      }),
    ).resolves.toBeUndefined();
  });
});
