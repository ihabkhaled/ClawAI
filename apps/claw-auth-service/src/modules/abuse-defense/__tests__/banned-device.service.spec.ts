import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';

import { type UserDeviceRepository } from '../../anti-abuse/repositories/user-device.repository';
import { BannedDeviceHashKind } from '../enums/banned-device-hash-kind.enum';
import { DeviceMarkReason } from '../enums/device-mark-reason.enum';
import { type BannedDeviceRepository } from '../repositories/banned-device.repository';
import { type AbuseAuditService } from '../services/abuse-audit.service';
import { BannedDeviceService } from '../services/banned-device.service';

const DEVICE = { fingerprintHash: 'f'.repeat(64), deviceIdHash: 'd'.repeat(64) };

describe('BannedDeviceService', () => {
  let markMany: Mock;
  let liftBySource: Mock;
  let countActiveFor: Mock;
  let findLinkingSignals: Mock;
  let audit: { deviceMarked: Mock; deviceMarksLifted: Mock };
  let service: BannedDeviceService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    markMany = vi.fn().mockResolvedValue(undefined);
    liftBySource = vi.fn().mockResolvedValue(3);
    countActiveFor = vi.fn().mockResolvedValue(0);
    findLinkingSignals = vi.fn().mockResolvedValue({
      fingerprintHashes: ['fp-1', 'fp-2'],
      deviceIdHashes: ['did-1'],
      registrationNetwork: null,
    });
    audit = { deviceMarked: vi.fn(), deviceMarksLifted: vi.fn() };
    service = new BannedDeviceService(
      { markMany, liftBySource, countActiveFor } as unknown as BannedDeviceRepository,
      { findLinkingSignals } as unknown as UserDeviceRepository,
      audit as unknown as AbuseAuditService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('marking the devices of a banned account', () => {
    it('marks every fingerprint hash and every device-id hash the account used', async () => {
      await expect(service.markForLifetimeBan('user-9')).resolves.toBe(3);
      expect(markMany).toHaveBeenCalledWith([
        {
          kind: BannedDeviceHashKind.FINGERPRINT,
          value: 'fp-1',
          sourceUserId: 'user-9',
          reason: DeviceMarkReason.ADMIN_LIFETIME_BAN,
        },
        {
          kind: BannedDeviceHashKind.FINGERPRINT,
          value: 'fp-2',
          sourceUserId: 'user-9',
          reason: DeviceMarkReason.ADMIN_LIFETIME_BAN,
        },
        {
          kind: BannedDeviceHashKind.DEVICE_ID,
          value: 'did-1',
          sourceUserId: 'user-9',
          reason: DeviceMarkReason.ADMIN_LIFETIME_BAN,
        },
      ]);
      expect(audit.deviceMarked).toHaveBeenCalledWith({
        sourceUserId: 'user-9',
        marks: 3,
        reason: DeviceMarkReason.ADMIN_LIFETIME_BAN,
      });
    });

    it('marks nothing for an account with no recorded device, and says so', async () => {
      findLinkingSignals.mockResolvedValue({
        fingerprintHashes: [],
        deviceIdHashes: [],
        registrationNetwork: null,
      });
      await expect(service.markForLifetimeBan('user-9')).resolves.toBe(0);
    });

    it('marks nothing for an account that does not exist', async () => {
      findLinkingSignals.mockResolvedValue(null);
      await expect(service.markForLifetimeBan('ghost')).resolves.toBe(0);
      expect(markMany).not.toHaveBeenCalled();
    });

    it('never turns the ban into an error when the marks cannot be written', async () => {
      markMany.mockRejectedValue(new Error('database down'));
      await expect(service.markForLifetimeBan('user-9')).resolves.toBe(0);
    });
  });

  describe('asking whether a device is marked', () => {
    it('is true when an active mark exists on either hash', async () => {
      countActiveFor.mockResolvedValue(1);
      await expect(service.isMarked(DEVICE)).resolves.toBe(true);
      expect(countActiveFor).toHaveBeenCalledWith(DEVICE, undefined);
    });

    it('is false on a clean device', async () => {
      await expect(service.isMarked(DEVICE)).resolves.toBe(false);
    });

    it('ignores the marks the signing-in account itself caused', async () => {
      await service.isMarked(DEVICE, 'user-9');
      expect(countActiveFor).toHaveBeenCalledWith(DEVICE, 'user-9');
    });

    it('cannot match a request that sent no device, so it is not marked', async () => {
      await expect(service.isMarked(null)).resolves.toBe(false);
      expect(countActiveFor).not.toHaveBeenCalled();
    });
  });

  describe('lifting the marks of an unbanned account', () => {
    it('lifts by source account and audits the count', async () => {
      const now = new Date('2026-11-28T10:00:00.000Z');
      await expect(service.liftForUser('user-9', now)).resolves.toBe(3);
      expect(liftBySource).toHaveBeenCalledWith('user-9', now);
      expect(audit.deviceMarksLifted).toHaveBeenCalledWith({ sourceUserId: 'user-9', lifted: 3 });
    });

    it('audits nothing when no mark was active', async () => {
      liftBySource.mockResolvedValue(0);
      await service.liftForUser('user-9');
      expect(audit.deviceMarksLifted).not.toHaveBeenCalled();
    });

    it('never throws into the unban', async () => {
      liftBySource.mockRejectedValue(new Error('database down'));
      await expect(service.liftForUser('user-9')).resolves.toBe(0);
    });
  });
});
