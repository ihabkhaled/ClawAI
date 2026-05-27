import { SemanticIntentAnalyzerManager } from '../semantic-intent-analyzer.manager';
import { httpRequest } from '../../../../common/utilities/http-client.utility';
import { AppConfig } from '../../../../app/config/app.config';
import type { SemanticIntentAnalyzerInput } from '../../types/semantic-intent-analysis.types';

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
    ROUTING_SEMANTIC_ANALYZER_ENABLED: enabled,
    OLLAMA_SERVICE_URL: 'http://ollama-service:4008',
    OLLAMA_ROUTER_MODEL: 'qwen3:1.7b',
    OLLAMA_KEEP_ALIVE: '20m',
  };
}

function makeInput(overrides: Partial<SemanticIntentAnalyzerInput> = {}): SemanticIntentAnalyzerInput {
  return {
    threadId: 'thread-1',
    message: 'Summarize the attached contract and highlight risky clauses.',
    routingMode: 'AUTO' as never,
    keywordSignals: [
      { category: 'legal', matchedTerms: ['contract', 'clause'], confidenceBoost: 0.6 },
    ],
    ...overrides,
  };
}

const validAnalysisJson = JSON.stringify({
  primaryIntent: 'summarize_legal_document',
  secondaryIntents: ['risk_extraction'],
  taskType: 'document_analysis',
  domainTags: ['legal'],
  roleTags: ['lawyer'],
  majorTags: ['summary', 'risk'],
  modalityNeeds: ['TEXT', 'PDF'],
  expectedOutputType: 'structured_text',
  requiresSearch: false,
  requiresExtraction: true,
  requiresFileAnalysis: true,
  requiresImageAnalysis: false,
  requiresVideoAnalysis: false,
  requiresAudioTranscription: false,
  requiresSpreadsheetAnalysis: false,
  requiresToolCalling: false,
  requiresStreaming: false,
  requiresLongContext: true,
  requiresStructuredOutput: false,
  requiresJudge: true,
  requiresCompare: false,
  privacyClass: 'local',
  riskLevel: 'HIGH',
  confidence: 0.86,
  reasoningSummary: 'Legal document review with risk extraction needs.',
  uncertaintyReasons: [],
});

describe('SemanticIntentAnalyzerManager', () => {
  let manager: SemanticIntentAnalyzerManager;

  beforeEach(() => {
    mockedHttpRequest.mockReset();
    mockedGetConfig.mockReset();
    mockedGetConfig.mockReturnValue(baseConfig(true));
    manager = new SemanticIntentAnalyzerManager();
  });

  describe('feature flag gating', () => {
    it('returns SKIPPED_FLAG_DISABLED without calling Ollama when flag is off', async () => {
      mockedGetConfig.mockReturnValue(baseConfig(false));
      const record = await manager.analyze(makeInput());
      expect(record.status).toBe('SKIPPED_FLAG_DISABLED');
      expect(record.analysis).toBeNull();
      expect(mockedHttpRequest).not.toHaveBeenCalled();
    });
  });

  describe('happy path', () => {
    it('returns SUCCESS with the parsed analysis when the model returns valid JSON', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      const record = await manager.analyze(makeInput());
      expect(record.status).toBe('SUCCESS');
      expect(record.analysis?.primaryIntent).toBe('summarize_legal_document');
      expect(record.analysis?.riskLevel).toBe('HIGH');
      expect(record.analysis?.privacyClass).toBe('local');
      expect(record.attempts).toBe(1);
      expect(mockedHttpRequest).toHaveBeenCalledTimes(1);
    });

    it('extracts JSON when it is wrapped in preamble + trailing prose', async () => {
      const noisy = `Here is the analysis: \n${validAnalysisJson}\n\nLet me know if you want more detail.`;
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: noisy },
      });
      const record = await manager.analyze(makeInput());
      expect(record.status).toBe('SUCCESS');
      expect(record.analysis?.taskType).toBe('document_analysis');
    });

    it('records the routerModel and a positive durationMs', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      const record = await manager.analyze(makeInput());
      expect(record.routerModel).toBe('qwen3:1.7b');
      expect(record.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('retry on invalid JSON', () => {
    it('retries once and succeeds on the second attempt', async () => {
      mockedHttpRequest
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { response: 'not valid json at all' },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { response: validAnalysisJson },
        });
      const record = await manager.analyze(makeInput());
      expect(record.status).toBe('SUCCESS');
      expect(record.attempts).toBe(2);
    });

    it('returns INVALID_JSON_AFTER_RETRY when both attempts produce garbage', async () => {
      mockedHttpRequest
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'garbage' } })
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'still garbage' } });
      const record = await manager.analyze(makeInput());
      expect(record.status).toBe('INVALID_JSON_AFTER_RETRY');
      expect(record.analysis).toBeNull();
      expect(record.attempts).toBe(2);
      expect(record.rawOutputExcerpt).toContain('still garbage');
    });

    it('returns INVALID_JSON_AFTER_RETRY when JSON parses but fails schema validation', async () => {
      const invalid = JSON.stringify({ primaryIntent: 'x' }); // missing required fields
      mockedHttpRequest
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: invalid } })
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: invalid } });
      const record = await manager.analyze(makeInput());
      expect(record.status).toBe('INVALID_JSON_AFTER_RETRY');
    });

    it('uses the stricter retry prompt for the second attempt', async () => {
      mockedHttpRequest
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'nope' } })
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: validAnalysisJson } });
      await manager.analyze(makeInput());
      const secondCall = mockedHttpRequest.mock.calls[1][0];
      const secondPrompt = secondCall.body.prompt as string;
      expect(secondPrompt).toContain('Your previous response could not be parsed');
      expect(secondPrompt).toContain('Previous malformed output');
    });
  });

  describe('ollama failures', () => {
    it('returns OLLAMA_ERROR on non-2xx and does not retry', async () => {
      mockedHttpRequest.mockResolvedValueOnce({ ok: false, status: 500, data: { response: '' } });
      const record = await manager.analyze(makeInput());
      expect(record.status).toBe('OLLAMA_ERROR');
      expect(record.attempts).toBe(1);
      expect(record.failureReason).toContain('500');
    });

    it('returns OLLAMA_TIMEOUT when the http client throws an AbortError', async () => {
      mockedHttpRequest.mockRejectedValueOnce(new Error('Request aborted by timeout'));
      const record = await manager.analyze(makeInput());
      expect(record.status).toBe('OLLAMA_TIMEOUT');
    });

    it('returns OLLAMA_ERROR for generic thrown errors', async () => {
      mockedHttpRequest.mockRejectedValueOnce(new Error('socket hang up'));
      const record = await manager.analyze(makeInput());
      expect(record.status).toBe('OLLAMA_ERROR');
      expect(record.failureReason).toContain('socket hang up');
    });
  });

  describe('prompt assembly', () => {
    it('always includes the user message verbatim', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(makeInput({ message: 'unique-marker-XYZ123 hello world' }));
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt).toContain('unique-marker-XYZ123');
    });

    it('declares routing mode', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(makeInput({ routingMode: 'PRIVACY_FIRST' as never }));
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt).toContain('Routing mode: PRIVACY_FIRST');
    });

    it('lists keyword hints with their confidence boost and categories', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(
        makeInput({
          keywordSignals: [
            { category: 'medical', matchedTerms: ['diagnosis', 'patient'], confidenceBoost: 0.7 },
            { category: 'finance', matchedTerms: ['invoice'], confidenceBoost: 0.4 },
          ],
        }),
      );
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt).toContain('medical');
      expect(prompt).toContain('diagnosis');
      expect(prompt).toContain('finance');
      expect(prompt).toContain('invoice');
      expect(prompt).toMatch(/do NOT blindly trust/i);
    });

    it('omits the keyword block when no signals are provided', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(makeInput({ keywordSignals: [] }));
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt).not.toContain('Weak keyword hints');
    });

    it('includes follow-up signals when followUpDetected=true', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(
        makeInput({
          followUpDetected: true,
          followUpSignals: ['make_it_x', 'short_reply'],
        }),
      );
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt).toContain('make_it_x');
      expect(prompt).toContain('short_reply');
    });

    it('includes the thread summary when provided', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(
        makeInput({ threadSummary: 'Earlier we discussed migrating to Kubernetes.' }),
      );
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt).toContain('migrating to Kubernetes');
    });

    it('includes recent messages with roles', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(
        makeInput({
          recentMessages: [
            { role: 'user', content: 'Draft a Jira story about routing.' },
            { role: 'assistant', content: 'Here is the draft...' },
          ],
        }),
      );
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt).toContain('[user]');
      expect(prompt).toContain('[assistant]');
      expect(prompt).toContain('Jira story about routing');
    });

    it('caps recent message slice to the configured limit', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      const many = Array.from({ length: 30 }).map((_, i) => ({
        role: 'user' as const,
        content: `msg-${i}`,
      }));
      await manager.analyze(makeInput({ recentMessages: many }));
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      // The first messages should be dropped (only the last few survive).
      expect(prompt).not.toContain('msg-0');
      expect(prompt).toContain('msg-29');
    });

    it('truncates very long message content in the prompt', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      const huge = 'x'.repeat(20_000);
      await manager.analyze(makeInput({ message: huge }));
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt.length).toBeLessThan(20_000);
    });

    it('lists attachment metadata when present', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(
        makeInput({
          attachmentMetadata: [{ fileName: 'q3-report.pdf', mimeType: 'application/pdf' }],
        }),
      );
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt).toContain('q3-report.pdf');
      expect(prompt).toContain('application/pdf');
    });

    it('lists available workflows when supplied', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(
        makeInput({ availableWorkflowKinds: ['DIRECT_LLM', 'PDF_EXTRACTION'] }),
      );
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt).toContain('DIRECT_LLM');
      expect(prompt).toContain('PDF_EXTRACTION');
    });

    it('includes the active policy name when supplied', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(makeInput({ activePolicyName: 'enterprise-privacy-first' }));
      const prompt = mockedHttpRequest.mock.calls[0][0].body.prompt as string;
      expect(prompt).toContain('enterprise-privacy-first');
    });
  });

  describe('ollama request shape', () => {
    it('sends temperature=0 and num_predict matching constants', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(makeInput());
      const body = mockedHttpRequest.mock.calls[0][0].body;
      expect(body.options.temperature).toBe(0);
      expect(body.options.num_predict).toBe(800);
    });

    it('targets the ollama-service /generate route on the configured URL', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(makeInput());
      const call = mockedHttpRequest.mock.calls[0][0];
      expect(call.url).toBe('http://ollama-service:4008/api/v1/ollama/generate');
      expect(call.method).toBe('POST');
    });

    it('uses the configured router model', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(makeInput());
      const body = mockedHttpRequest.mock.calls[0][0].body;
      expect(body.model).toBe('qwen3:1.7b');
    });

    it('disables think mode for the analyzer', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      await manager.analyze(makeInput());
      const body = mockedHttpRequest.mock.calls[0][0].body;
      expect(body.think).toBe(false);
    });
  });

  describe('schema defaults', () => {
    it('falls back to sensible defaults for omitted optional fields', async () => {
      const minimal = JSON.stringify({
        primaryIntent: 'general_question',
        taskType: 'qna',
        expectedOutputType: 'text',
      });
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: minimal },
      });
      const record = await manager.analyze(makeInput());
      expect(record.status).toBe('SUCCESS');
      expect(record.analysis?.modalityNeeds).toEqual(['TEXT']);
      expect(record.analysis?.privacyClass).toBe('unknown');
      expect(record.analysis?.riskLevel).toBe('LOW');
      expect(record.analysis?.confidence).toBe(0.5);
      expect(record.analysis?.requiresJudge).toBe(false);
      expect(record.analysis?.secondaryIntents).toEqual([]);
    });
  });

  describe('risk + privacy edge cases', () => {
    it('preserves CRITICAL risk + local privacy from the model', async () => {
      const sensitive = JSON.stringify({
        primaryIntent: 'medical_diagnosis',
        secondaryIntents: [],
        taskType: 'health_advice',
        domainTags: ['medical'],
        roleTags: ['patient'],
        majorTags: [],
        modalityNeeds: ['TEXT'],
        expectedOutputType: 'text',
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
        requiresJudge: true,
        requiresCompare: false,
        privacyClass: 'local',
        riskLevel: 'CRITICAL',
        confidence: 0.93,
        reasoningSummary: 'Personal health question — local-only.',
        uncertaintyReasons: [],
      });
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: sensitive },
      });
      const record = await manager.analyze(makeInput({ message: 'I have a fever, what should I do?' }));
      expect(record.analysis?.riskLevel).toBe('CRITICAL');
      expect(record.analysis?.privacyClass).toBe('local');
      expect(record.analysis?.requiresJudge).toBe(true);
    });
  });

  describe('record structure', () => {
    it('reports attempts=0 when skipped by flag', async () => {
      mockedGetConfig.mockReturnValue(baseConfig(false));
      const record = await manager.analyze(makeInput());
      expect(record.attempts).toBe(0);
    });

    it('captures rawOutputExcerpt only on failure (not on success)', async () => {
      mockedHttpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: validAnalysisJson },
      });
      const record = await manager.analyze(makeInput());
      expect(record.rawOutputExcerpt).toBeUndefined();
    });
  });
});
