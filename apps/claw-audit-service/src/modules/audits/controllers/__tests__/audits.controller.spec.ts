import { Test, type TestingModule } from '@nestjs/testing';
import { AuditsController } from '../audits.controller';
import { AuditsService } from '../../services/audits.service';
import { UsageService } from '../../services/usage.service';

describe('AuditsController', () => {
  let controller: AuditsController;
  let auditsMock: jest.Mocked<{
    getAuditLogs: jest.Mock;
    getAuditStats: jest.Mock;
  }>;
  let usageMock: jest.Mocked<{
    getUsageEntries: jest.Mock;
    getUsageSummary: jest.Mock;
    getCostSummary: jest.Mock;
    getLatencySummary: jest.Mock;
  }>;

  beforeEach(async () => {
    auditsMock = { getAuditLogs: jest.fn(), getAuditStats: jest.fn() };
    usageMock = {
      getUsageEntries: jest.fn(),
      getUsageSummary: jest.fn(),
      getCostSummary: jest.fn(),
      getLatencySummary: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditsController],
      providers: [
        { provide: AuditsService, useValue: auditsMock },
        { provide: UsageService, useValue: usageMock },
      ],
    }).compile();
    controller = module.get<AuditsController>(AuditsController);
  });

  it('listAuditLogs forwards filters', async () => {
    const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    auditsMock.getAuditLogs.mockResolvedValue(expected);
    const result = await controller.listAuditLogs({
      page: 2,
      limit: 30,
      action: 'login',
      severity: 'INFO',
      entityType: 'User',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      search: 'foo',
    } as never);
    expect(auditsMock.getAuditLogs).toHaveBeenCalledWith({
      page: 2,
      limit: 30,
      action: 'login',
      severity: 'INFO',
      entityType: 'User',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      search: 'foo',
    });
    expect(result).toBe(expected);
  });

  it('getAuditStats returns service result', async () => {
    const expected = { byAction: [], bySeverity: [], total: 0 };
    auditsMock.getAuditStats.mockResolvedValue(expected);
    const result = await controller.getAuditStats();
    expect(result).toBe(expected);
  });

  it('listUsageEntries forwards filters', async () => {
    const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    usageMock.getUsageEntries.mockResolvedValue(expected);
    const result = await controller.listUsageEntries({
      page: 1,
      limit: 20,
      provider: 'openai',
      model: 'gpt-4',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    } as never);
    expect(usageMock.getUsageEntries).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      provider: 'openai',
      model: 'gpt-4',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    expect(result).toBe(expected);
  });

  it('getUsageSummary returns usage service result', async () => {
    const expected = { byProvider: [], byModel: [], totalRequests: 0 };
    usageMock.getUsageSummary.mockResolvedValue(expected);
    expect(await controller.getUsageSummary()).toBe(expected);
  });

  it('getCostSummary returns usage service result', async () => {
    const expected = { totalTokens: 0, totalRequests: 0, estimatedCost: 0 };
    usageMock.getCostSummary.mockResolvedValue(expected);
    expect(await controller.getCostSummary()).toBe(expected);
  });

  it('getLatencySummary returns usage service result', async () => {
    const expected = { avgLatency: 0, p50Latency: 0, p95Latency: 0, totalRequests: 0 };
    usageMock.getLatencySummary.mockResolvedValue(expected);
    expect(await controller.getLatencySummary()).toBe(expected);
  });
});
