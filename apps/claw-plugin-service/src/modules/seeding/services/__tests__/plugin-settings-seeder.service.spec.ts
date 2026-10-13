import { PluginSettingKey } from '../../../../common/enums/plugin-setting-key.enum';
import { PLUGIN_SETTING_DEFAULTS } from '../../constants/plugin-setting-defaults.constants';
import { PluginSettingsRepository } from '../../repositories/plugin-settings.repository';
import { PluginSettingsSeederService } from '../plugin-settings-seeder.service';

describe('PLUGIN_SETTING_DEFAULTS', () => {
  it('covers every setting key exactly once', () => {
    const keys = PLUGIN_SETTING_DEFAULTS.map((setting) => setting.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual(Object.values(PluginSettingKey).sort());
  });

  it('carries the design defaults', () => {
    const byKey = Object.fromEntries(PLUGIN_SETTING_DEFAULTS.map((s) => [s.key, s.value]));

    expect(byKey).toEqual({
      'userServers.enabled': true,
      'userServers.requireApproval': false,
      'userServers.allowHttp': false,
      'loop.maxRounds': 5,
      'loop.maxCallsPerTurn': 6,
      'call.timeoutMs': 30_000,
      'call.maxResultBytes': 262_144,
      'invocations.retentionDays': 90,
      'rate.perUserPerMinute': 20,
      'rate.perUserConcurrent': 3,
    });
  });
});

describe('PluginSettingsRepository', () => {
  it('inserts only missing keys so admin edits are never overwritten', async () => {
    const prisma = { pluginSetting: { createMany: vi.fn().mockResolvedValue({ count: 2 }) } };

    const inserted = await new PluginSettingsRepository(prisma as never).insertMissing(
      PLUGIN_SETTING_DEFAULTS,
    );

    expect(inserted).toBe(2);
    const args = prisma.pluginSetting.createMany.mock.calls[0]?.[0];
    expect(args.skipDuplicates).toBe(true);
    expect(args.data).toHaveLength(10);
    expect(args.data[0]).toEqual({ key: 'userServers.enabled', value: true });
  });
});

describe('PluginSettingsSeederService', () => {
  it('seeds the defaults and reports the number inserted', async () => {
    const settings = { insertMissing: vi.fn().mockResolvedValue(10) };

    await expect(new PluginSettingsSeederService(settings as never).seed()).resolves.toBe(10);
    expect(settings.insertMissing).toHaveBeenCalledWith(PLUGIN_SETTING_DEFAULTS);
  });

  it('is idempotent: a second run inserts nothing', async () => {
    const settings = { insertMissing: vi.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(0) };
    const service = new PluginSettingsSeederService(settings as never);

    await expect(service.seed()).resolves.toBe(10);
    await expect(service.seed()).resolves.toBe(0);
  });

  it('seeds on boot', async () => {
    const settings = { insertMissing: vi.fn().mockResolvedValue(0) };

    await new PluginSettingsSeederService(settings as never).onModuleInit();

    expect(settings.insertMissing).toHaveBeenCalledTimes(1);
  });

  it('does not crash the service when the database is unavailable at boot', async () => {
    const settings = { insertMissing: vi.fn().mockRejectedValue(new Error('connection refused')) };

    await expect(
      new PluginSettingsSeederService(settings as never).onModuleInit(),
    ).resolves.toBeUndefined();
  });
});
