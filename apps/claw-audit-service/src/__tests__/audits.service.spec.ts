import { AuditsService } from "@modules/audits/services/audits.service";
import { type AuditsRepository } from "@modules/audits/repositories/audits.repository";

describe("AuditsService", () => {
  let service: AuditsService;
  let repository: jest.Mocked<AuditsRepository>;

  beforeEach(() => {
    repository = {
      createAuditLog: jest.fn(),
      findAll: jest.fn(),
      countAll: jest.fn(),
      aggregateByAction: jest.fn(),
      aggregateBySeverity: jest.fn(),
    } as unknown as jest.Mocked<AuditsRepository>;

    service = new AuditsService(repository);
  });

  describe("createAuditLog", () => {
    it("should delegate to repository", async () => {
      const input = {
        userId: "user-1",
        action: "LOGIN",
        severity: "LOW",
      };
      repository.createAuditLog.mockResolvedValue({ _id: "audit-1", ...input } as never);

      const result = await service.createAuditLog(input);
      expect(repository.createAuditLog).toHaveBeenCalledWith(input);
      expect(result).toEqual(expect.objectContaining({ _id: "audit-1" }));
    });
  });

  describe("getAuditLogs", () => {
    it("should return paginated results", async () => {
      repository.findAll.mockResolvedValue([{ _id: "1" }] as never);
      repository.countAll.mockResolvedValue(1);

      const result = await service.getAuditLogs({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it("should calculate totalPages correctly", async () => {
      repository.findAll.mockResolvedValue([] as never);
      repository.countAll.mockResolvedValue(25);

      const result = await service.getAuditLogs({ page: 1, limit: 10 });
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe("getAuditStats", () => {
    it("should return aggregated stats", async () => {
      repository.aggregateByAction.mockResolvedValue([
        { _id: "LOGIN", count: 10 },
        { _id: "CREATE", count: 5 },
      ]);
      repository.aggregateBySeverity.mockResolvedValue([
        { _id: "LOW", count: 12 },
        { _id: "HIGH", count: 3 },
      ]);
      repository.countAll.mockResolvedValue(15);

      const result = await service.getAuditStats();

      expect(result.byAction).toHaveLength(2);
      expect(result.bySeverity).toHaveLength(2);
      expect(result.total).toBe(15);
    });
  });
});
