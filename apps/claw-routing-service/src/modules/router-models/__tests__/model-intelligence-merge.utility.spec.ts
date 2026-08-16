import {
  lookupCuratedCloudEnrichment,
  lookupLocalFamilyEnrichment,
  mergeEnrichmentRespectingOverrides,
  pickOverrideFields,
} from '../utilities/model-intelligence-merge.utility';

describe('model-intelligence-merge.utility', () => {
  describe('lookupCuratedCloudEnrichment', () => {
    it('returns enrichment for a known cloud model (OpenAI gpt-4o)', () => {
      const result = lookupCuratedCloudEnrichment('OPENAI', 'gpt-4o');
      expect(result).toBeDefined();
      expect(result?.supportsVision).toBe(true);
      expect(result?.supportsTools).toBe(true);
      expect(result?.qualityTierLabel).toBe('PRO');
    });

    it('returns enrichment for Anthropic claude-opus-4 with FRONTIER tier', () => {
      const result = lookupCuratedCloudEnrichment('ANTHROPIC', 'claude-opus-4');
      expect(result?.qualityTierLabel).toBe('FRONTIER');
      expect(result?.costClassLabel).toBe('PREMIUM');
    });

    it('returns enrichment for Gemini 2.5 Pro with multimodal capabilities', () => {
      const result = lookupCuratedCloudEnrichment('GEMINI', 'gemini-2.5-pro');
      expect(result?.supportsVision).toBe(true);
      expect(result?.supportsAudioInput).toBe(true);
      expect(result?.supportsVideoInput).toBe(true);
    });

    it('returns enrichment for DeepSeek V3.2 with coding strength', () => {
      const result = lookupCuratedCloudEnrichment('DEEPSEEK', 'deepseek-v3.2');
      expect(result?.domainStrengths).toContain('coding');
    });

    it('returns undefined for an unknown provider/model pair', () => {
      const result = lookupCuratedCloudEnrichment('UNKNOWN_PROVIDER', 'unknown-model');
      expect(result).toBeUndefined();
    });

    it('lookup is case-sensitive on the provider', () => {
      const result = lookupCuratedCloudEnrichment('openai', 'gpt-4o');
      expect(result).toBeUndefined();
    });

    it('every curated entry sets privacyClassLabel="cloud"', () => {
      const probes = ['gpt-4o', 'claude-sonnet-4', 'gemini-2.5-flash'];
      for (const key of probes) {
        const p1 = lookupCuratedCloudEnrichment('OPENAI', key);
        const p2 = lookupCuratedCloudEnrichment('ANTHROPIC', key);
        const p3 = lookupCuratedCloudEnrichment('GEMINI', key);
        const e = p1 ?? p2 ?? p3;
        if (e !== undefined) {
          expect(e.privacyClassLabel).toBe('cloud');
        }
      }
    });
  });

  describe('lookupLocalFamilyEnrichment', () => {
    it('returns enrichment for qwen3-coder family', () => {
      const result = lookupLocalFamilyEnrichment('qwen3-coder-32b');
      expect(result?.domainStrengths).toContain('coding');
      expect(result?.privacyClassLabel).toBe('local');
      expect(result?.costClassLabel).toBe('FREE');
    });

    it('returns enrichment for deepseek-r1 with reasoning strength', () => {
      const result = lookupLocalFamilyEnrichment('deepseek-r1:7b');
      expect(result?.domainStrengths).toContain('reasoning');
      expect(result?.supportsTools).toBe(false);
    });

    it('returns enrichment for llama3.3 general family', () => {
      const result = lookupLocalFamilyEnrichment('llama3.3:70b');
      expect(result?.domainStrengths).toContain('general');
    });

    it('returns enrichment for gemma family', () => {
      const result = lookupLocalFamilyEnrichment('gemma3:4b');
      expect(result?.bestFor).toContain('router_fallback');
    });

    it('returns enrichment for phi family', () => {
      const result = lookupLocalFamilyEnrichment('phi4-mini');
      expect(result?.domainStrengths).toContain('general');
    });

    it('returns enrichment for nomic-embed (embeddings-specialist)', () => {
      const result = lookupLocalFamilyEnrichment('nomic-embed-text');
      expect(result?.supportsEmbeddings).toBe(true);
      expect(result?.domainStrengths).toContain('embedding');
    });

    it('returns undefined for an unknown family', () => {
      const result = lookupLocalFamilyEnrichment('some-experimental-model');
      expect(result).toBeUndefined();
    });

    it('returns undefined for null / undefined input', () => {
      expect(lookupLocalFamilyEnrichment(null)).toBeUndefined();
      expect(lookupLocalFamilyEnrichment(undefined)).toBeUndefined();
    });

    it('match is case-insensitive on the haystack', () => {
      const result = lookupLocalFamilyEnrichment('QWEN3-CODER-32B');
      expect(result?.domainStrengths).toContain('coding');
    });
  });

  describe('mergeEnrichmentRespectingOverrides', () => {
    it('merges incoming fields onto base when no keys are protected', () => {
      const base = { supportsTools: false, qualityTierLabel: 'BASIC' };
      const incoming = { supportsTools: true, costClassLabel: 'LOW' };
      const result = mergeEnrichmentRespectingOverrides(base, incoming, new Set<string>());
      expect(result.supportsTools).toBe(true);
      expect(result.qualityTierLabel).toBe('BASIC');
      expect(result.costClassLabel).toBe('LOW');
    });

    it('SKIPS incoming fields whose keys are protected', () => {
      const base = { qualityTierLabel: 'BASIC', costClassLabel: 'LOW' };
      const incoming = { qualityTierLabel: 'FRONTIER', costClassLabel: 'PREMIUM' };
      const result = mergeEnrichmentRespectingOverrides(
        base,
        incoming,
        new Set<string>(['qualityTierLabel']),
      );
      expect(result.qualityTierLabel).toBe('BASIC');
      expect(result.costClassLabel).toBe('PREMIUM');
    });

    it('IGNORES undefined values in incoming (does not nuke base)', () => {
      const base = { supportsTools: true };
      const incoming = { supportsTools: undefined } as Record<string, unknown>;
      const result = mergeEnrichmentRespectingOverrides(base, incoming, new Set<string>());
      expect(result.supportsTools).toBe(true);
    });

    it('DOES write null values from incoming (explicit unknown)', () => {
      const base = { supportsTools: true };
      const incoming = { supportsTools: null } as Record<string, unknown>;
      const result = mergeEnrichmentRespectingOverrides(base, incoming, new Set<string>());
      expect(result.supportsTools).toBeNull();
    });

    it('does not mutate base', () => {
      const base = { supportsTools: true };
      const incoming = { supportsTools: false };
      mergeEnrichmentRespectingOverrides(base, incoming, new Set<string>());
      expect(base.supportsTools).toBe(true);
    });
  });

  describe('pickOverrideFields', () => {
    it('keeps only override-managed fields', () => {
      const input = {
        supportsTools: true,
        qualityTierLabel: 'FRONTIER',
        someArbitraryKey: 'ignored',
        anotherKey: 42,
      };
      const result = pickOverrideFields(input);
      expect(result).toEqual({
        supportsTools: true,
        qualityTierLabel: 'FRONTIER',
      });
      expect(result.someArbitraryKey).toBeUndefined();
      expect(result.anotherKey).toBeUndefined();
    });

    it('returns empty when no override-managed keys are present', () => {
      const result = pickOverrideFields({ unknownKey: 'value' });
      expect(result).toEqual({});
    });

    it('preserves null values', () => {
      const result = pickOverrideFields({ supportsTools: null });
      expect(result.supportsTools).toBeNull();
    });

    it('preserves array values', () => {
      const result = pickOverrideFields({ domainStrengths: ['coding', 'reasoning'] });
      expect(result.domainStrengths).toEqual(['coding', 'reasoning']);
    });
  });
});
