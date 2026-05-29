import { parseJudgeModel } from '../judge-model-parse.utility';

describe('parseJudgeModel', () => {
  describe('empty / nullish input', () => {
    it.each([null, undefined, '', '   '])('returns null provider + empty model for %p', (raw) => {
      const result = parseJudgeModel(raw);
      expect(result.provider).toBeNull();
      expect(result.model).toBe('');
    });
  });

  describe('explicit PROVIDER:model with a known cloud provider', () => {
    it.each([
      ['OPENAI:gpt-4o-mini', 'OPENAI', 'gpt-4o-mini'],
      ['ANTHROPIC:claude-sonnet-4', 'ANTHROPIC', 'claude-sonnet-4'],
      ['GEMINI:gemini-2.5-flash', 'GEMINI', 'gemini-2.5-flash'],
      ['DEEPSEEK:deepseek-chat', 'DEEPSEEK', 'deepseek-chat'],
      ['GROK:grok-2', 'GROK', 'grok-2'],
      ['AWS_BEDROCK:claude', 'AWS_BEDROCK', 'claude'],
    ])('parses %s', (raw, provider, model) => {
      const result = parseJudgeModel(raw);
      expect(result.provider).toBe(provider);
      expect(result.model).toBe(model);
    });

    it('matches the provider case-insensitively but returns the canonical token', () => {
      const result = parseJudgeModel('openai:gpt-4o');
      expect(result.provider).toBe('OPENAI');
      expect(result.model).toBe('gpt-4o');
    });

    it('keeps trailing colons in the model (Ollama tag style)', () => {
      const result = parseJudgeModel('OLLAMA:llama3:8b');
      expect(result.provider).toBe('OLLAMA');
      expect(result.model).toBe('llama3:8b');
    });

    it('recognizes the local connector provider strings', () => {
      expect(parseJudgeModel('local-ollama:gemma3:4b')).toEqual({
        provider: 'local-ollama',
        model: 'gemma3:4b',
      });
      expect(parseJudgeModel('LLAMACPP:kimi-k2')).toEqual({
        provider: 'LLAMACPP',
        model: 'kimi-k2',
      });
    });
  });

  describe('plain model names (no recognized provider prefix)', () => {
    it('treats a bare model name as provider-less', () => {
      const result = parseJudgeModel('gemma3:4b');
      expect(result.provider).toBeNull();
      expect(result.model).toBe('gemma3:4b');
    });

    it('does not mis-parse a tag suffix as a provider', () => {
      const result = parseJudgeModel('gpt-4o:latest');
      expect(result.provider).toBeNull();
      expect(result.model).toBe('gpt-4o:latest');
    });

    it('keeps AUTO as a provider-less model', () => {
      const result = parseJudgeModel('AUTO');
      expect(result.provider).toBeNull();
      expect(result.model).toBe('AUTO');
    });

    it('falls back to the full string when the known provider has no model remainder', () => {
      const result = parseJudgeModel('OPENAI:');
      expect(result.provider).toBeNull();
      expect(result.model).toBe('OPENAI:');
    });

    it('does not treat a leading colon as a provider', () => {
      const result = parseJudgeModel(':gpt-4o');
      expect(result.provider).toBeNull();
      expect(result.model).toBe(':gpt-4o');
    });
  });

  describe('trimming', () => {
    it('trims surrounding whitespace around provider and model', () => {
      const result = parseJudgeModel('  OPENAI:  gpt-4o-mini  ');
      expect(result.provider).toBe('OPENAI');
      expect(result.model).toBe('gpt-4o-mini');
    });
  });
});
