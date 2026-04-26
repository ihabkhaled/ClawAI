import { Test, type TestingModule } from '@nestjs/testing';
import { UsersRepository } from '../users.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { SortOrder, UserRole, UserStatus } from '../../../../common/enums';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prismaMock: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        create: jest.fn().mockResolvedValue({ id: 'u1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn().mockResolvedValue({ id: 'u1' }),
        delete: jest.fn().mockResolvedValue({ id: 'u1' }),
      },
      $transaction: jest.fn().mockResolvedValue([[{ id: 'u1' }, { id: 'u2' }], 2]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
  });

  it('create delegates to prisma', async () => {
    const data = { email: 'a@b.c', username: 'a', passwordHash: 'h', role: UserRole.OPERATOR };
    await repository.create(data as never);
    expect(prismaMock.user.create).toHaveBeenCalledWith({ data });
  });

  it('findById delegates to prisma findUnique', async () => {
    await repository.findById('u1');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('findByEmail delegates to prisma findUnique', async () => {
    await repository.findByEmail('a@b.c');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.c' } });
  });

  it('findByUsername delegates to prisma findUnique', async () => {
    await repository.findByUsername('admin');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { username: 'admin' } });
  });

  describe('findAll', () => {
    it('uses default sortBy=createdAt and sortOrder=DESC when omitted', async () => {
      await repository.findAll({ skip: 0, take: 10 });
      const findManyArgs = prismaMock.user.findMany.mock.calls[0][0];
      expect(findManyArgs.orderBy).toEqual({ createdAt: SortOrder.DESC });
      expect(findManyArgs.skip).toBe(0);
      expect(findManyArgs.take).toBe(10);
    });

    it('uses custom sortBy and SortOrder.ASC when provided', async () => {
      await repository.findAll({ skip: 5, take: 5, sortBy: 'email', sortOrder: SortOrder.ASC });
      const findManyArgs = prismaMock.user.findMany.mock.calls[0][0];
      expect(findManyArgs.orderBy).toEqual({ email: SortOrder.ASC });
    });

    it('returns users + total from prisma transaction', async () => {
      const result = await repository.findAll({ skip: 0, take: 10 });
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('applies role / status filters via where clause', async () => {
      await repository.findAll({
        skip: 0,
        take: 10,
        filters: { role: UserRole.OPERATOR, status: UserStatus.ACTIVE },
      });
      const findManyArgs = prismaMock.user.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({
        role: UserRole.OPERATOR,
        status: UserStatus.ACTIVE,
      });
    });

    it('applies search via OR clause', async () => {
      await repository.findAll({
        skip: 0,
        take: 10,
        filters: { search: 'admin' },
      });
      const findManyArgs = prismaMock.user.findMany.mock.calls[0][0];
      expect(findManyArgs.where.OR).toHaveLength(2);
      expect(findManyArgs.where.OR[0].email).toEqual({ contains: 'admin', mode: 'insensitive' });
    });

    it('builds empty where clause when no filters provided', async () => {
      await repository.findAll({ skip: 0, take: 10 });
      const findManyArgs = prismaMock.user.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({});
    });
  });

  it('updateById delegates to prisma update', async () => {
    await repository.updateById('u1', { email: 'new@b.c' });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { email: 'new@b.c' },
    });
  });

  it('deleteById delegates to prisma delete', async () => {
    await repository.deleteById('u1');
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('countAll delegates to prisma count with no filters', async () => {
    await repository.countAll();
    expect(prismaMock.user.count).toHaveBeenCalledWith({ where: {} });
  });

  it('countAll applies filters via where clause', async () => {
    await repository.countAll({ role: UserRole.ADMIN });
    expect(prismaMock.user.count).toHaveBeenCalledWith({ where: { role: UserRole.ADMIN } });
  });

  it('updatePreferences delegates to prisma update', async () => {
    await repository.updatePreferences('u1', { languagePreference: 'EN' as never });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { languagePreference: 'EN' },
    });
  });
});
