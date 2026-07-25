import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  IDEMPOTENCY_STATUS_COMPLETED,
  IDEMPOTENCY_STATUS_IN_PROGRESS,
} from '../../constants/idempotency.constants';
import { IdempotencyRepository } from '../idempotency.repository';

type IdempotencyDelegate = {
  createMany: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
};

function buildPrisma(): { prisma: PrismaService; idempotencyRecord: IdempotencyDelegate } {
  const idempotencyRecord: IdempotencyDelegate = {
    createMany: jest.fn(async () => ({ count: 1 })),
    findUnique: jest.fn(async () => ({ id: 'idem_1' })),
    findMany: jest.fn(async () => []),
    update: jest.fn(async () => ({ id: 'idem_1' })),
    delete: jest.fn(async () => ({ id: 'idem_1' })),
    deleteMany: jest.fn(async () => ({ count: 0 })),
  };
  return { prisma: { idempotencyRecord } as unknown as PrismaService, idempotencyRecord };
}

const CLAIM = {
  userId: 'user_1',
  operation: 'createCheckoutSession',
  key: 'key_abc',
  requestHash: 'b'.repeat(64),
  expiresAt: new Date('2026-07-26T00:00:00.000Z'),
};

describe('IdempotencyRepository', () => {
  let idempotencyRecord: IdempotencyDelegate;
  let repository: IdempotencyRepository;

  beforeEach(() => {
    const built = buildPrisma();
    idempotencyRecord = built.idempotencyRecord;
    repository = new IdempotencyRepository(built.prisma);
    jest.spyOn(repository['logger'], 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('claim', () => {
    it('reserves the key as IN_PROGRESS on first use', async () => {
      await repository.claim(CLAIM);
      expect(idempotencyRecord.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ status: IDEMPOTENCY_STATUS_IN_PROGRESS })],
        skipDuplicates: true,
      });
    });

    it('stores the request hash so a key reused with a different body is detectable', async () => {
      await repository.claim(CLAIM);
      const payload = idempotencyRecord.createMany.mock.calls[0]?.[0] as {
        data: Record<string, unknown>[];
      };
      expect(payload.data[0]?.['requestHash']).toBe(CLAIM.requestHash);
    });

    it('returns null when the key is already taken', async () => {
      // Letting the unique index arbitrate is what makes concurrent retries safe.
      idempotencyRecord.createMany.mockResolvedValueOnce({ count: 0 });
      await expect(repository.claim(CLAIM)).resolves.toBeNull();
      expect(idempotencyRecord.findUnique).not.toHaveBeenCalled();
    });
  });

  it('finds a record by its full (user, operation, key) scope', async () => {
    await repository.find('user_1', 'createCheckoutSession', 'key_abc');
    expect(idempotencyRecord.findUnique).toHaveBeenCalledWith({
      where: {
        userId_operation_key: {
          userId: 'user_1',
          operation: 'createCheckoutSession',
          key: 'key_abc',
        },
      },
    });
  });

  it('stores the replayable response on completion', async () => {
    await repository.complete('idem_1', { id: 'cs_1' }, 201);
    expect(idempotencyRecord.update).toHaveBeenCalledWith({
      where: { id: 'idem_1' },
      data: {
        status: IDEMPOTENCY_STATUS_COMPLETED,
        responseJson: { id: 'cs_1' },
        responseStatusCode: 201,
      },
    });
  });

  it('releases a claim whose operation failed before producing a result', async () => {
    // Otherwise a transient failure would permanently burn the caller's key.
    await repository.release('idem_1');
    expect(idempotencyRecord.delete).toHaveBeenCalledWith({ where: { id: 'idem_1' } });
  });

  describe('deleteExpired', () => {
    it('deletes nothing when there is nothing expired', async () => {
      idempotencyRecord.findMany.mockResolvedValueOnce([]);
      await expect(repository.deleteExpired(new Date(), 100)).resolves.toBe(0);
      expect(idempotencyRecord.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes in a bounded batch rather than the whole table at once', async () => {
      idempotencyRecord.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
      idempotencyRecord.deleteMany.mockResolvedValueOnce({ count: 2 });

      await expect(
        repository.deleteExpired(new Date('2026-07-25T00:00:00.000Z'), 100),
      ).resolves.toBe(2);
      expect(idempotencyRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
      expect(idempotencyRecord.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['a', 'b'] } },
      });
    });
  });
});
