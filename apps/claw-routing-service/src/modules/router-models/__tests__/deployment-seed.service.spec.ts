import { SeedApplyOutcome } from '../../../common/enums';
import { PrivacyClass } from '../../../generated/prisma';
import { type DeploymentSeedRepository } from '../repositories/deployment-seed.repository';
import { DeploymentSeedService } from '../services/deployment-seed.service';
import type { DeploymentSeedSourceRow, SeedApplyInput } from '../types/deployment-seed.types';

const row = (overrides: Partial<DeploymentSeedSourceRow> = {}): DeploymentSeedSourceRow => ({
  id: 'def_1',
  provider: 'GEMINI',
  modelKey: 'gemini-2.5-flash',
  connectorId: 'conn_1',
  runtimeId: null,
  isLocal: false,
  privacySupport: PrivacyClass.CLOUD_PERMITTED,
  contextWindowTokens: null,
  maxOutputTokens: null,
  supportsTools: null,
  supportsStructuredOutput: null,
  supportsStreaming: null,
  supportsVision: null,
  ...overrides,
});

const buildService = (
  definitions: DeploymentSeedSourceRow[],
): {
  service: DeploymentSeedService;
  findDefinitionsForBackfill: jest.Mock;
  applyOnce: jest.Mock;
} => {
  const findDefinitionsForBackfill = jest.fn().mockResolvedValue(definitions);
  const applyOnce = jest.fn().mockResolvedValue(SeedApplyOutcome.APPLIED);
  const repository = { findDefinitionsForBackfill, applyOnce };

  return {
    service: new DeploymentSeedService(repository as unknown as DeploymentSeedRepository),
    findDefinitionsForBackfill,
    applyOnce,
  };
};

describe('DeploymentSeedService.backfill', () => {
  it('does nothing when the registry is empty', async () => {
    const { service, applyOnce } = buildService([]);

    await expect(service.backfill()).resolves.toBe(SeedApplyOutcome.NOTHING_TO_SEED);
    expect(applyOnce).not.toHaveBeenCalled();
  });

  it('does nothing when no definition is derivable', async () => {
    const { service, applyOnce } = buildService([row({ provider: 'MYSTERY_VENDOR' })]);

    await expect(service.backfill()).resolves.toBe(SeedApplyOutcome.NOTHING_TO_SEED);
    expect(applyOnce).not.toHaveBeenCalled();
  });

  it('applies the derived deployments under the versioned seed identity', async () => {
    const { service, applyOnce } = buildService([row()]);

    await expect(service.backfill()).resolves.toBe(SeedApplyOutcome.APPLIED);

    const call = applyOnce.mock.calls[0]?.[0] as SeedApplyInput;
    expect(call.name).toBe('router-model-deployments-backfill');
    expect(call.version).toBe(1);
    expect(call.deployments).toHaveLength(1);
  });

  // Registry order is not guaranteed across queries. A checksum that moved with
  // row order would report a spurious mismatch on every boot.
  it('produces the same checksum regardless of definition order', async () => {
    const first = buildService([
      row({ id: 'a', modelKey: 'gemini-2.5-flash' }),
      row({ id: 'b', modelKey: 'gpt-4o-mini', provider: 'OPENAI' }),
    ]);
    const second = buildService([
      row({ id: 'b', modelKey: 'gpt-4o-mini', provider: 'OPENAI' }),
      row({ id: 'a', modelKey: 'gemini-2.5-flash' }),
    ]);

    await first.service.backfill();
    await second.service.backfill();

    const checksumA = (first.applyOnce.mock.calls[0]?.[0] as SeedApplyInput).checksum;
    const checksumB = (second.applyOnce.mock.calls[0]?.[0] as SeedApplyInput).checksum;
    expect(checksumA).toBe(checksumB);
  });

  it('changes the checksum when the derived endpoint set changes', async () => {
    const one = buildService([row()]);
    const two = buildService([row(), row({ id: 'def_2', provider: 'OPENAI', modelKey: 'gpt-4o' })]);

    await one.service.backfill();
    await two.service.backfill();

    const checksumA = (one.applyOnce.mock.calls[0]?.[0] as SeedApplyInput).checksum;
    const checksumB = (two.applyOnce.mock.calls[0]?.[0] as SeedApplyInput).checksum;
    expect(checksumA).not.toBe(checksumB);
  });

  it('still applies the derivable definitions when some are skipped', async () => {
    const { service, applyOnce } = buildService([
      row({ id: 'ok' }),
      row({ id: 'bad', provider: 'MYSTERY_VENDOR' }),
    ]);

    await expect(service.backfill()).resolves.toBe(SeedApplyOutcome.APPLIED);
    expect((applyOnce.mock.calls[0]?.[0] as SeedApplyInput).deployments).toHaveLength(1);
  });

  // A changed registry is normal growth, not a failure. It must not throw and
  // wedge module init the way payment-service's fatal mismatch would.
  it('surfaces a checksum mismatch without throwing', async () => {
    const { service, applyOnce } = buildService([row()]);
    applyOnce.mockResolvedValue(SeedApplyOutcome.CHECKSUM_MISMATCH);

    await expect(service.backfill()).resolves.toBe(SeedApplyOutcome.CHECKSUM_MISMATCH);
  });

  it('runs the backfill on module init', async () => {
    const { service, findDefinitionsForBackfill } = buildService([row()]);

    await service.onModuleInit();

    expect(findDefinitionsForBackfill).toHaveBeenCalledTimes(1);
  });
});
