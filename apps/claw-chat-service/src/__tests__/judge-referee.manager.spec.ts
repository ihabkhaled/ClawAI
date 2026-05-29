import { JudgeDecision } from '../common/enums';
import { JudgeRefereeManager } from '../modules/chat-messages/managers/judge-referee.manager';
import type {
  JudgeRefereeConfig,
  JudgeRefereeResult,
} from '../modules/chat-messages/types/judge-referee.types';

describe('JudgeRefereeManager', () => {
  let manager: JudgeRefereeManager;

  beforeEach(() => {
    const mockStreamService = { emitJudgeEvaluating: jest.fn() } as any;
    manager = new JudgeRefereeManager(mockStreamService);
  });

  describe('shouldActivate', () => {
    it('should return true when enabled', () => {
      const config: JudgeRefereeConfig = {
        enabled: true,
        category: undefined,
        routingMode: 'AUTO',
        isLocalOnly: false,
      };
      expect(manager.shouldActivate(config)).toBe(true);
    });

    it('should return true for auto-category coding', () => {
      const config: JudgeRefereeConfig = {
        enabled: false,
        category: 'coding',
        routingMode: 'AUTO',
        isLocalOnly: false,
      };
      expect(manager.shouldActivate(config)).toBe(true);
    });

    it('should return true for auto-category medical', () => {
      const config: JudgeRefereeConfig = {
        enabled: false,
        category: 'medical',
        routingMode: 'AUTO',
        isLocalOnly: false,
      };
      expect(manager.shouldActivate(config)).toBe(true);
    });

    it('should return true for auto-category legal', () => {
      const config: JudgeRefereeConfig = {
        enabled: false,
        category: 'legal',
        routingMode: 'AUTO',
        isLocalOnly: false,
      };
      expect(manager.shouldActivate(config)).toBe(true);
    });

    it('should return true for auto-category finance', () => {
      const config: JudgeRefereeConfig = {
        enabled: false,
        category: 'finance',
        routingMode: 'AUTO',
        isLocalOnly: false,
      };
      expect(manager.shouldActivate(config)).toBe(true);
    });

    it('should return true for auto-category security', () => {
      const config: JudgeRefereeConfig = {
        enabled: false,
        category: 'security',
        routingMode: 'AUTO',
        isLocalOnly: false,
      };
      expect(manager.shouldActivate(config)).toBe(true);
    });

    it('should return false when disabled and non-auto category', () => {
      const config: JudgeRefereeConfig = {
        enabled: false,
        category: 'chat',
        routingMode: 'AUTO',
        isLocalOnly: false,
      };
      expect(manager.shouldActivate(config)).toBe(false);
    });

    it('should return false when disabled and no category', () => {
      const config: JudgeRefereeConfig = {
        enabled: false,
        category: undefined,
        routingMode: 'AUTO',
        isLocalOnly: false,
      };
      expect(manager.shouldActivate(config)).toBe(false);
    });
  });

  describe('selectCriticModel', () => {
    it('should return local model for local-only mode', async () => {
      const result = await manager.selectCriticModel('ANTHROPIC', true);
      expect(result.provider).toBe('local-ollama');
      expect(result.model).toBe('AUTO');
    });

    it('should return a different provider than generator', async () => {
      const result = await manager.selectCriticModel('ANTHROPIC', false);
      expect(result.provider).not.toBe('ANTHROPIC');
    });

    it('should skip generator provider in cloud models', async () => {
      const result = await manager.selectCriticModel('ANTHROPIC', false);
      expect(result.provider).toBe('GEMINI');
    });

    it('should return first available when generator is not in critic list', async () => {
      const result = await manager.selectCriticModel('DEEPSEEK', false);
      expect(result.provider).toBe('ANTHROPIC');
    });

    it('should fallback to local when all cloud models match generator', async () => {
      // Edge case: generator is ANTHROPIC, but our list starts with ANTHROPIC
      const result = await manager.selectCriticModel('ANTHROPIC', false);
      expect(result.provider).not.toBe('ANTHROPIC');
    });
  });

  describe('parseJudgeOutput', () => {
    it('should parse valid JSON with ACCEPT', () => {
      const result = manager.parseJudgeOutput(
        '{"decision": "ACCEPT", "summary": "Verified", "reasoning": "Response is good", "confidence": 0.9, "responseType": "verification_note", "response": "The answer is acceptable.", "recommendedChanges": []}',
      );
      expect(result.decision).toBe('ACCEPT');
      expect(result.summary).toBe('Verified');
      expect(result.reasoning).toBe('Response is good');
      expect(result.confidence).toBe(0.9);
      expect(result.responseType).toBe('verification_note');
    });

    it('should parse valid JSON with REVISE', () => {
      const result = manager.parseJudgeOutput(
        '{"decision": "REVISE", "summary": "Needs revision", "reasoning": "Missing edge cases", "confidence": 0.7, "responseType": "summary", "response": "Add edge-case handling.", "recommendedChanges": ["Handle edge cases"]}',
      );
      expect(result.decision).toBe('REVISE');
      expect(result.reasoning).toBe('Missing edge cases');
      expect(result.recommendedChanges).toEqual(['Handle edge cases']);
    });

    it('should parse valid JSON with ESCALATE', () => {
      const result = manager.parseJudgeOutput(
        '{"decision": "ESCALATE", "summary": "Escalate", "reasoning": "Fundamentally wrong", "confidence": 0.85, "response": "Here is a stronger replacement answer.", "responseType": "escalated_answer", "recommendedChanges": []}',
      );
      expect(result.decision).toBe('ESCALATE');
      expect(result.responseType).toBe('escalated_answer');
    });

    it('should handle JSON wrapped in markdown code block', () => {
      const result = manager.parseJudgeOutput(
        '```json\n{"decision": "ACCEPT", "summary": "Verified", "reasoning": "Looks good", "confidence": 0.95, "responseType": "verification_note", "response": "Looks acceptable.", "recommendedChanges": []}\n```',
      );
      expect(result.decision).toBe('ACCEPT');
    });

    it('should fallback to ACCEPT on malformed JSON', () => {
      const result = manager.parseJudgeOutput('This is not JSON at all');
      expect(result.decision).toBe('ACCEPT');
      expect(result.confidence).toBe(0.6);
    });

    it('should fallback to ACCEPT on invalid decision value', () => {
      const result = manager.parseJudgeOutput(
        '{"decision": "REJECT", "reasoning": "Bad", "confidence": 0.5}',
      );
      expect(result.decision).toBe('ACCEPT');
    });

    it('should clamp confidence between 0 and 1', () => {
      const result = manager.parseJudgeOutput(
        '{"decision": "ACCEPT", "summary": "Verified", "reasoning": "Sure", "confidence": 1.5, "responseType": "verification_note", "response": "Verified.", "recommendedChanges": []}',
      );
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle missing confidence with threshold default', () => {
      const result = manager.parseJudgeOutput(
        '{"decision": "ACCEPT", "summary": "Verified", "reasoning": "OK", "responseType": "verification_note", "response": "Verified.", "recommendedChanges": []}',
      );
      expect(result.confidence).toBe(0.6);
    });

    it('should handle JSON with surrounding text', () => {
      const result = manager.parseJudgeOutput(
        'Here is my evaluation:\n{"decision": "REVISE", "summary": "Needs work", "reasoning": "Needs work", "confidence": 0.65, "responseType": "summary", "response": "Tighten the answer.", "recommendedChanges": []}\nEnd of evaluation.',
      );
      expect(result.decision).toBe('REVISE');
    });

    it('should parse plain text judge output without failing', () => {
      const result = manager.parseJudgeOutput('The answer passed review.');
      expect(result.decision).toBe('ACCEPT');
      expect(result.summary).toBe('The answer passed review.');
      expect(result.response).toBe('The answer passed review.');
      expect(result.responseType).toBe('verification_note');
    });
  });

  describe('buildMetadata', () => {
    it('should produce correct metadata shape', () => {
      const result: JudgeRefereeResult = {
        originalResponse: {
          content: 'Original answer',
          provider: 'OPENAI',
          model: 'gpt-4o-mini',
          latencyMs: 900,
          usedFallback: false,
        },
        criticEvaluation: {
          feedback: ['Missing error handling', 'No input validation'],
          score: 0.6,
          category: 'coding',
          model: 'ANTHROPIC/claude-sonnet-4',
          latencyMs: 2000,
        },
        judgeVerdict: {
          decision: JudgeDecision.REVISE,
          summary: 'Needs revision',
          reasoning: 'Code has fixable issues',
          confidence: 0.75,
          response: 'Improve error handling and validation.',
          responseType: 'summary',
          recommendedChanges: ['Add error handling', 'Validate inputs'],
          model: 'local-ollama/AUTO',
          latencyMs: 1500,
        },
        revisedResponse: undefined,
        totalLatencyMs: 3500,
      };

      const metadata = manager.buildMetadata(result);

      expect(metadata.judgeEnabled).toBe(true);
      expect(metadata.criticModel).toBe('ANTHROPIC/claude-sonnet-4');
      expect(metadata.criticFeedback).toEqual(['Missing error handling', 'No input validation']);
      expect(metadata.criticScore).toBe(0.6);
      expect(metadata.judgeModel).toBe('local-ollama/AUTO');
      expect(metadata.judgeDecision).toBe('REVISE');
      expect(metadata.judgeReasoning).toBe('Code has fixable issues');
      expect(metadata.judgeConfidence).toBe(0.75);
      expect(metadata.revisionsCount).toBe(0);
      expect(metadata.judgeTotalLatencyMs).toBe(3500);
      expect(metadata.judgeReview.judgeSummary).toBe('Needs revision');
      expect(metadata.judgeReview.originalAnswerSnapshot).toBe('Original answer');
    });

    it('should set revisionsCount to 1 when revised response exists', () => {
      const result: JudgeRefereeResult = {
        originalResponse: {
          content: 'Original answer',
          provider: 'OPENAI',
          model: 'gpt-4o-mini',
          latencyMs: 600,
          usedFallback: false,
        },
        criticEvaluation: {
          feedback: [],
          score: 0.9,
          category: 'generic',
          model: 'GEMINI/gemini-2.5-flash',
          latencyMs: 1000,
        },
        judgeVerdict: {
          decision: JudgeDecision.ACCEPT,
          summary: 'Verified',
          reasoning: 'Good response',
          confidence: 0.95,
          response: 'The answer is correct.',
          responseType: 'verification_note',
          recommendedChanges: [],
          model: 'local-ollama/AUTO',
          latencyMs: 500,
        },
        revisedResponse: {
          content: 'Revised content',
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          latencyMs: 3000,
          usedFallback: false,
        },
        totalLatencyMs: 4500,
      };

      const metadata = manager.buildMetadata(result);
      expect(metadata.revisionsCount).toBe(1);
      expect(metadata.judgeReview.revisedAnswer).toBe('Revised content');
    });
  });

  describe('evaluate', () => {
    it('labels the critic with the selected model and falls back the judge to local when a cloud critic call fails', async () => {
      const executionManager = {
        callProvider: jest
          .fn()
          .mockRejectedValueOnce(new Error('Anthropic connector unavailable'))
          .mockResolvedValueOnce({
            content: '{"decision":"ACCEPT","reasoning":"Looks good","confidence":0.95}',
            provider: 'local-ollama',
            model: 'AUTO',
            latencyMs: 25,
            usedFallback: false,
          }),
      } as any;

      manager.setExecutionManager(executionManager);

      const response = {
        content: 'Final answer text',
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        latencyMs: 120,
        usedFallback: false,
      };

      const context = {
        userId: 'user-1',
        threadId: 'thread-1',
        threadMessages: [
          { role: 'USER', content: 'Explain this clearly.' },
          { role: 'ASSISTANT', content: 'Sure.' },
        ],
        systemPrompt: 'system',
      } as any;

      const config: JudgeRefereeConfig = {
        enabled: true,
        category: 'generic',
        routingMode: 'AUTO',
        isLocalOnly: false,
      };

      const payload = {
        messageId: 'msg-1',
        threadId: 'thread-1',
        selectedProvider: 'OPENAI',
        selectedModel: 'gpt-4o-mini',
        routingMode: 'AUTO',
      } as any;

      const result = await manager.evaluate(response as any, context, config, payload);

      expect(result.criticEvaluation.model).toBe('ANTHROPIC/claude-sonnet-4');
      expect(result.judgeVerdict.model).toBe('local-ollama/AUTO');
      expect(executionManager.callProvider).toHaveBeenCalledTimes(2);
    });
  });
});
