import { updateModelIntelligenceSchema } from '../dto/update-model-intelligence.dto';

describe('updateModelIntelligenceSchema', () => {
  describe('happy paths', () => {
    it('accepts a single capability flag', () => {
      const result = updateModelIntelligenceSchema.safeParse({ supportsTools: true });
      expect(result.success).toBe(true);
    });

    it('accepts explicit null for an unknown capability', () => {
      const result = updateModelIntelligenceSchema.safeParse({ supportsTools: null });
      expect(result.success).toBe(true);
    });

    it('accepts all label values from the tier vocabulary', () => {
      for (const tier of ['BASIC', 'STANDARD', 'PRO', 'FRONTIER']) {
        const result = updateModelIntelligenceSchema.safeParse({ qualityTierLabel: tier });
        expect(result.success).toBe(true);
      }
    });

    it('accepts all cost class labels', () => {
      for (const cost of ['FREE', 'LOW', 'MEDIUM', 'HIGH', 'PREMIUM']) {
        const result = updateModelIntelligenceSchema.safeParse({ costClassLabel: cost });
        expect(result.success).toBe(true);
      }
    });

    it('accepts string arrays for domain hints', () => {
      const result = updateModelIntelligenceSchema.safeParse({
        domainStrengths: ['coding', 'reasoning'],
        weakDomains: ['multimodal'],
      });
      expect(result.success).toBe(true);
    });

    it('accepts a full enrichment payload', () => {
      const result = updateModelIntelligenceSchema.safeParse({
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: true,
        maxContextTokens: 200_000,
        domainStrengths: ['coding'],
        qualityTierLabel: 'FRONTIER',
        costClassLabel: 'PREMIUM',
        latencyClassLabel: 'MEDIUM',
        privacyClassLabel: 'cloud',
        estimatedInputCostPer1M: 3.0,
        estimatedOutputCostPer1M: 15.0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('rejection paths', () => {
    it('rejects empty payload (at least one field required)', () => {
      const result = updateModelIntelligenceSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects unknown enum value for qualityTierLabel', () => {
      const result = updateModelIntelligenceSchema.safeParse({ qualityTierLabel: 'EXOTIC' });
      expect(result.success).toBe(false);
    });

    it('rejects unknown key (strict mode)', () => {
      const result = updateModelIntelligenceSchema.safeParse({
        someUnknownField: 'value',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative cost estimates', () => {
      const result = updateModelIntelligenceSchema.safeParse({
        estimatedInputCostPer1M: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects too-large maxContextTokens', () => {
      const result = updateModelIntelligenceSchema.safeParse({
        maxContextTokens: 200_000_000,
      });
      expect(result.success).toBe(false);
    });

    it('rejects string array entries that are empty', () => {
      const result = updateModelIntelligenceSchema.safeParse({
        domainStrengths: [''],
      });
      expect(result.success).toBe(false);
    });

    it('rejects too-many array entries (> 50)', () => {
      const result = updateModelIntelligenceSchema.safeParse({
        domainStrengths: new Array(51).fill('domain'),
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-boolean values for capability flags', () => {
      const result = updateModelIntelligenceSchema.safeParse({
        supportsTools: 'yes',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid privacyClassLabel', () => {
      const result = updateModelIntelligenceSchema.safeParse({
        privacyClassLabel: 'public',
      });
      expect(result.success).toBe(false);
    });

    it('accepts privacyClassLabel="local" or "cloud"', () => {
      expect(
        updateModelIntelligenceSchema.safeParse({ privacyClassLabel: 'local' }).success,
      ).toBe(true);
      expect(
        updateModelIntelligenceSchema.safeParse({ privacyClassLabel: 'cloud' }).success,
      ).toBe(true);
    });
  });
});
