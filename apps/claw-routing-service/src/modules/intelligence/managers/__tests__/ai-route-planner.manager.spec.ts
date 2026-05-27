import { AIRoutePlannerManager } from '../ai-route-planner.manager';
import { httpRequest } from '../../../../common/utilities/http-client.utility';
import { AppConfig } from '../../../../app/config/app.config';
import type {
  AIRoutePlannerInput,
  PlannerCandidate,
} from '../../types/ai-route-plan.types';
import type { SemanticIntentAnalysis } from '../../types/semantic-intent-analysis.types';

jest.mock('../../../../common/utilities/http-client.utility', () => ({
  httpRequest: jest.fn(),
}));
jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: jest.fn() },
}));

const mockedHttpRequest = httpRequest as unknown as jest.Mock;
const mockedGetConfig = AppConfig.get as jest.Mock;

function baseConfig(enabled: boolean) {
  return {
    ROUTING_AI_ROUTE_PLANNER_ENABLED: enabled,
    OLLAMA_SERVICE_URL: 'http://ollama-service:4008',
    OLLAMA_ROUTER_MODEL: 'qwen3:1.7b',
    OLLAMA_KEEP_ALIVE: '20m',
  };
}

const sampleIntent: SemanticIntentAnalysis = {
  primaryIntent: 'code_review',
  secondaryIntents: [],
  taskType: 'review',
  domainTags: ['coding'],
  roleTags: ['engineer'],
  majorTags: [],
  modalityNeeds: ['TEXT', 'CODE'],
  expectedOutputType: 'feedback',
  requiresSearch: false,
  requiresExtraction: false,
  requiresFileAnalysis: false,
  requiresImageAnalysis: false,
  requiresVideoAnalysis: false,
  requiresAudioTranscription: false,
  requiresSpreadsheetAnalysis: false,
  requiresToolCalling: false,
  requiresStreaming: false,
  requiresLongContext: false,
  requiresStructuredOutput: false,
  requiresJudge: false,
  requiresCompare: false,
  privacyClass: 'cloud',
  riskLevel: 'LOW',
  confidence: 0.85,
  reasoningSummary: 'Code review of a NestJS service.',
  uncertaintyReasons: [],
};

const candidates: PlannerCandidate[] = [
  {
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-4',
    isAvailable: true,
    isRouterOnly: false,
    isExecutionModel: true,
    privacyClass: 'cloud',
    costClass: 'MEDIUM',
    latencyClass: 'FAST',
    domainStrengths: ['coding'],
  },
  {
    provider: 'local-ollama',
    model: 'qwen2.5-coder:14b',
    isAvailable: true,
    isRouterOnly: false,
    isExecutionModel: true,
    privacyClass: 'local',
    costClass: 'FREE',
    latencyClass: 'MEDIUM',
    domainStrengths: ['coding'],
  },
  {
    provider: 'local-ollama',
    model: 'qwen3:1.7b',
    isAvailable: true,
    isRouterOnly: true,
    isExecutionModel: false,
    privacyClass: 'local',
  },
];

function makeInput(overrides: Partial<AIRoutePlannerInput> = {}): AIRoutePlannerInput {
  return {
    threadId: 'thread-1',
    message: 'Review this NestJS service and suggest refactors.',
    routingMode: 'AUTO' as never,
    semanticIntent: sampleIntent,
    candidates,
    ...overrides,
  };
}

const validPlan = JSON.stringify({
  selectedWorkflow: 'DIRECT_LLM',
  selectedProvider: 'ANTHROPIC',
  selectedModel: 'claude-sonnet-4',
  confidence: 0.9,
  reasonTags: ['coding', 'cloud'],
  routeReason: 'Coding task best handled by Claude Sonnet 4.',
  fallbackChain: [
    {
      provider: 'local-ollama',
      model: 'qwen2.5-coder:14b',
      workflow: 'DIRECT_LLM',
      reason: 'Local fallback if cloud unavailable.',
    },
  ],
  rejectedCandidates: [],
  requiresJudge: false,
  requiresSearch: false,
  requiresExtraction: false,
  requiresCompare: false,
  estimatedCostClass: 'MEDIUM',
  estimatedLatencyClass: 'FAST',
  estimatedRiskLevel: 'LOW',
  modalityNeeds: ['TEXT', 'CODE'],
});

describe('AIRoutePlannerManager', () => {
  let manager: AIRoutePlannerManager;
  beforeEach(() => {
    mockedHttpRequest.mockReset();
    mockedGetConfig.mockReset();
    mockedGetConfig.mockReturnValue(baseConfig(true));
    manager = new AIRoutePlannerManager();
  });

  it('returns SKIPPED_FLAG_DISABLED without calling Ollama when flag is off', async () => {
    mockedGetConfig.mockReturnValue(baseConfig(false));
    const r = await manager.plan(makeInput());
    expect(r.status).toBe('SKIPPED_FLAG_DISABLED');
    expect(mockedHttpRequest).not.toHaveBeenCalled();
  });

  it('returns SKIPPED_NO_ANALYSIS when semanticIntent is null', async () => {
    const r = await manager.plan(makeInput({ semanticIntent: null }));
    expect(r.status).toBe('SKIPPED_NO_ANALYSIS');
    expect(mockedHttpRequest).not.toHaveBeenCalled();
  });

  it('returns SUCCESS with the parsed plan when the model returns a valid pick from the candidate list', async () => {
    mockedHttpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: { response: validPlan } });
    const r = await manager.plan(makeInput());
    expect(r.status).toBe('SUCCESS');
    expect(r.plan?.selectedProvider).toBe('ANTHROPIC');
    expect(r.plan?.selectedModel).toBe('claude-sonnet-4');
    expect(r.validationIssues).toEqual([]);
  });

  it('rejects a plan that picks a model NOT in the candidate list and emits PRIMARY_NOT_IN_CANDIDATES', async () => {
    const badPlan = JSON.stringify({
      ...JSON.parse(validPlan),
      selectedProvider: 'OPENAI',
      selectedModel: 'gpt-5-fictional',
    });
    mockedHttpRequest
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: badPlan } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: badPlan } });
    const r = await manager.plan(makeInput());
    expect(r.status).toBe('VALIDATION_FAILED');
    expect(r.validationIssues.some((i) => i.code === 'PRIMARY_NOT_IN_CANDIDATES')).toBe(true);
  });

  it('rejects a plan that picks the router-only model as executor', async () => {
    const badPlan = JSON.stringify({
      ...JSON.parse(validPlan),
      selectedProvider: 'local-ollama',
      selectedModel: 'qwen3:1.7b',
    });
    mockedHttpRequest
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: badPlan } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: badPlan } });
    const r = await manager.plan(makeInput());
    expect(r.status).toBe('VALIDATION_FAILED');
    expect(r.validationIssues.some((i) => i.code === 'PRIMARY_IS_ROUTER_ONLY')).toBe(true);
  });

  it('rejects a cloud pick when intent privacyClass="local"', async () => {
    const localIntent = { ...sampleIntent, privacyClass: 'local' as const };
    mockedHttpRequest
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: validPlan } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: validPlan } });
    const r = await manager.plan(makeInput({ semanticIntent: localIntent }));
    expect(r.status).toBe('VALIDATION_FAILED');
    expect(r.validationIssues.some((i) => i.code === 'PRIVACY_VIOLATION')).toBe(true);
  });

  it('flags FALLBACK_NOT_IN_CANDIDATES when a fallback model is not on the list', async () => {
    const badPlan = JSON.stringify({
      ...JSON.parse(validPlan),
      fallbackChain: [
        { provider: 'OPENAI', model: 'never-shipped', workflow: 'DIRECT_LLM', reason: 'x' },
      ],
    });
    mockedHttpRequest
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: badPlan } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: badPlan } });
    const r = await manager.plan(makeInput());
    expect(r.status).toBe('VALIDATION_FAILED');
    expect(r.validationIssues.some((i) => i.code === 'FALLBACK_NOT_IN_CANDIDATES')).toBe(true);
  });

  it('returns INVALID_JSON_AFTER_RETRY when both attempts produce garbage', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'garbage 1' } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'garbage 2' } });
    const r = await manager.plan(makeInput());
    expect(r.status).toBe('INVALID_JSON_AFTER_RETRY');
    expect(r.attempts).toBe(2);
  });

  it('returns OLLAMA_ERROR on non-2xx', async () => {
    mockedHttpRequest.mockResolvedValueOnce({ ok: false, status: 500, data: { response: '' } });
    const r = await manager.plan(makeInput());
    expect(r.status).toBe('OLLAMA_ERROR');
    expect(r.attempts).toBe(1);
  });

  it('returns OLLAMA_TIMEOUT on aborted request', async () => {
    mockedHttpRequest.mockRejectedValueOnce(new Error('Request aborted by timeout'));
    const r = await manager.plan(makeInput());
    expect(r.status).toBe('OLLAMA_TIMEOUT');
  });

  it('caps the candidate list it shows the model to AI_ROUTE_PLANNER_MAX_CANDIDATES_IN_PROMPT', async () => {
    const many: PlannerCandidate[] = Array.from({ length: 80 }).map((_, i) => ({
      provider: `P${i}`,
      model: `m${i}`,
      isAvailable: true,
      isRouterOnly: false,
      isExecutionModel: true,
    }));
    mockedHttpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: { response: validPlan } });
    await manager.plan(makeInput({ candidates: many }));
    const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
    expect(prompt).toContain('P0/m0');
    // The default cap is 30 — anything beyond should be absent.
    expect(prompt).not.toContain('P40/m40');
  });

  it('omits router-only + non-execution models from the candidate prompt', async () => {
    mockedHttpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: { response: validPlan } });
    await manager.plan(makeInput());
    const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
    // The router-only qwen3:1.7b candidate should be filtered out of the prompt.
    expect(prompt).not.toContain('qwen3:1.7b');
  });

  it('lists DOWN providers when providerHealth is supplied', async () => {
    mockedHttpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: { response: validPlan } });
    await manager.plan(
      makeInput({
        providerHealth: { ANTHROPIC: true, OPENAI: false, GEMINI: false },
      }),
    );
    const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
    expect(prompt).toMatch(/Providers currently DOWN:.*OPENAI/);
    expect(prompt).toMatch(/Providers currently DOWN:.*GEMINI/);
  });

  it('sends temperature=0 and a 1200 num_predict to Ollama', async () => {
    mockedHttpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: { response: validPlan } });
    await manager.plan(makeInput());
    const body = mockedHttpRequest.mock.calls[0][0].body;
    expect(body.options.temperature).toBe(0);
    expect(body.options.num_predict).toBe(1200);
    expect(body.think).toBe(false);
  });

  it('targets the configured Ollama service URL', async () => {
    mockedHttpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: { response: validPlan } });
    await manager.plan(makeInput());
    expect(mockedHttpRequest.mock.calls[0][0].url).toBe(
      'http://ollama-service:4008/api/v1/ollama/generate',
    );
  });

  it('uses the stricter retry prompt on the second attempt', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'nope' } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: validPlan } });
    await manager.plan(makeInput());
    const secondPrompt = mockedHttpRequest.mock.calls[1][0].body.prompt as string;
    expect(secondPrompt).toContain('Your previous response could not be parsed');
  });
});
