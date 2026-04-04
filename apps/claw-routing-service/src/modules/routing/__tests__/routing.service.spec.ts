import { RoutingService } from "../services/routing.service";
import { RoutingPoliciesRepository } from "../repositories/routing-policies.repository";
import { RoutingDecisionsRepository } from "../repositories/routing-decisions.repository";
import { RoutingManager } from "../managers/routing.manager";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EntityNotFoundException } from "../../../common/errors";
import { RoutingMode } from "../../../generated/prisma";

const mockPolicy = {
  id: "policy-1",
  name: "Default Auto",
  routingMode: RoutingMode.AUTO,
  priority: 0,
  isActive: true,
  config: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDecision = {
  id: "decision-1",
  messageId: "msg-1",
  threadId: "thread-1",
  selectedProvider: "anthropic",
  selectedModel: "claude-sonnet-4",
  routingMode: RoutingMode.AUTO,
  confidence: 0.75,
  reasonTags: ["auto"],
  privacyClass: "cloud",
  costClass: "medium",
  fallbackProvider: null,
  fallbackModel: null,
  createdAt: new Date(),
};

const mockPoliciesRepo = (): { create: jest.Mock; findById: jest.Mock; findAll: jest.Mock; countAll: jest.Mock; findActivePolicies: jest.Mock; update: jest.Mock; delete: jest.Mock } => ({
  create: jest.fn().mockResolvedValue(mockPolicy),
  findById: jest.fn().mockResolvedValue(mockPolicy),
  findAll: jest.fn().mockResolvedValue([mockPolicy]),
  countAll: jest.fn().mockResolvedValue(1),
  findActivePolicies: jest.fn().mockResolvedValue([mockPolicy]),
  update: jest.fn().mockResolvedValue({ ...mockPolicy, name: "Updated" }),
  delete: jest.fn().mockResolvedValue(mockPolicy),
});

const mockDecisionsRepo = (): Record<string, jest.Mock> => ({
  create: jest.fn().mockResolvedValue(mockDecision),
  findById: jest.fn().mockResolvedValue(mockDecision),
  findByThreadId: jest.fn().mockResolvedValue([mockDecision]),
  countByThreadId: jest.fn().mockResolvedValue(1),
});

const mockRoutingManager = (): Partial<Record<keyof RoutingManager, jest.Mock>> => ({
  evaluateRoute: jest.fn().mockResolvedValue({
    selectedProvider: "anthropic",
    selectedModel: "claude-sonnet-4",
    routingMode: RoutingMode.AUTO,
    confidence: 0.75,
    reasonTags: ["auto"],
    privacyClass: "cloud",
    costClass: "medium",
    fallbackChain: [],
  }),
  buildFallbackChain: jest.fn().mockReturnValue([]),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
});

describe("RoutingService", () => {
  let service: RoutingService;
  let policiesRepo: ReturnType<typeof mockPoliciesRepo>;
  let decisionsRepo: ReturnType<typeof mockDecisionsRepo>;
  let routingManager: ReturnType<typeof mockRoutingManager>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    policiesRepo = mockPoliciesRepo();
    decisionsRepo = mockDecisionsRepo();
    routingManager = mockRoutingManager();
    rabbitMQ = mockRabbitMQ();
    service = new RoutingService(
      policiesRepo as unknown as RoutingPoliciesRepository,
      decisionsRepo as unknown as RoutingDecisionsRepository,
      routingManager as unknown as RoutingManager,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe("createPolicy", () => {
    it("should create a routing policy", async () => {
      const result = await service.createPolicy({
        name: "Default Auto",
        routingMode: RoutingMode.AUTO,
        priority: 0,
        config: {},
      });

      expect(result.id).toBe("policy-1");
      expect(policiesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Default Auto" }),
      );
    });
  });

  describe("getPolicies", () => {
    it("should return paginated policies", async () => {
      const result = await service.getPolicies({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("should pass routing mode filter", async () => {
      await service.getPolicies({
        page: 1,
        limit: 20,
        routingMode: RoutingMode.AUTO,
      });

      expect(policiesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ routingMode: RoutingMode.AUTO }),
        1,
        20,
      );
    });
  });

  describe("getPolicy", () => {
    it("should return policy by id", async () => {
      const result = await service.getPolicy("policy-1");

      expect(result.id).toBe("policy-1");
    });

    it("should throw EntityNotFoundException when not found", async () => {
      policiesRepo.findById.mockResolvedValue(null);

      await expect(service.getPolicy("nonexistent")).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe("updatePolicy", () => {
    it("should update policy", async () => {
      const result = await service.updatePolicy("policy-1", { name: "Updated" });

      expect(result.name).toBe("Updated");
      expect(policiesRepo.update).toHaveBeenCalledWith("policy-1", { name: "Updated" });
    });

    it("should throw EntityNotFoundException when not found", async () => {
      policiesRepo.findById.mockResolvedValue(null);

      await expect(
        service.updatePolicy("nonexistent", { name: "Updated" }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe("deletePolicy", () => {
    it("should delete policy", async () => {
      const result = await service.deletePolicy("policy-1");

      expect(result.id).toBe("policy-1");
      expect(policiesRepo.delete).toHaveBeenCalledWith("policy-1");
    });
  });

  describe("evaluateRoute", () => {
    it("should evaluate route and return decision", async () => {
      const result = await service.evaluateRoute({
        messageContent: "Hello world",
      });

      expect(result.selectedProvider).toBe("anthropic");
      expect(result.routingMode).toBe(RoutingMode.AUTO);
      expect(routingManager.evaluateRoute).toHaveBeenCalled();
    });

    it("should pass routing mode to manager", async () => {
      await service.evaluateRoute({
        messageContent: "Hello",
        routingMode: RoutingMode.LOCAL_ONLY,
      });

      expect(routingManager.evaluateRoute).toHaveBeenCalledWith(
        expect.objectContaining({ userMode: RoutingMode.LOCAL_ONLY }),
      );
    });
  });

  describe("getDecisions", () => {
    it("should return paginated decisions for thread", async () => {
      const result = await service.getDecisions("thread-1", 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(decisionsRepo.findByThreadId).toHaveBeenCalledWith("thread-1", 1, 20);
    });
  });

  describe("event subscriptions", () => {
    it("should subscribe to events on module init", async () => {
      await service.onModuleInit();

      expect(rabbitMQ.subscribe).toHaveBeenCalledTimes(3);
    });
  });
});
