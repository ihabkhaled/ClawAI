import { type Mock, vi } from 'vitest';

import { type PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CreditLedgerRepository } from '../credit-ledger.repository';

describe('CreditLedgerRepository.findFreeAllowanceCountsSlot', () => {
  let findFirst: Mock;
  let repository: CreditLedgerRepository;

  beforeEach(() => {
    findFirst = vi.fn();
    repository = new CreditLedgerRepository({
      creditLedgerEntry: { findFirst },
    } as unknown as PrismaService);
  });

  it('is false when the admission was written as UNCOUNTED (a Thread call took no slot)', async () => {
    findFirst.mockResolvedValue({ id: 'row-1' });

    await expect(repository.findFreeAllowanceCountsSlot('res-1')).resolves.toBe(false);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        reservationId: 'res-1',
        kind: 'FREE_ALLOWANCE',
        reason: 'FREE_ALLOWANCE_USED:UNCOUNTED',
      },
      select: { id: true },
    });
  });

  it('is true for an ordinary admission, so its release returns the slot as before', async () => {
    findFirst.mockResolvedValue(null);

    await expect(repository.findFreeAllowanceCountsSlot('res-1')).resolves.toBe(true);
  });
});
