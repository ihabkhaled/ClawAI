import { Test, type TestingModule } from '@nestjs/testing';
import { SessionClientKind } from '../../enums/session-client-kind.enum';
import { AuthRepository } from '../auth.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prismaMock: {
    user: { findUnique: jest.Mock };
    session: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) },
      session: {
        create: jest.fn().mockResolvedValue({ id: 's1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 's1' }),
        update: jest.fn().mockResolvedValue({ id: 's1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue({ id: 's1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (operation: (transaction: typeof prismaMock) => unknown) =>
          operation(prismaMock),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);
  });

  it('findUserByEmail uses prisma findUnique by email', async () => {
    await repository.findUserByEmail('a@b.c');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.c' } });
  });

  it('findUserById uses prisma findUnique by id', async () => {
    await repository.findUserById('u1');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('createSession persists with given data', async () => {
    const data = {
      userId: 'u1',
      refreshTokenHash: 'digest',
      familyId: 'family-1',
      expiresAt: new Date('2026-12-31'),
    };
    await repository.createSession(data);
    expect(prismaMock.session.create).toHaveBeenCalledWith({ data });
  });

  it('looks up a session by refresh-token hash', async () => {
    await repository.findSessionByRefreshTokenHash('digest');

    expect(prismaMock.session.findUnique).toHaveBeenCalledWith({
      where: { refreshTokenHash: 'digest' },
    });
  });

  it('marks the current session used and creates its replacement atomically', async () => {
    const usedAt = new Date('2026-07-27T00:00:00.000Z');
    const expiresAt = new Date('2026-08-26T00:00:00.000Z');

    await repository.rotateSession({
      currentSessionId: 'session-current',
      usedAt,
      replacement: {
        id: 'session-next',
        userId: 'u1',
        refreshTokenHash: 'digest-next',
        familyId: 'family-1',
        clientKind: SessionClientKind.VSCODE,
        clientName: 'VS Code',
        expiresAt,
      },
    });

    expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-current',
        revokedAt: null,
        usedAt: null,
      },
      data: {
        replacedBySessionId: 'session-next',
        usedAt,
      },
    });
    expect(prismaMock.session.create).toHaveBeenCalledWith({
      data: {
        id: 'session-next',
        userId: 'u1',
        refreshTokenHash: 'digest-next',
        familyId: 'family-1',
        clientKind: SessionClientKind.VSCODE,
        clientName: 'VS Code',
        expiresAt,
      },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not create a replacement when the current session was already consumed', async () => {
    prismaMock.session.updateMany.mockResolvedValue({ count: 0 });

    const result = await repository.rotateSession({
      currentSessionId: 'session-current',
      usedAt: new Date('2026-07-27T00:00:00.000Z'),
      replacement: {
        id: 'session-next',
        userId: 'u1',
        refreshTokenHash: 'digest-next',
        familyId: 'family-1',
        clientKind: SessionClientKind.VSCODE,
        expiresAt: new Date('2026-08-26T00:00:00.000Z'),
      },
    });

    expect(result).toBeNull();
    expect(prismaMock.session.create).not.toHaveBeenCalled();
  });

  it('revokes every active session in a token family', async () => {
    const revokedAt = new Date('2026-07-27T00:00:00.000Z');

    await repository.revokeSessionFamily('family-1', revokedAt);

    expect(prismaMock.session.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-1',
        revokedAt: null,
      },
      data: { revokedAt },
    });
  });

  it('revokes a session only when it belongs to the authenticated user', async () => {
    const revokedAt = new Date('2026-07-27T00:00:00.000Z');

    await repository.revokeSessionForUser('session-1', 'user-1', revokedAt);

    expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        userId: 'user-1',
        revokedAt: null,
      },
      data: { revokedAt },
    });
  });

  it('deleteSession uses prisma delete by id', async () => {
    await repository.deleteSession('s1');
    expect(prismaMock.session.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('deleteSessionsByUserId uses prisma deleteMany by userId', async () => {
    await repository.deleteSessionsByUserId('u1');
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('deleteExpiredSessions deletes by expiresAt < now and returns count', async () => {
    const result = await repository.deleteExpiredSessions();
    expect(result).toBe(3);
    const callArg = prismaMock.session.deleteMany.mock.calls[0][0];
    expect(callArg.where.expiresAt.lt).toBeInstanceOf(Date);
  });
});
