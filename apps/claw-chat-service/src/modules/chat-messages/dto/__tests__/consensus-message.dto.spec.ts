import { consensusMessageSchema } from '../consensus-message.dto';

describe('consensusMessageSchema', () => {
  describe('valid payloads', () => {
    it('should accept a minimal valid payload with 2 models', () => {
      const result = consensusMessageSchema.safeParse({
        content: 'Compare these models',
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('Compare these models');
        expect(result.data.models).toHaveLength(2);
        expect(result.data.threadId).toBeUndefined();
        expect(result.data.fileIds).toBeUndefined();
      }
    });

    it('should accept a maximal valid payload with 5 models and fileIds', () => {
      const result = consensusMessageSchema.safeParse({
        threadId: 'thread-abc-123',
        content: 'a'.repeat(100_000),
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
          { provider: 'GEMINI', model: 'gemini-2.5-flash' },
          { provider: 'DEEPSEEK', model: 'deepseek-r1' },
          { provider: 'OLLAMA', model: 'qwen3:1.7b' },
        ],
        fileIds: ['file-1', 'file-2'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.models).toHaveLength(5);
        expect(result.data.fileIds).toHaveLength(2);
        expect(result.data.content).toHaveLength(100_000);
      }
    });

    it('should accept threadId as an arbitrary string (not UUID-restricted)', () => {
      const result = consensusMessageSchema.safeParse({
        threadId: 'some-arbitrary-thread-id',
        content: 'Hello',
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should accept threadId as a valid UUID', () => {
      const result = consensusMessageSchema.safeParse({
        threadId: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Hello',
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should accept content at exactly 100000 characters', () => {
      const result = consensusMessageSchema.safeParse({
        content: 'a'.repeat(100_000),
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('invalid payloads — models array', () => {
    it('should reject 0 models', () => {
      const result = consensusMessageSchema.safeParse({
        content: 'Hello',
        models: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const modelsError = result.error.issues.find((i) => i.path[0] === 'models');
        expect(modelsError).toBeDefined();
      }
    });

    it('should reject 1 model (minimum is 2)', () => {
      const result = consensusMessageSchema.safeParse({
        content: 'Hello',
        models: [{ provider: 'ANTHROPIC', model: 'claude-sonnet-4' }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const modelsError = result.error.issues.find((i) => i.path[0] === 'models');
        expect(modelsError).toBeDefined();
      }
    });

    it('should reject 6 models (maximum is 5)', () => {
      const result = consensusMessageSchema.safeParse({
        content: 'Hello',
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
          { provider: 'GEMINI', model: 'gemini-2.5-flash' },
          { provider: 'DEEPSEEK', model: 'deepseek-r1' },
          { provider: 'OLLAMA', model: 'qwen3:1.7b' },
          { provider: 'EXTRA', model: 'extra-model' },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const modelsError = result.error.issues.find((i) => i.path[0] === 'models');
        expect(modelsError).toBeDefined();
      }
    });

    it('should reject models missing provider field', () => {
      const result = consensusMessageSchema.safeParse({
        content: 'Hello',
        models: [{ model: 'claude-sonnet-4' }, { provider: 'OPENAI', model: 'gpt-4o' }],
      });

      expect(result.success).toBe(false);
    });

    it('should reject models missing model field', () => {
      const result = consensusMessageSchema.safeParse({
        content: 'Hello',
        models: [{ provider: 'ANTHROPIC' }, { provider: 'OPENAI', model: 'gpt-4o' }],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('invalid payloads — content', () => {
    it('should reject empty content', () => {
      const result = consensusMessageSchema.safeParse({
        content: '',
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const contentError = result.error.issues.find((i) => i.path[0] === 'content');
        expect(contentError).toBeDefined();
      }
    });

    it('should reject content exceeding 100000 characters', () => {
      const result = consensusMessageSchema.safeParse({
        content: 'a'.repeat(100_001),
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const contentError = result.error.issues.find((i) => i.path[0] === 'content');
        expect(contentError).toBeDefined();
      }
    });

    it('should reject missing content field', () => {
      const result = consensusMessageSchema.safeParse({
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
        ],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('invalid payloads — threadId', () => {
    it('should reject threadId exceeding 255 characters', () => {
      const result = consensusMessageSchema.safeParse({
        threadId: 'a'.repeat(256),
        content: 'Hello',
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
        ],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('invalid payloads — fileIds', () => {
    it('should reject fileIds array with more than 10 items', () => {
      const result = consensusMessageSchema.safeParse({
        content: 'Hello',
        models: [
          { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          { provider: 'OPENAI', model: 'gpt-4o' },
        ],
        fileIds: Array.from({ length: 11 }, (_, i) => `file-${String(i)}`),
      });

      expect(result.success).toBe(false);
    });
  });
});
