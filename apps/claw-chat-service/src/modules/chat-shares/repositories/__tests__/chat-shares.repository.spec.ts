import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  ChatShareSafetyStatus,
  ChatShareStatus,
  ChatShareVisibility,
} from '../../../../generated/prisma';
import { ChatSharesRepository } from '../chat-shares.repository';

describe('ChatSharesRepository discovery query', () => {
  it('requires indexing eligibility without coupling discovery to ads', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { chatShare: { findMany } };
    const repository = new ChatSharesRepository(prisma as unknown as PrismaService);

    await repository.listIndexable('ja', 100, null);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ChatShareStatus.ACTIVE,
          visibility: ChatShareVisibility.PUBLIC_INDEXED,
          safetyStatus: ChatShareSafetyStatus.APPROVED,
          indexEligible: true,
          contentLocale: 'ja',
        }),
      }),
    );
    const query = findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(query.where).not.toHaveProperty('adsEligible');
  });

  it('uses a stable compound keyset after equal timestamps', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { chatShare: { findMany } };
    const repository = new ChatSharesRepository(prisma as unknown as PrismaService);
    const updatedAt = new Date('2026-07-26T10:20:30.000Z');

    await repository.listIndexable('en', 50, { updatedAt, id: 'row-2' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ updatedAt: { lt: updatedAt } }, { updatedAt, id: { lt: 'row-2' } }],
        }),
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });
});
