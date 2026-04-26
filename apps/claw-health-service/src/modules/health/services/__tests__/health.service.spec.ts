import { Test, type TestingModule } from '@nestjs/testing';
import { ServiceStatus } from '@claw/shared-types';
import { httpGet } from '@common/utilities';
import { HealthService } from '../health.service';
import { AggregatedHealthStatus } from '../../enums/aggregated-health-status.enum';

jest.mock('@common/utilities', () => ({
  httpGet: jest.fn(),
}));

const mockHttpGet = httpGet as jest.MockedFunction<typeof httpGet>;

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();
    service = module.get<HealthService>(HealthService);
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
