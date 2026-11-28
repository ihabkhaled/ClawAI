import { describe, expect, it } from 'vitest';

import {
  GOOGLE_MAX_PAGES_CONFIG_KEY,
  GOOGLE_MAX_QUERIES_CONFIG_KEY,
} from '../../../../common/constants/research-engine.constants';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { createSearchProviderSchema } from '../create-search-provider.dto';
import { updateSearchProviderSchema } from '../update-search-provider.dto';

const queries = GOOGLE_MAX_QUERIES_CONFIG_KEY;
const pages = GOOGLE_MAX_PAGES_CONFIG_KEY;

const create = (publicConfig: unknown) =>
  createSearchProviderSchema.safeParse({
    kind: SearchProviderKind.SERPAPI,
    name: 'SerpApi',
    baseUrl: 'https://serpapi.com',
    publicConfig,
  });

describe('SERPAPI publicConfig: the Google budget overrides (ADR-228)', () => {
  it.each([
    [{ [queries]: 0 }],
    [{ [queries]: 20, [pages]: 10 }],
    [{ [pages]: 1 }],
    [{ [queries]: 6, [pages]: 5 }],
    [{}],
  ])('accepts %j on create and update', (config) => {
    expect(create(config).success).toBe(true);
    expect(updateSearchProviderSchema.safeParse({ publicConfig: config }).success).toBe(true);
  });

  it.each([
    ['queries above 20', { [queries]: 21 }],
    ['negative queries', { [queries]: -1 }],
    ['fractional queries', { [queries]: 2.5 }],
    ['queries as a string', { [queries]: '3' }],
    ['queries as null', { [queries]: null }],
    ['0 pages', { [pages]: 0 }],
    ['pages above 10', { [pages]: 11 }],
    ['fractional pages', { [pages]: 1.5 }],
  ])('rejects %s on create and update', (_name, config) => {
    expect(create(config).success).toBe(false);
    expect(updateSearchProviderSchema.safeParse({ publicConfig: config }).success).toBe(false);
  });

  it('keeps every other key as it was (expansion, anything an adapter reads)', () => {
    const parsed = create({ expansion: true, [queries]: 4, custom: { nested: 1 } });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.publicConfig).toEqual({
      expansion: true,
      [queries]: 4,
      custom: { nested: 1 },
    });
  });

  it('publicConfig stays optional, and a non-object is still refused', () => {
    expect(create(undefined).success).toBe(true);
    expect(create('x').success).toBe(false);
    expect(create([1]).success).toBe(false);
  });
});
