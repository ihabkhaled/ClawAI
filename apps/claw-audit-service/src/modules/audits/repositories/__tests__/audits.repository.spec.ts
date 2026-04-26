import { Test, type TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuditsRepository } from '../audits.repository';
import { AuditLog } from '../../schemas/audit-log.schema';

describe('AuditsRepository', () => {
  let repository: AuditsRepository;
  let modelMock: jest.Mocked<{
    find: jest.Mock;
    countDocuments: jest.Mock;
    aggregate: jest.Mock;
  }>;

  const buildQueryChain = (): {
    sort: jest.Mock;
    skip: jest.Mock;
    limit: jest.Mock;
    exec: jest.Mock;
  } => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([{ _id: 'a1' }]),
  });

  beforeEach(async () => {
    const queryChain = buildQueryChain();
    const docMock = { save: jest.fn().mockResolvedValue({ _id: 'audit-1' }) };
    function modelFactory(): typeof docMock {
      return docMock;
    }
    Object.assign(modelFactory, {
      find: jest.fn().mockReturnValue(queryChain),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(7) }),
      aggregate: jest.fn().mockResolvedValue([{ _id: 'create', count: 5 }]),
    });
    modelMock = modelFactory as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditsRepository, { provide: getModelToken(AuditLog.name), useValue: modelMock }],
    }).compile();

    repository = module.get<AuditsRepository>(AuditsRepository);
  });

  it('createAuditLog persists via mongoose', async () => {
    const result = await repository.createAuditLog({
      action: 'login',
      entityType: 'User',
      entityId: 'u1',
      severity: 'INFO',
    } as never);
    expect(result).toEqual({ _id: 'audit-1' });
  });

  describe('findAll / buildAuditQuery', () => {
    it('uses default page=1 limit=20 when omitted', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({});
      expect(queryChain.skip).toHaveBeenCalledWith(0);
      expect(queryChain.limit).toHaveBeenCalledWith(20);
      expect(queryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('skips correctly for page=2 limit=10', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ page: 2, limit: 10 });
      expect(queryChain.skip).toHaveBeenCalledWith(10);
      expect(queryChain.limit).toHaveBeenCalledWith(10);
    });

    it('applies userId / action / entityType / severity filters', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({
        userId: 'u1',
        action: 'login',
        entityType: 'User',
        severity: 'INFO',
      });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.userId).toBe('u1');
      expect(q.action).toBe('login');
      expect(q.entityType).toBe('User');
      expect(q.severity).toBe('INFO');
    });

    it('applies date range filters', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ startDate: '2026-01-01', endDate: '2026-12-31' });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.createdAt.$gte).toBeInstanceOf(Date);
      expect(q.createdAt.$lte).toBeInstanceOf(Date);
    });

    it('applies $or search across action / entityType / entityId / userId', async () => {
      const queryChain = buildQueryChain();
      modelMock.find.mockReturnValue(queryChain);
      await repository.findAll({ search: 'login' });
      const q = modelMock.find.mock.calls[0]?.[0];
      expect(q.$or).toHaveLength(4);
      expect(q.$or[0]).toEqual({ action: { $regex: 'login', $options: 'i' } });
    });
  });

  describe('countAll', () => {
    it('returns count from mongoose', async () => {
      const result = await repository.countAll({});
      expect(result).toBe(7);
    });
  });

  describe('aggregations', () => {
    it('aggregateByAction returns model.aggregate result', async () => {
      const result = await repository.aggregateByAction();
      expect(result).toEqual([{ _id: 'create', count: 5 }]);
    });

    it('aggregateBySeverity returns model.aggregate result', async () => {
      const result = await repository.aggregateBySeverity();
      expect(result).toEqual([{ _id: 'create', count: 5 }]);
    });
  });
});
