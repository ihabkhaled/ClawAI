import { type Mock, vi } from 'vitest';
import { PAYG_ENABLED_SETTING_KEY } from '@claw/shared-constants';

import { type SystemSettingRepository } from '../../repositories/system-setting.repository';
import { SystemSettingService } from '../system-setting.service';

describe('SystemSettingService', () => {
  let repository: { findByKey: Mock; listAll: Mock; upsert: Mock };
  let service: SystemSettingService;

  beforeEach(() => {
    repository = {
      findByKey: vi.fn().mockResolvedValue(null),
      listAll: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
    };
    service = new SystemSettingService(repository as unknown as SystemSettingRepository);
  });

  describe('the PAYG kill switch', () => {
    // Defaults to OFF because both docker entrypoints swallow a seed failure —
    // a green log is not evidence the allowance seeders ran, and metering
    // against unseeded wallets would refuse every paid request on day one.
    it('is disabled when no row exists', async () => {
      await expect(service.isEnabled(PAYG_ENABLED_SETTING_KEY, false)).resolves.toBe(false);
    });

    it('is enabled only for the literal string "true"', async () => {
      repository.findByKey.mockResolvedValue({
        key: PAYG_ENABLED_SETTING_KEY,
        value: 'true',
        updatedAt: new Date(),
      });
      await expect(service.isEnabled(PAYG_ENABLED_SETTING_KEY, false)).resolves.toBe(true);
    });

    it.each(['false', 'TRUE?', '1', 'yes', ''])('treats %p as disabled', async (value) => {
      repository.findByKey.mockResolvedValue({
        key: PAYG_ENABLED_SETTING_KEY,
        value,
        updatedAt: new Date(),
      });
      await expect(service.isEnabled(PAYG_ENABLED_SETTING_KEY, false)).resolves.toBe(
        value === 'true',
      );
    });

    it('tolerates surrounding whitespace and case', async () => {
      repository.findByKey.mockResolvedValue({
        key: PAYG_ENABLED_SETTING_KEY,
        value: '  TRUE  ',
        updatedAt: new Date(),
      });
      await expect(service.isEnabled(PAYG_ENABLED_SETTING_KEY, false)).resolves.toBe(true);
    });
  });

  describe('caching', () => {
    it('reads the database once for repeated lookups inside the TTL', async () => {
      await service.isEnabled(PAYG_ENABLED_SETTING_KEY, false);
      await service.isEnabled(PAYG_ENABLED_SETTING_KEY, false);
      await service.isEnabled(PAYG_ENABLED_SETTING_KEY, false);
      expect(repository.findByKey).toHaveBeenCalledTimes(1);
    });

    it('busts the entry on a write so the admin who flipped it sees it at once', async () => {
      await service.isEnabled(PAYG_ENABLED_SETTING_KEY, false);
      repository.upsert.mockResolvedValue({
        key: PAYG_ENABLED_SETTING_KEY,
        value: 'true',
        updatedAt: new Date(),
      });
      await service.set(PAYG_ENABLED_SETTING_KEY, 'true');
      repository.findByKey.mockResolvedValue({
        key: PAYG_ENABLED_SETTING_KEY,
        value: 'true',
        updatedAt: new Date(),
      });
      await expect(service.isEnabled(PAYG_ENABLED_SETTING_KEY, false)).resolves.toBe(true);
      expect(repository.findByKey).toHaveBeenCalledTimes(2);
    });
  });

  // Anti-abuse 2026-11-27: a captcha secret is write-only on every admin read.
  describe('write-only secrets', () => {
    const secretRow = {
      key: 'security.turnstile.secretKey',
      value: 'cf-secret-value',
      updatedAt: new Date('2026-11-27T10:00:00.000Z'),
    };

    it('masks the secret in list, find and the reply to set', async () => {
      repository.listAll.mockResolvedValue([secretRow]);
      repository.findByKey.mockResolvedValue(secretRow);
      repository.upsert.mockResolvedValue(secretRow);

      const views = [
        ...(await service.list()),
        await service.find(secretRow.key),
        await service.set(secretRow.key, secretRow.value),
      ];

      for (const view of views) {
        expect(view).toMatchObject({ key: secretRow.key, value: '', configured: true });
      }
      expect(JSON.stringify(views)).not.toContain('cf-secret-value');
    });

    it('still hands the stored value to in-process readers', async () => {
      repository.findByKey.mockResolvedValue(secretRow);
      await expect(service.get(secretRow.key)).resolves.toBe('cf-secret-value');
    });

    it('reports a cleared secret as configured: false', async () => {
      repository.listAll.mockResolvedValue([{ ...secretRow, value: '' }]);
      await expect(service.list()).resolves.toEqual([
        {
          key: secretRow.key,
          value: '',
          configured: false,
          updatedAt: secretRow.updatedAt.toISOString(),
        },
      ]);
    });
  });

  describe('clearing a setting', () => {
    it('stores an empty value for a security.* key (unset: env or default applies)', async () => {
      repository.upsert.mockResolvedValue({
        key: 'security.email.allowedDomains',
        value: '',
        updatedAt: new Date(),
      });
      await expect(service.set('security.email.allowedDomains', '')).resolves.toMatchObject({
        value: '',
      });
      expect(repository.upsert).toHaveBeenCalledWith('security.email.allowedDomains', '');
    });

    it.each(['', '   '])('refuses the empty value %p for any other key', async (value) => {
      await expect(service.set(PAYG_ENABLED_SETTING_KEY, value)).rejects.toMatchObject({
        code: 'SYSTEM_SETTING_VALUE_REQUIRED',
        status: 400,
      });
      expect(repository.upsert).not.toHaveBeenCalled();
    });
  });
});
