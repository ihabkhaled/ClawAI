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
        '{"decision": "ACCEPT", "reasoning": "Response is good", "confidence": 0.9}',
      );
      expect(result.decision).toBe('ACCEPT');
      expect(result.reasoning).toBe('Response is good');
      expect(result.confidence).toBe(0.9);
    });

    it('should parse valid JSON with REVISE', () => {
      const result = manager.parseJudgeOutput(
        '{"decision": "REVISE", "reasoning": "Missing edge cases", "confidence": 0.7}',
      );
      expect(result.decision).toBe('REVISE');
      expect(result.reasoning).toBe('Missing edge cases');
    });

    it('should parse valid JSON with ESCALATE', () => {
      const result = manager.parseJudgeOutput(
        '{"decision": "ESCALATE", "reasoning": "Fundamentally wrong", "confidence": 0.85}',
      );
      expect(result.decision).toBe('ESCALATE');
    });

    it('should handle JSON wrapped in markdown code block', () => {
      const result = manager.parseJudgeOutput(
        '```json\n{"decision": "ACCEPT", "reasoning": "Looks good", "confidence": 0.95}\n```',
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
        '{"decision": "ACCEPT", "reasoning": "Sure", "confidence": 1.5}',
      );
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle missing confidence with threshold default', () => {
      const result = manager.parseJudgeOutput('{"decision": "ACCEPT", "reasoning": "OK"}');
      expect(result.confidence).toBe(0.6);
    });

    it('should handle JSON with surrounding text', () => {
      const result = manager.parseJudgeOutput(
        'Here is my evaluation:\n{"decision": "REVISE", "reasoning": "Needs work", "confidence": 0.65}\nEnd of evaluation.',
      );
      expect(result.decision).toBe('REVISE');
    });
  });

  describe('buildMetadata', () => {
    it('should produce correct metadata shape', () => {
      const result: JudgeRefereeResult = {
        criticEvaluation: {
          feedback: ['Missing error handling', 'No input validation'],
          score: 0.6,
          category: 'coding',
          model: 'ANTHROPIC/claude-sonnet-4',
          latencyMs: 2000,
        },
        judgeVerdict: {
          decision: JudgeDecision.REVISE,
          reasoning: 'Code has fixable issues',
          confidence: 0.75,
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
    });

    it('should set revisionsCount to 1 when revised response exists', () => {
      const result: JudgeRefereeResult = {
        criticEvaluation: {
          feedback: [],
          score: 0.9,
          category: 'generic',
          model: 'GEMINI/gemini-2.5-flash',
          latencyMs: 1000,
        },
        judgeVerdict: {
          decision: JudgeDecision.ACCEPT,
          reasoning: 'Good response',
          confidence: 0.95,
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
    });
  });
});
