import { Test, type TestingModule } from '@nestjs/testing';
import { ServerLogsController } from '../server-logs.controller';
import { ServerLogsService } from '../../services/server-logs.service';

describe('ServerLogsController', () => {
  let controller: ServerLogsController;
  let serviceMock: jest.Mocked<{
    createLog: jest.Mock;
    createMany: jest.Mock;
    getLogs: jest.Mock;
    getStats: jest.Mock;
    getDistinctValues: jest.Mock;
    getTimeSeries: jest.Mock;
  }>;

  beforeEach(async () => {
    serviceMock = {
      createLog: jest.fn(),
      createMany: jest.fn(),
      getLogs: jest.fn(),
      getStats: jest.fn(),
      getDistinctValues: jest.fn(),
      getTimeSeries: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServerLogsController],
      providers: [{ provide: ServerLogsService, useValue: serviceMock }],
    }).compile();
    controller = module.get<ServerLogsController>(ServerLogsController);
  });

  it('createLog renames "model" to "modelName" before forwarding', async () => {
    serviceMock.createLog.mockResolvedValue({ id: 'log-1' });
    const body = {
      level: 'info',
      message: 'm',
      serviceName: 's',
      model: 'gpt-4',
    };
    const result = await controller.createLog(body as never);
    expect(serviceMock.createLog).toHaveBeenCalledWith(
      expect.objectContaining({ modelName: 'gpt-4' }),
    );
    expect(result).toEqual({ id: 'log-1' });
  });

  it('createBatch maps each entry, renaming "model" to "modelName"', async () => {
    serviceMock.createMany.mockResolvedValue({ inserted: 2 });
    const body = {
      entries: [
        { level: 'info', message: 'a', serviceName: 's1', model: 'gpt-4' },
        { level: 'warn', message: 'b', serviceName: 's2', model: 'claude' },
      ],
    };
    const result = await controller.createBatch(body as never);
    expect(serviceMock.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ modelName: 'gpt-4' }),
      expect.objectContaining({ modelName: 'claude' }),
    ]);
    expect(result).toEqual({ inserted: 2 });
  });

  it('listLogs forwards query verbatim to getLogs', async () => {
    const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    serviceMock.getLogs.mockResolvedValue(expected);
    const result = await controller.listLogs({ page: 1, limit: 20 } as never);
    expect(serviceMock.getLogs).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result).toBe(expected);
  });

  it('getStats returns service stats', async () => {
    const stats = {
      byLevel: [],
      byService: [],
      byAction: [],
      byMethod: [],
      byStatusCode: [],
      byModule: [],
      total: 0,
      errorCount: 0,
      avgLatencyMs: 0,
    };
    serviceMock.getStats.mockResolvedValue(stats);
    const result = await controller.getStats();
    expect(result).toBe(stats);
  });

  it('getDistinctValues forwards field with empty filters', async () => {
    serviceMock.getDistinctValues.mockResolvedValue({ field: 'service', values: ['x'] });
    const result = await controller.getDistinctValues('service');
    expect(serviceMock.getDistinctValues).toHaveBeenCalledWith('service', {});
    expect(result).toEqual({ field: 'service', values: ['x'] });
  });

  it('getTimeSeries forwards query and uses interval default of 5 when omitted', async () => {
    serviceMock.getTimeSeries.mockResolvedValue([]);
    await controller.getTimeSeries({ page: 1, limit: 20 } as never);
    expect(serviceMock.getTimeSeries).toHaveBeenCalledWith({ page: 1, limit: 20 }, 5);
  });

  it('getTimeSeries passes through explicit interval', async () => {
    serviceMock.getTimeSeries.mockResolvedValue([]);
    await controller.getTimeSeries({ page: 1, limit: 20, interval: 30 } as never);
    expect(serviceMock.getTimeSeries).toHaveBeenCalledWith(
      { page: 1, limit: 20, interval: 30 },
      30,
    );
  });
});
