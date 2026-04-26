import { Test, type TestingModule } from '@nestjs/testing';
import { AuthRepository } from '../auth.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prismaMock: {
    user: { findUnique: jest.Mock };
    session: {
      create: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) },
      session: {
        create: jest.fn().mockResolvedValue({ id: 's1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 's1' }),
        delete: jest.fn().mockResolvedValue({ id: 's1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
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
    const data = { userId: 'u1', refreshToken: 'rt-1', expiresAt: new Date('2026-12-31') };
    await repository.createSession(data);
    expect(prismaMock.session.create).toHaveBeenCalledWith({ data });
  });

  it('findSessionByRefreshToken uses prisma findUnique', async () => {
    await repository.findSessionByRefreshToken('rt-1');
    expect(prismaMock.session.findUnique).toHaveBeenCalledWith({
      where: { refreshToken: 'rt-1' },
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
