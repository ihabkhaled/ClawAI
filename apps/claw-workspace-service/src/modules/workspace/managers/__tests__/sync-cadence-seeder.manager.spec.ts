import { SyncCadenceSeederManager } from '../sync-cadence-seeder.manager';
import { PROVIDER_DEFINITION_SEEDS } from '../../constants/provider-registry.constants';
import {
  FALLBACK_BACKFILL_WINDOW_DAYS,
  FALLBACK_CADENCE_SECONDS,
  SYNC_CADENCE_SEED_DEFAULT_PRIORITY,
} from '../../constants/sync-cadence.constants';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import type { SyncCadenceRepository } from '../../repositories/sync-cadence.repository';

describe('SyncCadenceSeederManager', () => {
  it('upserts a default row for every registered provider', async () => {
    const repo = { upsertDefault: jest.fn().mockResolvedValue(undefined) };
    const manager = new SyncCadenceSeederManager(repo as unknown as SyncCadenceRepository);

    await manager.onApplicationBootstrap();

    expect(repo.upsertDefault).toHaveBeenCalledTimes(PROVIDER_DEFINITION_SEEDS.length);
  });

  it('seeds each provider using its own fallback cadence and drift-tested capabilities', async () => {
    const repo = { upsertDefault: jest.fn().mockResolvedValue(undefined) };
    const manager = new SyncCadenceSeederManager(repo as unknown as SyncCadenceRepository);

    await manager.onApplicationBootstrap();

    const githubSeed = PROVIDER_DEFINITION_SEEDS.find(
      (s) => s.provider === WorkspaceProvider.GITHUB,
    );
    expect(githubSeed).toBeDefined();
    expect(repo.upsertDefault).toHaveBeenCalledWith({
      provider: WorkspaceProvider.GITHUB,
      intervalSeconds: FALLBACK_CADENCE_SECONDS[WorkspaceProvider.GITHUB],
      backfillWindowDays: FALLBACK_BACKFILL_WINDOW_DAYS,
      priority: SYNC_CADENCE_SEED_DEFAULT_PRIORITY,
      supportsDeltaSync: githubSeed?.capabilities['deltaSync'] === true,
      supportsWebhookSync: githubSeed?.capabilities['webhooks'] === true,
      nativeCursorKind: null,
    });
  });

  // Regression guard for the exact drift this session repeatedly found and
  // fixed elsewhere (OneDrive's getCapabilities() lying about
  // supportsDeltaSync) — capability flags here must come from the same
  // drift-tested PROVIDER_DEFINITION_SEEDS source, never a separately
  // hand-maintained value that could silently diverge from it.
  it('never hardcodes true for a provider PROVIDER_DEFINITION_SEEDS marks false', async () => {
    const repo = { upsertDefault: jest.fn().mockResolvedValue(undefined) };
    const manager = new SyncCadenceSeederManager(repo as unknown as SyncCadenceRepository);

    await manager.onApplicationBootstrap();

    for (const seed of PROVIDER_DEFINITION_SEEDS) {
      const call = repo.upsertDefault.mock.calls.find(([arg]) => arg.provider === seed.provider);
      expect(call?.[0].supportsDeltaSync).toBe(seed.capabilities['deltaSync'] === true);
      expect(call?.[0].supportsWebhookSync).toBe(seed.capabilities['webhooks'] === true);
    }
  });
});
