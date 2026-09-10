import { Test, type TestingModule } from '@nestjs/testing';
import { ClientLogsController } from '../client-logs.controller';
import { ClientLogsService } from '../../services/client-logs.service';

describe('ClientLogsController', () => {
  let controller: ClientLogsController;
  let serviceMock: jest.Mocked<{
    create: jest.Mock;
    createMany: jest.Mock;
    search: jest.Mock;
    getStats: jest.Mock;
    getDistinctValues: jest.Mock;
  }>;

  beforeEach(async () => {
    serviceMock = {
      create: jest.fn(),
      createMany: jest.fn(),
      search: jest.fn(),
      getStats: jest.fn(),
      getDistinctValues: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientLogsController],
      providers: [{ provide: ClientLogsService, useValue: serviceMock }],
    }).compile();
    controller = module.get<ClientLogsController>(ClientLogsController);
  });

  describe('create', () => {
    it('forwards body to service.create and returns the id', async () => {
      serviceMock.create.mockResolvedValue({ id: 'log-1' });
      const dto = { level: 'error', message: 'bad' };
      const result = await controller.create(dto as never);
      expect(serviceMock.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'log-1' });
    });

    it('propagates service errors', async () => {
      serviceMock.create.mockRejectedValue(new Error('boom'));
      await expect(controller.create({ level: 'info', message: 'x' } as never)).rejects.toThrow(
        'boom',
      );
    });
  });

  describe('createBatch', () => {
    it('unwraps the envelope and forwards only the events', async () => {
      // The envelope exists so the payload can grow later; the service should
      // never see it.
      serviceMock.createMany.mockResolvedValue({ ids: ['a', 'b'], accepted: 2 });
      const events = [
        { level: 'error', message: 'first' },
        { level: 'error', message: 'second' },
      ];

      const result = await controller.createBatch({ events } as never);

      expect(serviceMock.createMany).toHaveBeenCalledWith(events);
      expect(result).toEqual({ ids: ['a', 'b'], accepted: 2 });
    });

    it('propagates service errors', async () => {
      serviceMock.createMany.mockRejectedValue(new Error('insert failed'));
      await expect(
        controller.createBatch({ events: [{ level: 'info', message: 'x' }] } as never),
      ).rejects.toThrow('insert failed');
    });
  });

  describe('search', () => {
    it('forwards query and returns paginated result', async () => {
      const expected = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      serviceMock.search.mockResolvedValue(expected);
      const result = await controller.search({ page: 1, limit: 20 } as never);
      expect(serviceMock.search).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toBe(expected);
    });
  });

  describe('getStats', () => {
    it('returns stats from service', async () => {
      const stats = {
        byLevel: [],
        topComponents: [],
        topActions: [],
        topRoutes: [],
        errorCount: 0,
        total: 0,
      };
      serviceMock.getStats.mockResolvedValue(stats);
      const result = await controller.getStats();
      expect(result).toBe(stats);
    });
  });

  describe('getDistinctValues', () => {
    it('forwards field and uses empty filters', async () => {
      const expected = { field: 'component', values: ['a'] };
      serviceMock.getDistinctValues.mockResolvedValue(expected);
      const result = await controller.getDistinctValues('component');
      expect(serviceMock.getDistinctValues).toHaveBeenCalledWith('component', {});
      expect(result).toBe(expected);
    });
  });
});
