import { HealthService } from "../services/health.service";
import { type PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type RedisService } from "../../../infrastructure/redis/redis.service";
import { HealthCheckStatus, ServiceStatus } from "../../../common/enums";

describe("HealthService", () => {
  let healthService: HealthService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  const mockRedisClient = {
    ping: jest.fn(),
  };

  beforeEach(() => {
    prismaService = {
      $queryRaw: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    redisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    } as unknown as jest.Mocked<RedisService>;

    healthService = new HealthService(prismaService, redisService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("check", () => {
    it("should return OK status when all dependencies are up", async () => {
      prismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockRedisClient.ping.mockResolvedValue("PONG");

      const result = await healthService.check();

      expect(result.status).toBe(HealthCheckStatus.OK);
      expect(result.services.database).toBe(ServiceStatus.UP);
      expect(result.services.redis).toBe(ServiceStatus.UP);
    });

    it("should return DOWN status when all dependencies are down", async () => {
      prismaService.$queryRaw.mockRejectedValue(new Error("DB connection failed"));
      mockRedisClient.ping.mockRejectedValue(new Error("Redis connection failed"));

      const result = await healthService.check();

      expect(result.status).toBe(HealthCheckStatus.DOWN);
      expect(result.services.database).toBe(ServiceStatus.DOWN);
      expect(result.services.redis).toBe(ServiceStatus.DOWN);
    });

    it("should return DEGRADED status when only database is down", async () => {
      prismaService.$queryRaw.mockRejectedValue(new Error("DB connection failed"));
      mockRedisClient.ping.mockResolvedValue("PONG");

      const result = await healthService.check();

      expect(result.status).toBe(HealthCheckStatus.DEGRADED);
      expect(result.services.database).toBe(ServiceStatus.DOWN);
      expect(result.services.redis).toBe(ServiceStatus.UP);
    });

    it("should return DEGRADED status when only redis is down", async () => {
      prismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockRedisClient.ping.mockRejectedValue(new Error("Redis connection failed"));

      const result = await healthService.check();

      expect(result.status).toBe(HealthCheckStatus.DEGRADED);
      expect(result.services.database).toBe(ServiceStatus.UP);
      expect(result.services.redis).toBe(ServiceStatus.DOWN);
    });

    it("should return DEGRADED when redis responds with non-PONG value", async () => {
      prismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockRedisClient.ping.mockResolvedValue("NOT_PONG");

      const result = await healthService.check();

      expect(result.status).toBe(HealthCheckStatus.DEGRADED);
      expect(result.services.redis).toBe(ServiceStatus.DOWN);
    });

    it("should include a timestamp in ISO format", async () => {
      prismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockRedisClient.ping.mockResolvedValue("PONG");

      const result = await healthService.check();

      expect(result.timestamp).toBeTruthy();
      // Verify it parses as a valid date
      const parsed = new Date(result.timestamp);
      expect(parsed.getTime()).not.toBeNaN();
    });

    it("should check database and redis concurrently", async () => {
      let dbResolved = false;
      let redisResolved = false;

      prismaService.$queryRaw.mockImplementation((async () => {
        dbResolved = true;
        return [{ "?column?": 1 }];
      }) as unknown as typeof prismaService.$queryRaw);

      mockRedisClient.ping.mockImplementation(async () => {
        redisResolved = true;
        return "PONG";
      });

      await healthService.check();

      expect(dbResolved).toBe(true);
      expect(redisResolved).toBe(true);
    });

    it("should not throw even when dependencies fail", async () => {
      prismaService.$queryRaw.mockRejectedValue(new Error("DB error"));
      mockRedisClient.ping.mockRejectedValue(new Error("Redis error"));

      await expect(healthService.check()).resolves.not.toThrow();
    });
  });
});
