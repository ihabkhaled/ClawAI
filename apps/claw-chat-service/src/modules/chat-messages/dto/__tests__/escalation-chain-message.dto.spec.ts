import { escalationChainMessageSchema } from '../escalation-chain-message.dto';

describe('escalationChainMessageSchema', () => {
  const validChain = [
    { provider: 'OPENAI', model: 'gpt-4o-mini' },
    { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
  ];

  describe('valid inputs', () => {
    it('should accept a minimal valid payload with 2 steps', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: validChain,
      });
      expect(result.success).toBe(true);
    });

    it('should accept 5 steps (max)', () => {
      const chain = [
        { provider: 'OPENAI', model: 'gpt-4o-mini' },
        { provider: 'OPENAI', model: 'gpt-4o' },
        { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
        { provider: 'ANTHROPIC', model: 'claude-opus-4' },
        { provider: 'GOOGLE', model: 'gemini-2.5-flash' },
      ];
      const result = escalationChainMessageSchema.safeParse({
        content: 'Some prompt',
        chain,
      });
      expect(result.success).toBe(true);
    });

    it('should accept an optional threadId', () => {
      const result = escalationChainMessageSchema.safeParse({
        threadId: 'thread-abc',
        content: 'Hello world',
        chain: validChain,
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional fileIds', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: validChain,
        fileIds: ['file-1', 'file-2'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept a qualityThreshold of 0', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: [
          { provider: 'OPENAI', model: 'gpt-4o-mini', qualityThreshold: 0 },
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4', qualityThreshold: 0.8 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept a qualityThreshold of 1', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: [
          { provider: 'OPENAI', model: 'gpt-4o-mini', qualityThreshold: 1 },
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject 0 steps', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject 1 step', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: [{ provider: 'OPENAI', model: 'gpt-4o' }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject 6 steps (exceeds max)', () => {
      const chain = Array.from({ length: 6 }, (_, i) => ({
        provider: 'OPENAI',
        model: `gpt-model-${String(i)}`,
      }));
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing content', () => {
      const result = escalationChainMessageSchema.safeParse({
        chain: validChain,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty content', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: '',
        chain: validChain,
      });
      expect(result.success).toBe(false);
    });

    it('should reject content exceeding 100_000 characters', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'a'.repeat(100_001),
        chain: validChain,
      });
      expect(result.success).toBe(false);
    });

    it('should reject qualityThreshold below 0', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: [
          { provider: 'OPENAI', model: 'gpt-4o', qualityThreshold: -0.1 },
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject qualityThreshold above 1', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: [
          { provider: 'OPENAI', model: 'gpt-4o', qualityThreshold: 1.1 },
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 10 fileIds', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: validChain,
        fileIds: Array.from({ length: 11 }, (_, i) => `file-${String(i)}`),
      });
      expect(result.success).toBe(false);
    });

    it('should reject step with empty provider', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: [
          { provider: '', model: 'gpt-4o' },
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject step with empty model', () => {
      const result = escalationChainMessageSchema.safeParse({
        content: 'Hello world',
        chain: [
          { provider: 'OPENAI', model: '' },
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});
