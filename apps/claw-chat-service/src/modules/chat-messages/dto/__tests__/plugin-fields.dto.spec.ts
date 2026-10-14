import { describe, expect, it } from 'vitest';

import { PLUGIN_REFS_MAX } from '../../constants/plugin-tools.constants';
import { createMessageSchema } from '../create-message.dto';
import { pluginFields, pluginRefSchema } from '../plugin-fields.dto';

const ID = '11111111-1111-4111-8111-111111111111';

describe('pluginRefSchema', () => {
  it('accepts a plugin mention and a tool mention', () => {
    expect(pluginRefSchema.safeParse({ installId: ID, label: 'Web fetch' }).success).toBe(true);
    expect(
      pluginRefSchema.safeParse({ installId: ID, toolName: 'fetch_page', label: 'Web fetch' })
        .success,
    ).toBe(true);
  });

  it.each([
    ['a non-uuid install id', { installId: 'abc', label: 'x' }],
    ['an empty label', { installId: ID, label: '' }],
    ['a label over 80 characters', { installId: ID, label: 'x'.repeat(81) }],
    ['a tool name over 40 characters', { installId: ID, toolName: 'x'.repeat(41), label: 'x' }],
  ])('rejects %s', (_name, value) => {
    expect(pluginRefSchema.safeParse(value).success).toBe(false);
  });
});

describe('pluginFields on the create-message DTO', () => {
  const base = { threadId: 't-1', content: 'hello @web' };

  it('is optional', () => {
    expect(createMessageSchema.safeParse(base).success).toBe(true);
  });

  it('accepts up to the cap and no more', () => {
    const refs = (count: number) =>
      Array.from({ length: count }, () => ({ installId: ID, label: 'x' }));
    expect(
      createMessageSchema.safeParse({ ...base, pluginRefs: refs(PLUGIN_REFS_MAX) }).success,
    ).toBe(true);
    expect(
      createMessageSchema.safeParse({ ...base, pluginRefs: refs(PLUGIN_REFS_MAX + 1) }).success,
    ).toBe(false);
  });

  it('keeps the refs on the parsed message', () => {
    const parsed = createMessageSchema.parse({
      ...base,
      pluginRefs: [{ installId: ID, label: 'Web' }],
    });
    expect(parsed.pluginRefs).toEqual([{ installId: ID, label: 'Web' }]);
  });

  it('exposes one fragment every DTO spreads', () => {
    expect(Object.keys(pluginFields)).toEqual(['pluginRefs']);
  });
});
