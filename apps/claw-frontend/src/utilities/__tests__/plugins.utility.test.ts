import { describe, expect, it } from 'vitest';

import {
  categoryLabel,
  normalizeScope,
  parsePluginFilters,
  withPluginFilters,
} from '../plugins.utility';

const t = (key: string): string => key;

describe('parsePluginFilters', () => {
  it('returns empty filters for an empty URL', () => {
    expect(parsePluginFilters(new URLSearchParams())).toEqual({ q: '', category: '' });
  });

  it('trims the search text and caps its length', () => {
    const long = 'x'.repeat(200);
    const parsed = parsePluginFilters(new URLSearchParams({ q: `  ${long}  `, category: ' dev ' }));
    expect(parsed.q).toHaveLength(80);
    expect(parsed.category).toBe('dev');
  });

  it.each(['Dev', 'a', '1dev', 'dev_x', 'dev space', 'x'.repeat(33), '../etc'])(
    'drops the category %j that is not a slug',
    (category) => {
      expect(parsePluginFilters(new URLSearchParams({ category })).category).toBe('');
    },
  );

  it.each(['dev', 'ab', 'data-tools', 'a'.repeat(32)])('keeps the slug category %s', (category) => {
    expect(parsePluginFilters(new URLSearchParams({ category })).category).toBe(category);
  });
});

describe('withPluginFilters', () => {
  it('sets a value and keeps unrelated params', () => {
    const next = withPluginFilters(new URLSearchParams('foo=1'), { q: 'fetch' });
    expect(new URLSearchParams(next).get('q')).toBe('fetch');
    expect(new URLSearchParams(next).get('foo')).toBe('1');
  });

  it('removes a key when the value is empty', () => {
    const next = withPluginFilters(new URLSearchParams('q=a&category=dev'), { category: '' });
    expect(next).toBe('q=a');
  });

  it('leaves a key alone when it is not in the update', () => {
    const next = withPluginFilters(new URLSearchParams('q=a&category=dev'), { q: 'b' });
    expect(next).toBe('q=b&category=dev');
  });
});

describe('categoryLabel', () => {
  it('translates a known category and echoes an unknown one', () => {
    expect(categoryLabel(t, 'dev')).toBe('plugins.categories.dev');
    expect(categoryLabel(t, 'something-new')).toBe('something-new');
  });
});

describe('normalizeScope', () => {
  it('wraps a string and passes an object through', () => {
    expect(normalizeScope('read')).toEqual({ id: 'read' });
    expect(normalizeScope({ id: 'w', description: 'Write' })).toEqual({
      id: 'w',
      description: 'Write',
    });
  });
});
