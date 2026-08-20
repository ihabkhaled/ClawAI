import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EmailChangeStage } from '../../enums/email-change-stage.enum';
import { EmailChangeRepository } from '../email-change.repository';

describe('EmailChangeRepository', () => {
  const transaction = {
    emailChangeRequest: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    emailVerificationToken: { deleteMany: jest.fn() },
    passwordResetToken: { deleteMany: jest.fn() },
    session: { deleteMany: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
    emailChangeRequest: { updateMany: jest.fn() },
  };
  let repository: EmailChangeRepository;

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) => callback(transaction),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailChangeRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();
    repository = module.get(EmailChangeRepository);
  });

  it('marks old-email verification only once', async () => {
    prisma.emailChangeRequest.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const expiry = new Date(Date.now() + 60_000);

    await expect(repository.markOldEmailVerified('request-1', 'token-hash', expiry)).resolves.toBe(
      true,
    );
    await expect(repository.markOldEmailVerified('request-1', 'token-hash', expiry)).resolves.toBe(
      false,
    );
    expect(prisma.emailChangeRequest.updateMany).toHaveBeenCalledTimes(2);
  });

  it('consumes and applies an email change only once', async () => {
    const request = {
      id: 'request-1',
      userId: 'user-1',
      newEmail: 'new@example.com',
    };
    transaction.emailChangeRequest.findFirst
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce(null);
    transaction.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ email: 'old@example.com' });
    transaction.emailChangeRequest.updateMany.mockResolvedValue({ count: 1 });

    await expect(repository.consumeAndApplyEmailChange('token-hash')).resolves.toEqual({
      changed: true,
      oldEmail: 'old@example.com',
    });
    await expect(repository.consumeAndApplyEmailChange('token-hash')).resolves.toEqual({
      changed: false,
    });

    expect(transaction.emailChangeRequest.updateMany).toHaveBeenCalledTimes(1);
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { email: 'new@example.com', emailVerifiedAt: expect.any(Date) },
    });
    expect(transaction.user.update.mock.calls[0]?.[0].data).not.toHaveProperty('status');
    expect(transaction.session.deleteMany).toHaveBeenCalledTimes(1);
    expect(transaction.passwordResetToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(transaction.emailVerificationToken.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('rechecks new-email ownership inside the transaction', async () => {
    transaction.emailChangeRequest.findFirst.mockResolvedValue({
      id: 'request-1',
      userId: 'user-1',
      newEmail: 'taken@example.com',
      stage: EmailChangeStage.NEW_EMAIL_PENDING,
    });
    transaction.user.findUnique.mockResolvedValue({ id: 'user-2' });

    await expect(repository.consumeAndApplyEmailChange('token-hash')).resolves.toEqual({
      changed: false,
    });
    expect(transaction.emailChangeRequest.updateMany).not.toHaveBeenCalled();
    expect(transaction.user.update).not.toHaveBeenCalled();
    expect(transaction.session.deleteMany).not.toHaveBeenCalled();
  });
});
