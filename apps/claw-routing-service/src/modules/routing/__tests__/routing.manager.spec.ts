import { RoutingManager } from '../managers/routing.manager';
import { type OllamaRouterManager } from '../managers/ollama-router.manager';
import { type RoutingPoliciesRepository } from '../repositories/routing-policies.repository';
import { RoutingMode } from '../../../generated/prisma';
import { type RoutingContext } from '../types/routing.types';

const mockPoliciesRepo = (): Partial<Record<keyof RoutingPoliciesRepository, jest.Mock>> => ({
  findActivePolicies: jest.fn().mockResolvedValue([]),
});

const baseContext: RoutingContext = {
  message: 'Hello, how are you?',
  threadId: 'thread-1',
  connectorHealth: {
    OPENAI: true,
    ANTHROPIC: true,
  },
  runtimeHealth: {
    OLLAMA: true,
  },
};

describe('RoutingManager', () => {
  let manager: RoutingManager;

  beforeEach(() => {
    const policiesRepo = mockPoliciesRepo();
    const ollamaRouter = { route: jest.fn().mockResolvedValue(null) };
    const promptBuilder = {
      fetchInstalledModels: jest.fn().mockResolvedValue([]),
      invalidateCache: jest.fn(),
    };
    manager = new RoutingManager(
      policiesRepo as unknown as RoutingPoliciesRepository,
      ollamaRouter as unknown as OllamaRouterManager,
      promptBuilder as any,
    );
  });

  describe('evaluateRoute - AUTO', () => {
    it('should route short messages to local when runtime is healthy', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.AUTO);
      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('short_message');
    });

    it('should route long messages to cloud', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'a'.repeat(600),
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.AUTO);
      expect(result.selectedProvider).toBe('ANTHROPIC');
      expect(result.reasonTags).toContain('cloud_preferred');
    });

    it('should default to AUTO when no userMode specified', async () => {
      const context: RoutingContext = { ...baseContext };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.AUTO);
    });
  });

  describe('evaluateRoute - MANUAL_MODEL', () => {
    it('should use forced model when specified', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.MANUAL_MODEL,
        forcedModel: 'gpt-4o',
      };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.MANUAL_MODEL);
      expect(result.selectedModel).toBe('gpt-4o');
      expect(result.confidence).toBe(1.0);
      expect(result.reasonTags).toContain('user_forced');
    });

    it('should infer Anthropic provider from claude model name', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.MANUAL_MODEL,
        forcedModel: 'claude-sonnet-4',
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('ANTHROPIC');
    });
  });

  describe('evaluateRoute - LOCAL_ONLY', () => {
    it('should always select local provider', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.LOCAL_ONLY,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.privacyClass).toBe('local');
      expect(result.costClass).toBe('free');
    });

    it('should not include cloud providers in fallback chain', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.LOCAL_ONLY,
      };

      const result = await manager.evaluateRoute(context);

      const cloudFallbacks = result.fallbackChain.filter((f) => f.provider !== 'local-ollama');
      expect(cloudFallbacks).toHaveLength(0);
    });
  });

  describe('evaluateRoute - PRIVACY_FIRST', () => {
    it('should prefer local when runtime is healthy', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.PRIVACY_FIRST,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('local_preferred');
    });

    it('should fall back to cloud when local is unavailable', async () => {
      const context: RoutingContext = {
        ...baseContext,
        runtimeHealth: { OLLAMA: false },
        userMode: RoutingMode.PRIVACY_FIRST,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('ANTHROPIC');
      expect(result.reasonTags).toContain('local_unavailable');
    });
  });

  describe('evaluateRoute - LOW_LATENCY', () => {
    it('should select fastest model', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.LOW_LATENCY,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('OPENAI');
      expect(result.reasonTags).toContain('fastest_model');
    });
  });

  describe('evaluateRoute - HIGH_REASONING', () => {
    it('should select strongest reasoning model', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.HIGH_REASONING,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('ANTHROPIC');
      expect(result.selectedModel).toBe('claude-opus-4');
      expect(result.reasonTags).toContain('strongest_model');
    });
  });

  describe('evaluateRoute - COST_SAVER', () => {
    it('should prefer free local model when available', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.COST_SAVER,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.costClass).toBe('free');
    });

    it('should select cheapest cloud when local unavailable', async () => {
      const context: RoutingContext = {
        ...baseContext,
        runtimeHealth: { OLLAMA: false },
        userMode: RoutingMode.COST_SAVER,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('OPENAI');
      expect(result.costClass).toBe('low');
    });
  });

  describe('category detection methods', () => {
    it('should detect coding requests', () => {
      expect(manager.detectCodingRequest('fix this bug in my code')).toBe(true);
      expect(manager.detectCodingRequest('write a function to sort')).toBe(true);
      expect(manager.detectCodingRequest('setup webpack config')).toBe(true);
      expect(manager.detectCodingRequest('configure Prisma schema')).toBe(true);
      expect(manager.detectCodingRequest('tell me a joke')).toBe(false);
    });

    it('should detect infrastructure requests', () => {
      expect(manager.detectInfrastructureRequest('deploy to kubernetes cluster')).toBe(true);
      expect(manager.detectInfrastructureRequest('configure terraform modules')).toBe(true);
      expect(manager.detectInfrastructureRequest('setup AWS VPC')).toBe(true);
      expect(manager.detectInfrastructureRequest('tell me a joke')).toBe(false);
    });

    it('should detect data analysis requests', () => {
      expect(manager.detectDataAnalysisRequest('create a pivot table')).toBe(true);
      expect(manager.detectDataAnalysisRequest('build an ETL pipeline')).toBe(true);
      expect(manager.detectDataAnalysisRequest('analyze this dataset')).toBe(true);
      expect(manager.detectDataAnalysisRequest('tell me a joke')).toBe(false);
    });

    it('should detect business requests', () => {
      expect(manager.detectBusinessRequest('write a business case')).toBe(true);
      expect(manager.detectBusinessRequest('analyze conversion rate')).toBe(true);
      expect(manager.detectBusinessRequest('prepare a pitch deck')).toBe(true);
      expect(manager.detectBusinessRequest('tell me a joke')).toBe(false);
    });

    it('should detect creative writing requests', () => {
      expect(manager.detectCreativeWritingRequest('write a blog post')).toBe(true);
      expect(manager.detectCreativeWritingRequest('compose a poem')).toBe(true);
      expect(manager.detectCreativeWritingRequest('draft a newsletter')).toBe(true);
      expect(manager.detectCreativeWritingRequest('fix this code bug')).toBe(false);
    });

    it('should detect security requests', () => {
      expect(manager.detectSecurityRequest('check for XSS vulnerabilities')).toBe(true);
      expect(manager.detectSecurityRequest('perform a penetration test')).toBe(true);
      expect(manager.detectSecurityRequest('review OWASP top 10')).toBe(true);
      expect(manager.detectSecurityRequest('tell me a joke')).toBe(false);
    });

    it('should detect medical requests', () => {
      expect(manager.detectMedicalRequest('review patient diagnosis')).toBe(true);
      expect(manager.detectMedicalRequest('check medication dosage')).toBe(true);
      expect(manager.detectMedicalRequest('tell me a joke')).toBe(false);
    });

    it('should detect legal requests', () => {
      expect(manager.detectLegalRequest('review this contract clause')).toBe(true);
      expect(manager.detectLegalRequest('check GDPR compliance')).toBe(true);
      expect(manager.detectLegalRequest('tell me a joke')).toBe(false);
    });

    it('should detect translation requests', () => {
      expect(manager.detectTranslationRequest('translate this to French')).toBe(true);
      expect(manager.detectTranslationRequest('localize the UI strings')).toBe(true);
      expect(manager.detectTranslationRequest('tell me a joke')).toBe(false);
    });

    it('should detect privacy-sensitive requests', () => {
      expect(manager.detectPrivacySensitive('analyze my medical records')).toBe(true);
      expect(manager.detectPrivacySensitive('review my tax return')).toBe(true);
      expect(manager.detectPrivacySensitive('my social security number')).toBe(true);
      expect(manager.detectPrivacySensitive('credit card details')).toBe(true);
      expect(manager.detectPrivacySensitive('what is the weather today')).toBe(false);
    });
  });

  describe('privacy-enforced routing in AUTO mode', () => {
    it('should force local when privacy-sensitive content detected', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'analyze my patient diagnosis records',
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('privacy_enforced');
      expect(result.privacyClass).toBe('local');
      // Should not have cloud fallbacks
      const cloudFallbacks = result.fallbackChain.filter((f) => f.provider !== 'local-ollama');
      expect(cloudFallbacks).toHaveLength(0);
    });
  });

  describe('buildFallbackChain', () => {
    it('should include cloud fallbacks for local primary', () => {
      const primary = { provider: 'local-ollama', model: 'llama3:latest' };

      const chain = manager.buildFallbackChain(primary, baseContext);

      expect(chain.length).toBeGreaterThan(0);
      expect(chain.some((f) => f.provider === 'ANTHROPIC')).toBe(true);
    });

    it('should include local fallback for cloud primary', () => {
      const primary = { provider: 'OPENAI', model: 'gpt-4o-mini' };

      const chain = manager.buildFallbackChain(primary, baseContext);

      expect(chain.some((f) => f.provider === 'local-ollama')).toBe(true);
    });

    it('should only include healthy providers in chain', () => {
      const context: RoutingContext = {
        ...baseContext,
        connectorHealth: { OPENAI: false, ANTHROPIC: true },
        runtimeHealth: { OLLAMA: false },
      };
      const primary = { provider: 'ANTHROPIC', model: 'claude-sonnet-4' };

      const chain = manager.buildFallbackChain(primary, context);

      expect(chain.every((f) => f.provider !== 'OPENAI')).toBe(true);
      expect(chain.every((f) => f.provider !== 'local-ollama')).toBe(true);
    });
  });
});
