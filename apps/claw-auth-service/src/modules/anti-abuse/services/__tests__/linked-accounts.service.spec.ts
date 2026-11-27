import { type Mock, vi } from 'vitest';

import { EntityNotFoundException } from '../../../../common/errors';
import { LinkedAccountReason } from '../../enums/linked-account-reason.enum';
import { type UserDeviceRepository } from '../../repositories/user-device.repository';
import { LinkedAccountsService } from '../linked-accounts.service';

const CREATED = new Date('2026-11-27T09:00:00.000Z');
const BANNED = new Date('2026-11-27T09:30:00.000Z');

describe('LinkedAccountsService', () => {
  let repo: {
    findLinkingSignals: Mock;
    findUserIdsByFingerprints: Mock;
    findUserIdsByDeviceIds: Mock;
    findUserIdsByNetwork: Mock;
    findUsersByIds: Mock;
  };
  let service: LinkedAccountsService;

  beforeEach(() => {
    repo = {
      findLinkingSignals: vi.fn().mockResolvedValue({
        fingerprintHashes: ['fp-1'],
        deviceIdHashes: ['did-1'],
        registrationNetwork: '203.0.113.0/24',
      }),
      findUserIdsByFingerprints: vi.fn().mockResolvedValue(['a', 'b']),
      findUserIdsByDeviceIds: vi.fn().mockResolvedValue(['a']),
      findUserIdsByNetwork: vi.fn().mockResolvedValue(['a', 'c']),
      findUsersByIds: vi.fn().mockResolvedValue([
        { id: 'a', email: 'a@x.com', status: 'ACTIVE', bannedAt: null, createdAt: CREATED },
        { id: 'b', email: 'b@x.com', status: 'PENDING', bannedAt: BANNED, createdAt: CREATED },
        { id: 'c', email: 'c@x.com', status: 'ACTIVE', bannedAt: null, createdAt: CREATED },
      ]),
    };
    service = new LinkedAccountsService(repo as unknown as UserDeviceRepository);
  });

  it('merges every reason per account and excludes the inspected one', async () => {
    const view = await service.list('target');
    expect(repo.findUserIdsByFingerprints).toHaveBeenCalledWith(['fp-1'], 'target');
    expect(repo.findUserIdsByDeviceIds).toHaveBeenCalledWith(['did-1'], 'target');
    expect(repo.findUserIdsByNetwork).toHaveBeenCalledWith('203.0.113.0/24', 'target');
    expect(repo.findUsersByIds).toHaveBeenCalledWith(['a', 'b', 'c']);
    expect(view.accounts).toEqual([
      {
        id: 'a',
        email: 'a@x.com',
        status: 'ACTIVE',
        bannedAt: null,
        createdAt: CREATED.toISOString(),
        reasons: [
          LinkedAccountReason.DEVICE,
          LinkedAccountReason.DEVICE_ID,
          LinkedAccountReason.REGISTRATION_IP,
        ],
      },
      {
        id: 'b',
        email: 'b@x.com',
        status: 'PENDING',
        bannedAt: BANNED.toISOString(),
        createdAt: CREATED.toISOString(),
        reasons: [LinkedAccountReason.DEVICE],
      },
      {
        id: 'c',
        email: 'c@x.com',
        status: 'ACTIVE',
        bannedAt: null,
        createdAt: CREATED.toISOString(),
        reasons: [LinkedAccountReason.REGISTRATION_IP],
      },
    ]);
    expect(JSON.stringify(view)).not.toMatch(/fp-1|did-1|203\.0\.113/u);
  });

  it('answers an empty list for an account with no device and no network', async () => {
    repo.findLinkingSignals.mockResolvedValue({
      fingerprintHashes: [],
      deviceIdHashes: [],
      registrationNetwork: null,
    });
    await expect(service.list('lonely')).resolves.toEqual({ accounts: [] });
    expect(repo.findUserIdsByFingerprints).not.toHaveBeenCalled();
    expect(repo.findUsersByIds).not.toHaveBeenCalled();
  });

  it('is a 404 for an unknown account', async () => {
    repo.findLinkingSignals.mockResolvedValue(null);
    await expect(service.list('ghost')).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
