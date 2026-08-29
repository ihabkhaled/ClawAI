import { TokenUsageSource } from '@claw/shared-types';

import { extractAnthropicUsage } from '../extract-anthropic-usage.utility';
import { extractBedrockUsage } from '../extract-bedrock-usage.utility';
import { extractGeminiUsage } from '../extract-gemini-usage.utility';
import { extractOpenAiCompatibleUsage } from '../extract-openai-usage.utility';
import { normalizeTokenUsage } from '../normalize-token-usage.utility';

// Regression suite for the defect ADR-078 was written against: every extractor
// dropped the cached and reasoning sub-counts, so `calculateCostMicroUsd`
// priced them at zero. On an o-series or Gemini-thinking model that is the
// single largest component of the bill.
describe('cached and reasoning token extraction', () => {
  describe('OpenAI-compatible (sub-counts are INCLUDED in the parent totals)', () => {
    it('reads the nested detail blocks without altering the parent totals', () => {
      const usage = extractOpenAiCompatibleUsage({
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 900,
          prompt_tokens_details: { cached_tokens: 750 },
          completion_tokens_details: { reasoning_tokens: 800 },
        },
      });

      expect(usage.promptTokens).toBe(1000);
      expect(usage.completionTokens).toBe(900);
      expect(usage.cachedPromptTokens).toBe(750);
      expect(usage.reasoningTokens).toBe(800);
      expect(usage.source).toBe(TokenUsageSource.NATIVE);
    });

    it('accepts the DeepSeek top-level cache-hit spelling', () => {
      const usage = extractOpenAiCompatibleUsage({
        usage: { prompt_tokens: 500, completion_tokens: 100, prompt_cache_hit_tokens: 384 },
      });

      expect(usage.cachedPromptTokens).toBe(384);
    });

    it('reports zero sub-counts when the detail blocks are absent', () => {
      const usage = extractOpenAiCompatibleUsage({
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      expect(usage.cachedPromptTokens).toBe(0);
      expect(usage.reasoningTokens).toBe(0);
    });
  });

  describe('Anthropic (cache fields are ALONGSIDE input_tokens, not inside it)', () => {
    it('reassembles the prompt total from all three input fields', () => {
      const usage = extractAnthropicUsage({
        usage: {
          input_tokens: 100,
          cache_read_input_tokens: 4000,
          cache_creation_input_tokens: 200,
          output_tokens: 300,
        },
      });

      // Taking input_tokens alone would report 100 for a 4,300-token prompt.
      expect(usage.promptTokens).toBe(4300);
      expect(usage.cachedPromptTokens).toBe(4000);
      // A cache WRITE costs more than fresh input, so it must not land in the
      // discounted bucket.
      expect(usage.cachedPromptTokens).not.toBe(4200);
      expect(usage.completionTokens).toBe(300);
    });

    it('still works when no cache fields are present', () => {
      const usage = extractAnthropicUsage({
        usage: { input_tokens: 100, output_tokens: 300 },
      });

      expect(usage.promptTokens).toBe(100);
      expect(usage.cachedPromptTokens).toBe(0);
      expect(usage.source).toBe(TokenUsageSource.NATIVE);
    });
  });

  describe('Gemini (thoughts are EXCLUDED from candidatesTokenCount)', () => {
    it('adds thoughts into the completion total and marks them as reasoning', () => {
      const usage = extractGeminiUsage({
        usageMetadata: {
          promptTokenCount: 500,
          candidatesTokenCount: 120,
          thoughtsTokenCount: 2400,
          cachedContentTokenCount: 300,
          totalTokenCount: 3020,
        },
      });

      // The old reading reported 120 completion tokens for a 2,520-token answer.
      expect(usage.completionTokens).toBe(2520);
      expect(usage.reasoningTokens).toBe(2400);
      expect(usage.promptTokens).toBe(500);
      expect(usage.cachedPromptTokens).toBe(300);
    });
  });

  describe('Bedrock Converse', () => {
    it('reassembles the prompt total and discounts only the read half', () => {
      const usage = extractBedrockUsage({
        usage: {
          inputTokens: 50,
          cacheReadInputTokens: 900,
          cacheWriteInputTokens: 50,
          outputTokens: 200,
        },
      });

      expect(usage.promptTokens).toBe(1000);
      expect(usage.cachedPromptTokens).toBe(900);
    });

    it('falls back to invocation metrics when the usage block is absent', () => {
      const usage = extractBedrockUsage({
        'amazon-bedrock-invocationMetrics': { inputTokenCount: 12, outputTokenCount: 34 },
      });

      expect(usage.promptTokens).toBe(12);
      expect(usage.cachedPromptTokens).toBe(0);
    });
  });

  describe('clamping — a part can never exceed its whole', () => {
    it('clamps a malformed cached count down to the prompt total', () => {
      const usage = normalizeTokenUsage({
        promptTokens: 100,
        completionTokens: 50,
        cachedPromptTokens: 999,
        reasoningTokens: 999,
      });

      expect(usage.cachedPromptTokens).toBe(100);
      expect(usage.reasoningTokens).toBe(50);
    });

    it('reports zero sub-counts on an estimated side', () => {
      const usage = normalizeTokenUsage({
        promptText: 'hello world',
        completionTokens: 40,
        cachedPromptTokens: 5,
        reasoningTokens: 10,
      });

      expect(usage.cachedPromptTokens).toBe(0);
      expect(usage.reasoningTokens).toBe(10);
      expect(usage.source).toBe(TokenUsageSource.MIXED);
    });

    it('rejects a negative sub-count rather than crediting it', () => {
      const usage = normalizeTokenUsage({
        promptTokens: 100,
        completionTokens: 50,
        cachedPromptTokens: -20,
      });

      expect(usage.cachedPromptTokens).toBe(0);
    });
  });
});
