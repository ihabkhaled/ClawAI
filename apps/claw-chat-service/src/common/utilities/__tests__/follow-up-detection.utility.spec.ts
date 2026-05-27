import { detectFollowUp } from '../follow-up-detection.utility';

describe('detectFollowUp', () => {
  describe('positive — explicit imperatives', () => {
    it.each([
      'continue',
      'Continue',
      'CONTINUE',
      'continue.',
      'continue!',
      'more',
      'go on',
      'keep going',
      'regenerate',
      'again',
      'retry',
    ])('flags "%s" as a follow-up', (msg) => {
      const result = detectFollowUp(msg);
      expect(result.isFollowUp).toBe(true);
      expect(result.signals.some((s) => s.startsWith('exact_imperative'))).toBe(true);
    });
  });

  describe('positive — "make it" / rewrite / fix / add patterns', () => {
    it.each([
      'make it shorter',
      'make it longer',
      'make it professional',
      'make it simpler',
      'make this friendlier',
      'rewrite it',
      'rewrite the second one',
      'fix it',
      'fix the bug',
      'fix the second one',
      'add more details',
      'add tests',
      'add a section about security',
    ])('flags "%s" as a follow-up', (msg) => {
      expect(detectFollowUp(msg).isFollowUp).toBe(true);
    });
  });

  describe('positive — translate / language switch', () => {
    it.each([
      'translate it',
      'translate it to Arabic',
      'translate the result to French',
      'in arabic',
      'to french',
      'in egyptian',
      'بالعربي',
      'اختصر',
      'اعمله أقصر',
    ])('flags "%s" as a follow-up', (msg) => {
      expect(detectFollowUp(msg).isFollowUp).toBe(true);
    });
  });

  describe('positive — do the same / positional / what about', () => {
    it.each([
      'do the same',
      'do the same for this',
      'use the same format',
      'use the same structure',
      'keep the same tone',
      'do the second one',
      'fix the third option',
      'translate the second one',
      'what about this?',
      'how about the previous one?',
      'and this one?',
      'explain more',
      'explain it further',
      'convert it to JSON',
      'compare them',
      'judge it',
      'approve it',
    ])('flags "%s" as a follow-up', (msg) => {
      expect(detectFollowUp(msg).isFollowUp).toBe(true);
    });
  });

  describe('negative — substantive standalone prompts', () => {
    it.each([
      'Write a 500-word essay on the history of the Roman Empire including key battles.',
      'Generate a NestJS controller that exposes a CRUD endpoint for products with Zod validation.',
      'Summarize the attached PDF about Q4 financial performance.',
      'What is the capital of France?',
      'How does HTTP/3 differ from HTTP/2?',
      'Plan a 7-day trip to Tokyo with a budget of $3,000.',
    ])('does NOT flag "%s" as a follow-up', (msg) => {
      expect(detectFollowUp(msg).isFollowUp).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('treats empty string as not a follow-up with zero confidence', () => {
      const result = detectFollowUp('');
      expect(result).toEqual({ isFollowUp: false, signals: [], confidence: 0 });
    });

    it('treats pure whitespace as not a follow-up', () => {
      expect(detectFollowUp('     \n   ').isFollowUp).toBe(false);
    });

    it('does NOT false-positive on a long prompt that happens to contain "it"', () => {
      const result = detectFollowUp(
        'Please write a detailed technical explanation of how Redis sharding works, including consistent hashing, request routing, hot key mitigation, and the trade-offs of running it in a Kubernetes cluster.',
      );
      expect(result.isFollowUp).toBe(false);
    });

    it('upweights short replies that combine multiple signals', () => {
      const result = detectFollowUp('translate it');
      expect(result.isFollowUp).toBe(true);
      // both `translate` and `short_reply` (after another signal hit)
      expect(result.signals.length).toBeGreaterThanOrEqual(2);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('keeps confidence below 0.5 for a bare anaphoric pronoun without verb', () => {
      // "it" alone is too weak to count as a follow-up
      expect(detectFollowUp('it').isFollowUp).toBe(false);
    });
  });
});
