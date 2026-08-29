import { ModelCostClass, type ModelCostRates } from '@claw/shared-types';

import { type PaygRateSnapshot } from '../../types/credit.types';
import {
  isExemptProvider,
  isMeteredProvider,
  isUsablePaygRate,
} from '../payg-classification.utility';

const makeRates = (overrides: Partial<ModelCostRates> = {}): ModelCostRates => ({
  provider: 'OPENAI',
  model: 'gpt-5',
  version: 1,
  currency: 'USD',
  inputPerMillionMicroUsd: 1_000_000,
  outputPerMillionMicroUsd: 10_000_000,
  cachedInputPerMillionMicroUsd: null,
  cacheWritePerMillionMicroUsd: null,
  reasoningPerMillionMicroUsd: null,
  imagePerUnitMicroUsd: null,
  audioPerUnitMicroUsd: null,
  videoPerUnitMicroUsd: null,
  toolCallPerUnitMicroUsd: null,
  searchCallPerUnitMicroUsd: null,
  costClass: ModelCostClass.STANDARD,
  isAdminOverride: false,
  effectiveFrom: '2026-08-29T00:00:00.000Z',
  lastVerifiedAt: null,
  source: 'SEED',
  ...overrides,
});

const makeSnapshot = (overrides: Partial<PaygRateSnapshot> = {}): PaygRateSnapshot => ({
  rates: makeRates(),
  isPriced: true,
  isLocalComputeFallback: false,
  ...overrides,
});

describe('PAYG classification', () => {
  describe('exempt providers', () => {
    it.each(['OLLAMA', 'LLAMACPP', 'ollama', ' llamacpp '])('never meters %s', (provider) => {
      expect(isExemptProvider(provider)).toBe(true);
    });

    it('does meter a paid cloud provider', () => {
      expect(isExemptProvider('OPENAI')).toBe(false);
    });
  });

  describe('the local-compute zero-rate fallback', () => {
    // routing-service answers a LOCAL provider with `isPriced: true` at a rate
    // of zero, because a model on hardware the user owns genuinely costs the
    // platform nothing. If a METERED provider ever resolved through that path
    // it would come back priced, at zero, and every request to it would be free
    // — an unbounded liability that looks like a healthy lookup in the logs.
    it('is never a usable PAYG rate, even when it claims to be priced', () => {
      const fallback = makeSnapshot({ isPriced: true, isLocalComputeFallback: true });
      expect(isUsablePaygRate(fallback)).toBe(false);
    });

    it('is refused even when the rates themselves look complete', () => {
      const fallback = makeSnapshot({
        isPriced: true,
        isLocalComputeFallback: true,
        rates: makeRates({ inputPerMillionMicroUsd: 0, outputPerMillionMicroUsd: 0 }),
      });
      expect(isUsablePaygRate(fallback)).toBe(false);
    });
  });

  describe('usable rates', () => {
    it('accepts a fully-priced cloud model', () => {
      expect(isUsablePaygRate(makeSnapshot())).toBe(true);
    });

    it('refuses an unpriced model rather than treating it as free', () => {
      expect(isUsablePaygRate(makeSnapshot({ isPriced: false }))).toBe(false);
    });

    it('refuses a model with a missing output rate', () => {
      const snapshot = makeSnapshot({
        rates: makeRates({ outputPerMillionMicroUsd: null }),
      });
      expect(isUsablePaygRate(snapshot)).toBe(false);
    });
  });

  describe('connector policy rollup', () => {
    it('honours an explicit false from the administrator', () => {
      expect(isMeteredProvider('OPENAI', { OPENAI: false }, true)).toBe(false);
    });

    it('honours an explicit true', () => {
      expect(isMeteredProvider('GROK', { GROK: true }, false)).toBe(true);
    });

    it('falls back to the seeded default when nobody has classified the provider', () => {
      expect(isMeteredProvider('ANTHROPIC', {}, true)).toBe(true);
      expect(isMeteredProvider('SOMETHING_NEW', {}, false)).toBe(false);
    });

    it('never meters an exempt provider, whatever the policy says', () => {
      expect(isMeteredProvider('OLLAMA', { OLLAMA: true }, true)).toBe(false);
    });

    it('matches the provider case-insensitively', () => {
      expect(isMeteredProvider('openai', { OPENAI: true }, false)).toBe(true);
    });
  });
});
