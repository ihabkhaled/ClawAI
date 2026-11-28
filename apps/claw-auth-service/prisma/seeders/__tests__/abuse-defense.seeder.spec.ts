import { vi } from 'vitest';

import {
  ABUSE_SETTING_AUTO_SUSPEND_ENABLED,
  ABUSE_SETTING_ESCALATION_DAYS,
  ABUSE_SETTING_FIRST_SUSPENSION_MINUTES,
  ABUSE_SETTING_FORBIDDEN_PROBES,
  ABUSE_SETTING_RATE_LIMIT_TRIPS,
  ABUSE_SETTING_SECOND_SUSPENSION_MINUTES,
  ABUSE_SETTING_SSRF_REFUSALS,
  ABUSE_SETTING_THIRD_SUSPENSION_MINUTES,
  ABUSE_SETTING_WINDOW_MINUTES,
  DEFAULT_AUTO_SUSPEND_ENABLED,
  DEFAULT_ESCALATION_DAYS,
  DEFAULT_FIRST_SUSPENSION_MINUTES,
  DEFAULT_FORBIDDEN_PROBES,
  DEFAULT_RATE_LIMIT_TRIPS,
  DEFAULT_SECOND_SUSPENSION_MINUTES,
  DEFAULT_SSRF_REFUSALS,
  DEFAULT_THIRD_SUSPENSION_MINUTES,
  DEFAULT_WINDOW_MINUTES,
} from '../../../src/modules/abuse-defense/constants/abuse-defense.constants';

const seeder = require('../abuse-defense.seeder.cjs');

describe('abuse-defense seeder', () => {
  it('seeds exactly the numbers the code reads as its defaults (a drift here silently changes behaviour)', () => {
    expect(seeder.SETTING_DEFAULTS).toEqual({
      [ABUSE_SETTING_AUTO_SUSPEND_ENABLED]: String(DEFAULT_AUTO_SUSPEND_ENABLED),
      [ABUSE_SETTING_WINDOW_MINUTES]: String(DEFAULT_WINDOW_MINUTES),
      [ABUSE_SETTING_RATE_LIMIT_TRIPS]: String(DEFAULT_RATE_LIMIT_TRIPS),
      [ABUSE_SETTING_FORBIDDEN_PROBES]: String(DEFAULT_FORBIDDEN_PROBES),
      [ABUSE_SETTING_SSRF_REFUSALS]: String(DEFAULT_SSRF_REFUSALS),
      [ABUSE_SETTING_FIRST_SUSPENSION_MINUTES]: String(DEFAULT_FIRST_SUSPENSION_MINUTES),
      [ABUSE_SETTING_SECOND_SUSPENSION_MINUTES]: String(DEFAULT_SECOND_SUSPENSION_MINUTES),
      [ABUSE_SETTING_THIRD_SUSPENSION_MINUTES]: String(DEFAULT_THIRD_SUSPENSION_MINUTES),
      [ABUSE_SETTING_ESCALATION_DAYS]: String(DEFAULT_ESCALATION_DAYS),
    });
  });

  it('creates only rows that are missing, so an edited value survives every restart', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 9 });
    const executeRawUnsafe = vi.fn().mockResolvedValue(0);
    const result = await seeder.run({
      systemSetting: { createMany },
      $executeRawUnsafe: executeRawUnsafe,
    });
    expect(createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([{ key: 'security.abuse.autoSuspendEnabled', value: 'true' }]),
      skipDuplicates: true,
    });
    expect(createMany.mock.calls[0]?.[0].data).toHaveLength(9);
    expect(result).toEqual({ settings: 9, fingerprintMarks: 0, deviceIdMarks: 0 });
  });

  it('backfills device marks for accounts banned for life only, idempotently', async () => {
    const executeRawUnsafe = vi.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    const result = await seeder.run({
      systemSetting: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
      $executeRawUnsafe: executeRawUnsafe,
    });
    expect(result).toEqual({ settings: 0, fingerprintMarks: 4, deviceIdMarks: 2 });
    for (const [sql] of executeRawUnsafe.mock.calls as Array<[string]>) {
      expect(sql).toContain('"banned_at" IS NOT NULL AND u."banned_until" IS NULL');
      expect(sql).toContain('ON CONFLICT ("hash_kind", "hash_value", "source_user_id") DO NOTHING');
      expect(sql).toContain("'BACKFILL_LIFETIME_BAN'");
    }
    expect(executeRawUnsafe.mock.calls[0]?.[0]).toContain("'FINGERPRINT'");
    expect(executeRawUnsafe.mock.calls[1]?.[0]).toContain("'DEVICE_ID'");
  });

  it('is versioned and carries a payload for the run-once checksum', () => {
    expect(seeder.name).toBe('abuse-defense');
    expect(seeder.version).toBe(1);
    expect(seeder.payload.settings).toEqual(seeder.SETTING_DEFAULTS);
  });
});
