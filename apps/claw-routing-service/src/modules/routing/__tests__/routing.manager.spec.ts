import { RoutingManager } from "../managers/routing.manager";
import { RoutingPoliciesRepository } from "../repositories/routing-policies.repository";
import { RoutingMode } from "../../../generated/prisma";
import { type RoutingContext } from "../types/routing.types";

const mockPoliciesRepo = (): Partial<Record<keyof RoutingPoliciesRepository, jest.Mock>> => ({
  findActivePolicies: jest.fn().mockResolvedValue([]),
});

const baseContext: RoutingContext = {
  message: "Hello, how are you?",
  threadId: "thread-1",
  connectorHealth: {
    "openai": true,
    "anthropic": true,
  },
  runtimeHealth: {
    "OLLAMA": true,
  },
};

describe("RoutingManager", () => {
  let manager: RoutingManager;

  beforeEach(() => {
    const policiesRepo = mockPoliciesRepo();
    manager = new RoutingManager(
      policiesRepo as unknown as RoutingPoliciesRepository,
    );
  });

  describe("evaluateRoute - AUTO", () => {
    it("should route short messages to local when runtime is healthy", async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.AUTO);
      expect(result.selectedProvider).toBe("local-ollama");
      expect(result.reasonTags).toContain("short_message");
    });

    it("should route long messages to cloud", async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: "a".repeat(600),
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.AUTO);
      expect(result.selectedProvider).toBe("anthropic");
      expect(result.reasonTags).toContain("cloud_preferred");
    });

    it("should default to AUTO when no userMode specified", async () => {
      const context: RoutingContext = { ...baseContext };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.AUTO);
    });
  });

  describe("evaluateRoute - MANUAL_MODEL", () => {
    it("should use forced model when specified", async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.MANUAL_MODEL,
        forcedModel: "gpt-4o",
      };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.MANUAL_MODEL);
      expect(result.selectedModel).toBe("gpt-4o");
      expect(result.confidence).toBe(1.0);
      expect(result.reasonTags).toContain("user_forced");
    });

    it("should infer Anthropic provider from claude model name", async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.MANUAL_MODEL,
        forcedModel: "claude-sonnet-4",
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe("anthropic");
    });
  });

  describe("evaluateRoute - LOCAL_ONLY", () => {
    it("should always select local provider", async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.LOCAL_ONLY,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe("local-ollama");
      expect(result.privacyClass).toBe("local");
      expect(result.costClass).toBe("free");
    });

    it("should not include cloud providers in fallback chain", async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.LOCAL_ONLY,
      };

      const result = await manager.evaluateRoute(context);

      const cloudFallbacks = result.fallbackChain.filter(
        (f) => f.provider !== "local-ollama",
      );
      expect(cloudFallbacks).toHaveLength(0);
    });
  });

  describe("evaluateRoute - PRIVACY_FIRST", () => {
    it("should prefer local when runtime is healthy", async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.PRIVACY_FIRST,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe("local-ollama");
      expect(result.reasonTags).toContain("local_preferred");
    });

    it("should fall back to cloud when local is unavailable", async () => {
      const context: RoutingContext = {
        ...baseContext,
        runtimeHealth: { "OLLAMA": false },
        userMode: RoutingMode.PRIVACY_FIRST,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe("anthropic");
      expect(result.reasonTags).toContain("local_unavailable");
    });
  });

  describe("evaluateRoute - LOW_LATENCY", () => {
    it("should select fastest model", async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.LOW_LATENCY,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe("openai");
      expect(result.reasonTags).toContain("fastest_model");
    });
  });

  describe("evaluateRoute - HIGH_REASONING", () => {
    it("should select strongest reasoning model", async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.HIGH_REASONING,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe("anthropic");
      expect(result.selectedModel).toBe("claude-opus-4");
      expect(result.reasonTags).toContain("strongest_model");
    });
  });

  describe("evaluateRoute - COST_SAVER", () => {
    it("should prefer free local model when available", async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.COST_SAVER,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe("local-ollama");
      expect(result.costClass).toBe("free");
    });

    it("should select cheapest cloud when local unavailable", async () => {
      const context: RoutingContext = {
        ...baseContext,
        runtimeHealth: { "OLLAMA": false },
        userMode: RoutingMode.COST_SAVER,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe("openai");
      expect(result.costClass).toBe("low");
    });
  });

  describe("buildFallbackChain", () => {
    it("should include cloud fallbacks for local primary", () => {
      const primary = { provider: "local-ollama", model: "llama3:latest" };

      const chain = manager.buildFallbackChain(primary, baseContext);

      expect(chain.length).toBeGreaterThan(0);
      expect(chain.some((f) => f.provider === "anthropic")).toBe(true);
    });

    it("should include local fallback for cloud primary", () => {
      const primary = { provider: "openai", model: "gpt-4o-mini" };

      const chain = manager.buildFallbackChain(primary, baseContext);

      expect(chain.some((f) => f.provider === "local-ollama")).toBe(true);
    });

    it("should only include healthy providers in chain", () => {
      const context: RoutingContext = {
        ...baseContext,
        connectorHealth: { "openai": false, "anthropic": true },
        runtimeHealth: { "OLLAMA": false },
      };
      const primary = { provider: "anthropic", model: "claude-sonnet-4" };

      const chain = manager.buildFallbackChain(primary, context);

      expect(chain.every((f) => f.provider !== "openai")).toBe(true);
      expect(chain.every((f) => f.provider !== "local-ollama")).toBe(true);
    });
  });
});
