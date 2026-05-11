import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RouterAdminOverrideRepository } from '../repositories/router-admin-override.repository';

const fakeRow = {
  id: 'o1',
  profileId: 'r1',
  fieldName: 'outputCostPer1M',
  fieldValue: 12.5,
  reason: 'admin pin',
  setBy: 'user-1',
  setAt: new Date('2026-05-10T00:00:00Z'),
  isActive: true,
};

describe('RouterAdminOverrideRepository', () => {
  let repo: RouterAdminOverrideRepository;
  let prisma: { routerAdminOverride: Record<string, jest.Mock> };

  beforeEach(async () => {
    prisma = {
      routerAdminOverride: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RouterAdminOverrideRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repo = module.get<RouterAdminOverrideRepository>(RouterAdminOverrideRepository);
  });

  describe('listByProfileId', () => {
    it('filters isActive=true by default', async () => {
      prisma.routerAdminOverride.findMany!.mockResolvedValue([fakeRow]);
      const result = await repo.listByProfileId('r1');
      const call = prisma.routerAdminOverride.findMany!.mock.calls[0]![0];
      expect(call.where.isActive).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('omits isActive filter when onlyActive=false', async () => {
      prisma.routerAdminOverride.findMany!.mockResolvedValue([]);
      await repo.listByProfileId('r1', false);
      const call = prisma.routerAdminOverride.findMany!.mock.calls[0]![0];
      expect(call.where.isActive).toBeUndefined();
    });
  });

  describe('upsertOverride', () => {
    it('upserts on (profileId, fieldName) composite key', async () => {
      prisma.routerAdminOverride.upsert!.mockResolvedValue(fakeRow);
      await repo.upsertOverride({
        profileId: 'r1',
        fieldName: 'outputCostPer1M',
        fieldValue: 12.5,
        setBy: 'user-1',
      });
      const call = prisma.routerAdminOverride.upsert!.mock.calls[0]![0];
      expect(call.where.profileId_fieldName).toEqual({
        profileId: 'r1',
        fieldName: 'outputCostPer1M',
      });
      expect(call.create.fieldValue).toBe(12.5);
      expect(call.update.fieldValue).toBe(12.5);
    });

    it('two consecutive calls on same field do not duplicate (replace via upsert)', async () => {
      prisma.routerAdminOverride.upsert!.mockResolvedValue(fakeRow);
      await repo.upsertOverride({
        profileId: 'r1',
        fieldName: 'outputCostPer1M',
        fieldValue: 12.5,
        setBy: 'user-1',
      });
      await repo.upsertOverride({
        profileId: 'r1',
        fieldName: 'outputCostPer1M',
        fieldValue: 14.0,
        setBy: 'user-2',
      });
      expect(prisma.routerAdminOverride.upsert).toHaveBeenCalledTimes(2);
      const lastCall = prisma.routerAdminOverride.upsert!.mock.calls[1]![0];
      expect(lastCall.update.fieldValue).toBe(14.0);
      expect(lastCall.update.setBy).toBe('user-2');
    });
  });

  describe('deactivate', () => {
    it('sets isActive=false via updateMany', async () => {
      prisma.routerAdminOverride.updateMany!.mockResolvedValue({ count: 1 });
      await repo.deactivate('r1', 'outputCostPer1M');
      expect(prisma.routerAdminOverride.updateMany).toHaveBeenCalledWith({
        where: { profileId: 'r1', fieldName: 'outputCostPer1M' },
        data: { isActive: false },
      });
    });
  });
});
