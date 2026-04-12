import { QualityCheckManager } from '../modules/chat-messages/managers/quality-check.manager';

describe('QualityCheckManager', () => {
  let manager: QualityCheckManager;

  beforeEach(() => {
    manager = new QualityCheckManager();
  });

  describe('checkResponseQuality', () => {
    it('should return high score for a normal response', () => {
      const result = manager.checkResponseQuality(
        'This is a perfectly fine response with enough words and content to be considered acceptable by the quality checker.',
        'Tell me something interesting',
      );
      expect(result.isWeak).toBe(false);
      expect(result.score).toBeGreaterThanOrEqual(0.4);
      expect(result.reasons).toHaveLength(0);
    });

    it('should detect response that is too short', () => {
      const result = manager.checkResponseQuality('OK', 'Write me a poem');
      expect(result.isWeak).toBe(true);
      expect(result.reasons).toContain('response_too_short');
      expect(result.reasons).toContain('too_few_words');
    });

    it('should detect error/refusal patterns', () => {
      const result = manager.checkResponseQuality(
        'I apologize, but I cannot help with that request because it goes against my guidelines.',
        'Do something for me',
      );
      expect(result.reasons).toContain('error_or_refusal_detected');
      expect(result.score).toBeLessThan(1);
    });

    it('should mark short refusals as weak', () => {
      const result = manager.checkResponseQuality('I cannot.', 'Do something for me');
      expect(result.isWeak).toBe(true);
      expect(result.reasons).toContain('error_or_refusal_detected');
      expect(result.reasons).toContain('response_too_short');
    });

    it('should detect echo responses', () => {
      const prompt = 'What is the meaning of life?';
      const result = manager.checkResponseQuality(prompt, prompt);
      expect(result.reasons).toContain('echo_response');
      expect(result.score).toBeLessThan(1);
    });

    it('should mark short echo responses as weak', () => {
      const prompt = 'Hi there';
      const result = manager.checkResponseQuality(prompt, prompt);
      expect(result.isWeak).toBe(true);
      expect(result.reasons).toContain('echo_response');
    });

    it('should detect excessive repetition', () => {
      const repeatedText = Array(20).fill('the same words repeated').join(' ');
      const result = manager.checkResponseQuality(repeatedText, 'Tell me something');
      expect(result.reasons).toContain('excessive_repetition');
    });

    it('should clamp score between 0 and 1', () => {
      const result = manager.checkResponseQuality('No', 'No');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should not flag long valid responses', () => {
      const result = manager.checkResponseQuality(
        'The theory of relativity, proposed by Albert Einstein, fundamentally changed our understanding of space, time, and gravity. It consists of two interrelated theories: special relativity and general relativity.',
        'Explain the theory of relativity',
      );
      expect(result.isWeak).toBe(false);
      expect(result.score).toBe(1);
    });
  });

  describe('shouldReRoute', () => {
    it('should not re-route when quality is acceptable', () => {
      const decision = manager.shouldReRoute({ isWeak: false, reasons: [], score: 0.8 }, 0);
      expect(decision.shouldReRoute).toBe(false);
      expect(decision.reason).toBe('quality_acceptable');
    });

    it('should recommend re-route when quality is weak', () => {
      const decision = manager.shouldReRoute(
        { isWeak: true, reasons: ['response_too_short'], score: 0.2 },
        0,
      );
      expect(decision.shouldReRoute).toBe(true);
      expect(decision.originalScore).toBe(0.2);
    });

    it('should not re-route when max attempts reached', () => {
      const decision = manager.shouldReRoute(
        { isWeak: true, reasons: ['response_too_short'], score: 0.2 },
        2,
      );
      expect(decision.shouldReRoute).toBe(false);
      expect(decision.reason).toBe('max_attempts_reached');
    });

    it('should allow re-route on first attempt', () => {
      const decision = manager.shouldReRoute(
        { isWeak: true, reasons: ['error_or_refusal_detected'], score: 0.1 },
        0,
      );
      expect(decision.shouldReRoute).toBe(true);
    });

    it('should allow re-route on second attempt', () => {
      const decision = manager.shouldReRoute(
        { isWeak: true, reasons: ['error_or_refusal_detected'], score: 0.1 },
        1,
      );
      expect(decision.shouldReRoute).toBe(true);
    });
  });
});
