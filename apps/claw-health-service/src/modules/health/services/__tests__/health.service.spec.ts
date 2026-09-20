import { type MockedFunction, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ServiceStatus } from '@claw/shared-types';
import { httpGet } from '@common/utilities';
import { HealthService } from '../health.service';
import { AggregatedHealthStatus } from '../../enums/aggregated-health-status.enum';

vi.mock('@common/utilities', () => ({
  httpGet: vi.fn(),
}));

const mockHttpGet = httpGet as MockedFunction<typeof httpGet>;

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();
    service = module.get<HealthService>(HealthService);
  });

  // The container healthcheck and the Prometheus exporter both run every 15 s,
  // so an INFO line per check was ~11,500 identical lines a day in the log
  // store. A CHANGE of status is the event worth reading (ADR-113).
  describe('logging', () => {
    it('logs a status change at info, and a repeat at debug', async () => {
      mockHttpGet.mockResolvedValue({});
      const info = vi.spyOn(service['logger'], 'log').mockImplementation(() => {});
      const debug = vi.spyOn(service['logger'], 'debug').mockImplementation(() => {});

      await service.checkAll();
      expect(info).toHaveBeenCalledOnce();
      expect(info.mock.calls[0]?.[0]).toContain('(was unknown)');

      await service.checkAll();
      await service.checkAll();
      expect(info).toHaveBeenCalledOnce();
      expect(debug.mock.calls.some(([line]) => String(line).includes('completed status'))).toBe(
        true,
      );

      mockHttpGet.mockRejectedValue(new Error('down'));
      await service.checkAll();
      expect(info).toHaveBeenCalledTimes(2);
      expect(info.mock.calls[1]?.[0]).toContain('(was healthy)');
    });
  });

  describe('checkAll', () => {
    it('returns HEALTHY when every service responds', async () => {
      mockHttpGet.mockResolvedValue({});

      const result = await service.checkAll();

      expect(result.status).toBe(AggregatedHealthStatus.HEALTHY);
      expect(result.summary.up).toBe(result.services.length);
      expect(result.summary.down).toBe(0);
      expect(result.summary.total).toBe(result.services.length);
      expect(result.services.every((s) => s.status === ServiceStatus.UP)).toBe(true);
    });

    it('returns UNHEALTHY when every service is down', async () => {
      mockHttpGet.mockRejectedValue(new Error('connection refused'));

      const result = await service.checkAll();

      expect(result.status).toBe(AggregatedHealthStatus.UNHEALTHY);
      expect(result.summary.up).toBe(0);
      expect(result.summary.down).toBe(result.services.length);
      expect(result.services.every((s) => s.status === ServiceStatus.DOWN)).toBe(true);
      expect(result.services.every((s) => s.error === 'connection refused')).toBe(true);
    });

    it('returns DEGRADED when some services are down', async () => {
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes('auth')) {
          return Promise.reject(new Error('auth down'));
        }
        return Promise.resolve({});
      });

      const result = await service.checkAll();

      expect(result.status).toBe(AggregatedHealthStatus.DEGRADED);
      expect(result.summary.up).toBeGreaterThan(0);
      expect(result.summary.down).toBeGreaterThan(0);
    });

    it('serialises status as the literal "healthy" string for the API contract', async () => {
      mockHttpGet.mockResolvedValue({});
      const result = await service.checkAll();
      expect(JSON.parse(JSON.stringify({ status: result.status })).status).toBe('healthy');
    });

    it('records responseTimeMs for UP services and null for DOWN', async () => {
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes('auth')) {
          return Promise.reject(new Error('auth down'));
        }
        return Promise.resolve({});
      });

      const result = await service.checkAll();
      const upService = result.services.find((s) => s.status === ServiceStatus.UP);
      const downService = result.services.find((s) => s.status === ServiceStatus.DOWN);

      expect(upService?.responseTimeMs).toEqual(expect.any(Number));
      expect(upService?.error).toBeNull();
      expect(downService?.responseTimeMs).toBeNull();
      expect(downService?.error).toBe('auth down');
    });

    it('emits an ISO 8601 timestamp', async () => {
      mockHttpGet.mockResolvedValue({});
      const result = await service.checkAll();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('calls httpGet exactly once per registered service', async () => {
      mockHttpGet.mockResolvedValue({});
      const result = await service.checkAll();
      expect(mockHttpGet).toHaveBeenCalledTimes(result.services.length);
    });

    it('coerces non-Error throws into a string error message', async () => {
      mockHttpGet.mockRejectedValue('boom');
      const result = await service.checkAll();
      expect(result.services.every((s) => s.error === 'boom')).toBe(true);
    });
  });
});
