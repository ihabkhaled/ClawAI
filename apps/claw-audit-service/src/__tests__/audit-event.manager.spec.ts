import { AuditEventManager } from "@modules/audits/managers/audit-event.manager";
import { type AuditsService } from "@modules/audits/services/audits.service";
import { type UsageService } from "@modules/audits/services/usage.service";
import { EventPattern } from "@claw/shared-types";

describe("AuditEventManager", () => {
  let manager: AuditEventManager;
  let auditsService: jest.Mocked<AuditsService>;
  let usageService: jest.Mocked<UsageService>;
  let rabbitMQService: { subscribe: jest.Mock; publish: jest.Mock };

  beforeEach(() => {
    auditsService = {
      createAuditLog: jest.fn().mockResolvedValue({ _id: "audit-1" }),
      getAuditLogs: jest.fn(),
      getAuditStats: jest.fn(),
    } as unknown as jest.Mocked<AuditsService>;

    usageService = {
      createUsageEntry: jest.fn().mockResolvedValue({ _id: "usage-1" }),
      getUsageEntries: jest.fn(),
      getUsageSummary: jest.fn(),
      getCostSummary: jest.fn(),
      getLatencySummary: jest.fn(),
    } as unknown as jest.Mocked<UsageService>;

    rabbitMQService = {
      subscribe: jest.fn().mockResolvedValue(),
      publish: jest.fn().mockResolvedValue(),
    };

    manager = new AuditEventManager(
      rabbitMQService as never,
      auditsService,
      usageService,
    );
  });

  describe("handleEvent", () => {
    it("should handle user.login event", async () => {
      const payload = {
        userId: "user-1",
        email: "test@test.com",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla",
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.USER_LOGIN, payload);

      expect(auditsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "LOGIN",
          entityType: "user",
          severity: "LOW",
        }),
      );
    });

    it("should handle user.logout event", async () => {
      const payload = {
        userId: "user-1",
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.USER_LOGOUT, payload);

      expect(auditsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "LOGOUT",
          entityType: "user",
        }),
      );
    });

    it("should handle connector.created event", async () => {
      const payload = {
        connectorId: "conn-1",
        provider: "openai",
        name: "My Connector",
        userId: "user-1",
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.CONNECTOR_CREATED, payload);

      expect(auditsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "CREATE",
          entityType: "connector",
          entityId: "conn-1",
          severity: "MEDIUM",
        }),
      );
    });

    it("should handle connector.updated event", async () => {
      const payload = {
        connectorId: "conn-1",
        provider: "openai",
        changes: { name: "Updated" },
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.CONNECTOR_UPDATED, payload);

      expect(auditsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "UPDATE",
          entityType: "connector",
          entityId: "conn-1",
          severity: "MEDIUM",
        }),
      );
    });

    it("should handle connector.deleted event", async () => {
      const payload = {
        connectorId: "conn-1",
        provider: "openai",
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.CONNECTOR_DELETED, payload);

      expect(auditsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DELETE",
          entityType: "connector",
          severity: "HIGH",
        }),
      );
    });

    it("should handle connector.synced event", async () => {
      const payload = {
        connectorId: "conn-1",
        provider: "openai",
        modelsDiscovered: 5,
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.CONNECTOR_SYNCED, payload);

      expect(auditsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CONNECTOR_SYNC",
          entityType: "connector",
          entityId: "conn-1",
        }),
      );
    });

    it("should handle connector.health_checked event", async () => {
      const payload = {
        connectorId: "conn-1",
        provider: "openai",
        status: "active",
        latencyMs: 120,
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.CONNECTOR_HEALTH_CHECKED, payload);

      expect(auditsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ACCESS",
          entityType: "connector",
          entityId: "conn-1",
        }),
      );
    });

    it("should handle routing.decision_made event", async () => {
      const payload = {
        messageId: "msg-1",
        threadId: "thread-1",
        routingMode: "cost_optimized",
        selectedConnectorId: "conn-1",
        selectedModelId: "gpt-4",
        reason: "Lowest cost",
        candidateCount: 3,
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.ROUTING_DECISION_MADE, payload);

      expect(auditsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ROUTING_DECISION",
          entityType: "message",
          entityId: "msg-1",
        }),
      );
    });

    it("should handle message.completed event and create both audit log and usage entry", async () => {
      const payload = {
        messageId: "msg-1",
        threadId: "thread-1",
        assistantMessageId: "asst-1",
        provider: "OPENAI",
        model: "gpt-4",
        inputTokens: 200,
        outputTokens: 300,
        latencyMs: 1200,
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.MESSAGE_COMPLETED, payload);

      expect(auditsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ACCESS",
          entityType: "message",
          entityId: "msg-1",
        }),
      );

      expect(usageService.createUsageEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: "llm_tokens",
          action: "message.completed",
          quantity: 500,
          unit: "tokens",
          metadata: expect.objectContaining({
            model: "gpt-4",
            latencyMs: 1200,
          }),
        }),
      );
    });

    it("should handle memory.extracted event", async () => {
      const payload = {
        memoryId: "mem-1",
        threadId: "thread-1",
        userId: "user-1",
        type: "fact",
        content: "The user prefers dark mode",
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.MEMORY_EXTRACTED, payload);

      expect(auditsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "CREATE",
          entityType: "memory",
          entityId: "mem-1",
        }),
      );
    });

    it("should warn on unhandled event pattern", async () => {
      const warnSpy = jest.spyOn(manager["logger"], "warn").mockImplementation();
      await manager.handleEvent("unknown.event", {});
      expect(warnSpy).toHaveBeenCalledWith("Unhandled event pattern: unknown.event");
      warnSpy.mockRestore();
    });

    it("should create usage entry with correct token count for message.completed", async () => {
      const payload = {
        messageId: "msg-2",
        threadId: "thread-2",
        assistantMessageId: "asst-2",
        provider: "ANTHROPIC",
        model: "claude-3",
        inputTokens: 400,
        outputTokens: 600,
        latencyMs: 800,
        timestamp: new Date().toISOString(),
      };

      await manager.handleEvent(EventPattern.MESSAGE_COMPLETED, payload);

      expect(usageService.createUsageEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 1000,
        }),
      );
    });
  });
});
