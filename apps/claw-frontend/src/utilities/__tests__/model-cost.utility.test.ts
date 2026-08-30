import { describe, expect, it } from 'vitest';

import { ModelPricingSource, ModelPricingSourceFilter } from '@/enums/model-pricing-source.enum';
import type { ModelCostCatalogRow } from '@/types/model-cost.types';
import {
  countModelCostRowsBySource,
  dollarsPerMillionToMicroUsd,
  filterModelCostRows,
  formatMicroUsdPerMillionAsUsd,
  isValidRateInput,
  microUsdToRateInput,
  sortModelCostRowsByAttention,
} from '@/utilities/model-cost.utility';

const row = (overrides: Partial<ModelCostCatalogRow> = {}): ModelCostCatalogRow => ({
  provider: 'OPENAI',
  modelKey: 'gpt-4o',
  displayName: 'GPT-4o',
  pricingSource: ModelPricingSource.PUBLISHED,
  inputPerMillionMicroUsd: 2_500_000,
  outputPerMillionMicroUsd: 10_000_000,
  cachedInputPerMillionMicroUsd: 1_250_000,
  costClass: 'PREMIUM',
  isAdminOverride: false,
  version: 3,
  lastVerifiedAt: '2026-07-20T00:00:00.000Z',
  ...overrides,
});

describe('formatMicroUsdPerMillionAsUsd', () => {
  it('renders a whole-dollar rate with two decimals', () => {
    expect(formatMicroUsdPerMillionAsUsd(2_500_000)).toBe('$2.50');
    expect(formatMicroUsdPerMillionAsUsd(10_000_000)).toBe('$10.00');
  });

  it('keeps sub-cent precision instead of rounding it away', () => {
    expect(formatMicroUsdPerMillionAsUsd(75_000)).toBe('$0.075');
    expect(formatMicroUsdPerMillionAsUsd(1)).toBe('$0.000001');
  });

  it('renders a genuine zero rate as zero', () => {
    expect(formatMicroUsdPerMillionAsUsd(0)).toBe('$0.00');
  });

  it('returns null for an unknown rate — unknown is not free', () => {
    expect(formatMicroUsdPerMillionAsUsd(null)).toBeNull();
  });

  it('refuses a negative rate rather than rendering a credit', () => {
    expect(formatMicroUsdPerMillionAsUsd(-1)).toBeNull();
  });

  it('does not drift on the values float division gets wrong', () => {
    // 70_000 / 1e6 is 0.07 exactly, but 0.07 * 1e6 is 70000.00000000001 —
    // the round trip below is the one that used to lose a micro-USD.
    expect(formatMicroUsdPerMillionAsUsd(70_000)).toBe('$0.07');
    expect(dollarsPerMillionToMicroUsd('0.07')).toBe(70_000);
  });
});

describe('dollarsPerMillionToMicroUsd', () => {
  it('converts dollars per million to integer micro-USD', () => {
    expect(dollarsPerMillionToMicroUsd('2.50')).toBe(2_500_000);
    expect(dollarsPerMillionToMicroUsd('10')).toBe(10_000_000);
    expect(dollarsPerMillionToMicroUsd('0.000001')).toBe(1);
  });

  it('treats an empty field as unset, not as zero', () => {
    expect(dollarsPerMillionToMicroUsd('')).toBeNull();
    expect(dollarsPerMillionToMicroUsd('   ')).toBeNull();
  });

  it('round-trips every formatted rate back to the same integer', () => {
    for (const microUsd of [0, 1, 75_000, 70_000, 2_500_000, 10_000_000, 999_999_999]) {
      expect(dollarsPerMillionToMicroUsd(microUsdToRateInput(microUsd))).toBe(microUsd);
    }
  });
});

describe('isValidRateInput', () => {
  it('accepts an empty field and a plain decimal', () => {
    expect(isValidRateInput('')).toBe(true);
    expect(isValidRateInput('2.5')).toBe(true);
    expect(isValidRateInput('0.000001')).toBe(true);
  });

  it('rejects anything the publish DTO would reject', () => {
    expect(isValidRateInput('-1')).toBe(false);
    expect(isValidRateInput('2.5e3')).toBe(false);
    expect(isValidRateInput('1,000')).toBe(false);
    expect(isValidRateInput('abc')).toBe(false);
    expect(isValidRateInput('0.0000001')).toBe(false);
  });

  it('rejects a rate above the $1,000 per million ceiling', () => {
    expect(isValidRateInput('1000')).toBe(true);
    expect(isValidRateInput('1000.000001')).toBe(false);
  });
});

describe('sortModelCostRowsByAttention', () => {
  it('puts the models that need a price first', () => {
    const rows = [
      row({ modelKey: 'priced', pricingSource: ModelPricingSource.PUBLISHED }),
      row({ modelKey: 'local', pricingSource: ModelPricingSource.LOCAL_FREE }),
      row({ modelKey: 'unpriced', pricingSource: ModelPricingSource.UNPRICED }),
      row({ modelKey: 'fallback', pricingSource: ModelPricingSource.PROVIDER_FALLBACK }),
      row({ modelKey: 'family', pricingSource: ModelPricingSource.DATED_FAMILY }),
    ];

    expect(sortModelCostRowsByAttention(rows).map((item) => item.modelKey)).toEqual([
      'fallback',
      'unpriced',
      'family',
      'local',
      'priced',
    ]);
  });

  it('breaks ties on provider then model so the order never jumps', () => {
    const rows = [
      row({ provider: 'OPENAI', modelKey: 'b' }),
      row({ provider: 'ANTHROPIC', modelKey: 'z' }),
      row({ provider: 'OPENAI', modelKey: 'a' }),
    ];

    expect(sortModelCostRowsByAttention(rows).map((item) => item.modelKey)).toEqual([
      'z',
      'a',
      'b',
    ]);
  });

  it('does not mutate the array it was given', () => {
    const rows = [
      row({ modelKey: 'priced' }),
      row({ modelKey: 'fallback', pricingSource: ModelPricingSource.PROVIDER_FALLBACK }),
    ];

    sortModelCostRowsByAttention(rows);

    expect(rows[0]?.modelKey).toBe('priced');
  });
});

describe('countModelCostRowsBySource', () => {
  it('tallies every source, reporting zero for the ones absent', () => {
    const counts = countModelCostRowsBySource([
      row({ pricingSource: ModelPricingSource.PROVIDER_FALLBACK }),
      row({ pricingSource: ModelPricingSource.PROVIDER_FALLBACK }),
      row({ pricingSource: ModelPricingSource.UNPRICED }),
    ]);

    expect(counts[ModelPricingSource.PROVIDER_FALLBACK]).toBe(2);
    expect(counts[ModelPricingSource.UNPRICED]).toBe(1);
    expect(counts[ModelPricingSource.PUBLISHED]).toBe(0);
  });
});

describe('filterModelCostRows', () => {
  const rows = [
    row({ provider: 'OPENAI', modelKey: 'gpt-4o', displayName: 'GPT-4o' }),
    row({
      provider: 'ANTHROPIC',
      modelKey: 'claude-sonnet-4-5',
      displayName: 'Claude Sonnet 4.5',
      pricingSource: ModelPricingSource.PROVIDER_FALLBACK,
    }),
  ];

  it('returns every row when the filter is ALL and the search is empty', () => {
    expect(filterModelCostRows(rows, ModelPricingSourceFilter.ALL, '')).toHaveLength(2);
  });

  it('keeps only the selected pricing source', () => {
    const filtered = filterModelCostRows(rows, ModelPricingSource.PROVIDER_FALLBACK, '');

    expect(filtered.map((item) => item.provider)).toEqual(['ANTHROPIC']);
  });

  it('searches provider, model key and display name case-insensitively', () => {
    expect(filterModelCostRows(rows, ModelPricingSourceFilter.ALL, 'anthropic')).toHaveLength(1);
    expect(filterModelCostRows(rows, ModelPricingSourceFilter.ALL, 'GPT-4O')).toHaveLength(1);
    expect(filterModelCostRows(rows, ModelPricingSourceFilter.ALL, 'sonnet')).toHaveLength(1);
    expect(filterModelCostRows(rows, ModelPricingSourceFilter.ALL, 'nothing')).toHaveLength(0);
  });
});
