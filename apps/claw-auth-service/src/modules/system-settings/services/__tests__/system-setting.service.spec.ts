import { PAYG_ENABLED_SETTING_KEY } from '@claw/shared-constants';

import { type SystemSettingRepository } from '../../repositories/system-setting.repository';
import { SystemSettingService } from '../system-setting.service';

describe('SystemSettingService', () => {
  let repository: { findByKey: jest.Mock; listAll: jest.Mock; upsert: jest.Mock };
  let service: SystemSettingService;

  beforeEach(() => {
    repository = {
      findByKey: jest.fn().mockResolvedValue(null),
      listAll: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
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
});
