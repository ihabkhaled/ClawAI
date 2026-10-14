import { RuntimeSettingsManager } from '../runtime-settings.manager';

const manager = (rows: Array<{ key: string; value: unknown }>) =>
  new RuntimeSettingsManager({ findByKeys: vi.fn().mockResolvedValue(rows) } as never);

describe('RuntimeSettingsManager', () => {
  it('reads the seeded defaults when no row exists', async () => {
    expect(await manager([]).load()).toEqual({
      userServersEnabled: true,
      requireApproval: false,
      callTimeoutMs: 30_000,
      maxResultBytes: 262_144,
      ratePerMinute: 20,
      concurrentPerUser: 3,
    });
  });

  it('reads the values an admin set', async () => {
    const settings = await manager([
      { key: 'userServers.enabled', value: false },
      { key: 'userServers.requireApproval', value: true },
      { key: 'call.timeoutMs', value: 10_000 },
      { key: 'call.maxResultBytes', value: 4096 },
      { key: 'rate.perUserPerMinute', value: 5 },
      { key: 'rate.perUserConcurrent', value: 1 },
    ]).load();

    expect(settings).toEqual({
      userServersEnabled: false,
      requireApproval: true,
      callTimeoutMs: 10_000,
      maxResultBytes: 4096,
      ratePerMinute: 5,
      concurrentPerUser: 1,
    });
  });

  it.each([
    [
      'a number out of range',
      { key: 'call.timeoutMs', value: 99_999_999 },
      'callTimeoutMs',
      30_000,
    ],
    ['a number below the range', { key: 'rate.perUserPerMinute', value: 0 }, 'ratePerMinute', 20],
    [
      'a string where a number belongs',
      { key: 'call.maxResultBytes', value: '999999999' },
      'maxResultBytes',
      262_144,
    ],
    ['a fraction', { key: 'rate.perUserConcurrent', value: 2.5 }, 'concurrentPerUser', 3],
    ['null', { key: 'call.timeoutMs', value: null }, 'callTimeoutMs', 30_000],
  ])(
    'falls back to the default for %s, so a bad edit never widens a limit',
    async (_name, row, field, expected) => {
      const settings = await manager([row]).load();

      expect(settings[field as keyof typeof settings]).toBe(expected);
    },
  );

  it('falls back for a boolean setting holding a number', async () => {
    const settings = await manager([{ key: 'userServers.enabled', value: 0 }]).load();

    expect(settings.userServersEnabled).toBe(true);
  });
});

describe('RuntimeSettingsManager.loadLoopLimits', () => {
  it('reads the seeded loop caps when no row exists', async () => {
    expect(await manager([]).loadLoopLimits()).toEqual({ maxRounds: 5, maxCallsPerTurn: 6 });
  });

  it('reads what an admin set and ignores an out-of-range value', async () => {
    expect(
      await manager([
        { key: 'loop.maxRounds', value: 3 },
        { key: 'loop.maxCallsPerTurn', value: 9999 },
      ]).loadLoopLimits(),
    ).toEqual({ maxRounds: 3, maxCallsPerTurn: 6 });
  });
});
