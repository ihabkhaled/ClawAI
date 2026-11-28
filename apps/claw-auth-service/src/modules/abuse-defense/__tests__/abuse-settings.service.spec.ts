import { vi } from 'vitest';

import { type SystemSettingService } from '../../system-settings/services/system-setting.service';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import { AbuseSettingsService } from '../services/abuse-settings.service';

function build(stored: Record<string, string>): AbuseSettingsService {
  return new AbuseSettingsService({
    get: vi.fn(async (key: string) => Promise.resolve(stored[key] ?? null)),
  } as unknown as SystemSettingService);
}

describe('AbuseSettingsService', () => {
  it('reads the conservative defaults when nothing is stored', async () => {
    await expect(build({}).resolve()).resolves.toEqual({
      enabled: true,
      windowMinutes: 15,
      thresholds: {
        [AbuseSignalCode.RATE_LIMIT_TRIPPED]: 300,
        [AbuseSignalCode.FORBIDDEN_PROBE]: 200,
        [AbuseSignalCode.SSRF_REFUSED]: 10,
      },
      suspensionMinutes: [60, 1440, 10_080],
      escalationDays: 30,
    });
  });

  it('takes every value from the stored settings', async () => {
    const settings = await build({
      'security.abuse.autoSuspendEnabled': 'false',
      'security.abuse.windowMinutes': '30',
      'security.abuse.rateLimitTrips': '1000',
      'security.abuse.forbiddenProbes': '500',
      'security.abuse.ssrfRefusals': '25',
      'security.abuse.firstSuspensionMinutes': '120',
      'security.abuse.secondSuspensionMinutes': '2880',
      'security.abuse.thirdSuspensionMinutes': '20160',
      'security.abuse.escalationWindowDays': '90',
    }).resolve();
    expect(settings).toEqual({
      enabled: false,
      windowMinutes: 30,
      thresholds: {
        [AbuseSignalCode.RATE_LIMIT_TRIPPED]: 1000,
        [AbuseSignalCode.FORBIDDEN_PROBE]: 500,
        [AbuseSignalCode.SSRF_REFUSED]: 25,
      },
      suspensionMinutes: [120, 2880, 20_160],
      escalationDays: 90,
    });
  });

  it('a cleared (empty) kill switch reads as the default ON, never as OFF', async () => {
    await expect(
      build({ 'security.abuse.autoSuspendEnabled': '' }).resolve(),
    ).resolves.toMatchObject({ enabled: true });
    await expect(
      build({ 'security.abuse.autoSuspendEnabled': '  ' }).resolve(),
    ).resolves.toMatchObject({ enabled: true });
  });

  it('only the word true keeps it on; any other stored word switches it off', async () => {
    await expect(
      build({ 'security.abuse.autoSuspendEnabled': 'TRUE' }).resolve(),
    ).resolves.toMatchObject({ enabled: true });
    await expect(
      build({ 'security.abuse.autoSuspendEnabled': 'off' }).resolve(),
    ).resolves.toMatchObject({ enabled: false });
  });

  it.each([['abc'], ['0'], ['-5'], ['1.5'], ['9999999999'], ['']])(
    'a threshold of %j is out of bounds and reads as the default, never as zero',
    async (bad) => {
      const settings = await build({
        'security.abuse.rateLimitTrips': bad,
        'security.abuse.firstSuspensionMinutes': bad,
        'security.abuse.windowMinutes': bad,
      }).resolve();
      expect(settings.thresholds[AbuseSignalCode.RATE_LIMIT_TRIPPED]).toBe(300);
      expect(settings.suspensionMinutes[0]).toBe(60);
      expect(settings.windowMinutes).toBe(15);
    },
  );
});
