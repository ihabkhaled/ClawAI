import { Test } from '@nestjs/testing';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EntitlementInboxRepository } from '../entitlement-inbox.repository';

describe('EntitlementInboxRepository', () => {
  const entitlementInboxEvent = {
    updateMany: jest.fn(),
  };
  let repository: EntitlementInboxRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        EntitlementInboxRepository,
        { provide: PrismaService, useValue: { entitlementInboxEvent } },
      ],
    }).compile();
    repository = module.get(EntitlementInboxRepository);
  });

  it('atomically lets one delivery reclaim a failed event', async () => {
    entitlementInboxEvent.updateMany.mockResolvedValue({ count: 1 });

    await expect(repository.retryFailed('event-1')).resolves.toBe(true);
    expect(entitlementInboxEvent.updateMany).toHaveBeenCalledWith({
      where: { eventId: 'event-1', status: 'FAILED' },
      data: { status: 'PENDING' },
    });
  });
});
