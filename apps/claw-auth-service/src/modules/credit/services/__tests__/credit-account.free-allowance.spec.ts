import { type Mock, vi } from 'vitest';
import { UserRole } from '@claw/shared-types';

import { EntityNotFoundException } from '../../../../common/errors';
import { type AuthRepository } from '../../../auth/repositories/auth.repository';
import { type SystemSettingService } from '../../../system-settings/services/system-setting.service';
import { type CreditLedgerRepository } from '../../repositories/credit-ledger.repository';
import { CreditAccountService } from '../credit-account.service';
import { type CreditFreeAllowanceService } from '../credit-free-allowance.service';
import { type CreditGrantService } from '../credit-grant.service';
import { type CreditWalletService } from '../credit-wallet.service';

const wallet = {
  id: 'wallet-1',
  userId: 'user-1',
  grantMicroUsd: 0n,
  purchasedMicroUsd: 0n,
  reservedMicroUsd: 0n,
  periodGrantMicroUsd: 0n,
  periodKey: '2026-10',
  grantResetsAt: new Date('2026-11-01T00:00:00.000Z'),
  lifetimeGrantedMicroUsd: 0n,
  lifetimePurchasedMicroUsd: 0n,
  lifetimeConsumedMicroUsd: 0n,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const VIEW = { limit: 2, used: 1, remaining: 1, resetsAt: '2026-11-01T00:00:00.000Z' };

describe('CreditAccountService.getWallet — freeAllowance (ADR-142)', () => {
  let users: { findUserById: Mock };
  let settings: { isEnabled: Mock };
  let freeAllowance: { getView: Mock };
  let service: CreditAccountService;

  beforeEach(() => {
    users = { findUserById: vi.fn().mockResolvedValue({ id: 'user-1', role: UserRole.USER }) };
    settings = { isEnabled: vi.fn().mockResolvedValue(true) };
    freeAllowance = { getView: vi.fn().mockResolvedValue(VIEW) };
    service = new CreditAccountService(
      {} as unknown as CreditWalletService,
      {
        ensureCurrentPeriod: vi.fn().mockResolvedValue({ wallet, availableMicroUsd: 0n }),
      } as unknown as CreditGrantService,
      {} as unknown as CreditLedgerRepository,
      users as unknown as AuthRepository,
      settings as unknown as SystemSettingService,
      freeAllowance as unknown as CreditFreeAllowanceService,
    );
  });

  it('adds the ONE free-request total to the wallet snapshot', async () => {
    const snapshot = await service.getWallet('user-1');

    expect(snapshot.freeAllowance).toEqual(VIEW);
    expect(snapshot).toMatchObject({ availableMicroUsd: 0, meteringEnabled: true });
  });

  it('shows no allowance to an administrator: nothing is counted for them', async () => {
    users.findUserById.mockResolvedValue({ id: 'user-1', role: UserRole.ADMIN });

    const snapshot = await service.getWallet('user-1');

    expect(snapshot.freeAllowance).toBeNull();
    expect(freeAllowance.getView).not.toHaveBeenCalled();
  });

  it('asks for the view with the kill switch off too: a capped plan is still enforced', async () => {
    settings.isEnabled.mockResolvedValue(false);

    const snapshot = await service.getWallet('user-1');

    expect(snapshot.freeAllowance).toEqual(VIEW);
    expect(freeAllowance.getView).toHaveBeenCalledWith('user-1', expect.any(Date), false);
  });

  it('refuses an unknown user', async () => {
    users.findUserById.mockResolvedValue(null);

    await expect(service.getWallet('ghost')).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
