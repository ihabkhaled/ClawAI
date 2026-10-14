import type { PluginMentionView } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { PLUGIN_MENTION_MAX_OPTIONS } from '@/constants/plugin-mention.constants';
import {
  applyMention,
  filterMentionOptions,
  findMentionTrigger,
  mentionLabel,
  mentionToken,
  reconcileRefs,
  removeMentionToken,
} from '@/utilities/plugin-mention.utility';

function view(overrides: Partial<PluginMentionView> & { name: string }): PluginMentionView {
  return {
    installId: `id-${overrides.name}`,
    slug: overrides.name.toLowerCase().replaceAll(' ', '-'),
    iconKey: 'globe',
    enabled: true,
    ...overrides,
  };
}

describe('findMentionTrigger', () => {
  // The trigger table from the design: start of text, after whitespace, never inside a word.
  it.each([
    ['@', 1, { start: 0, end: 1, query: '' }],
    ['@web', 4, { start: 0, end: 4, query: 'web' }],
    ['hello @we', 9, { start: 6, end: 9, query: 'we' }],
    ['hello\n@we', 9, { start: 6, end: 9, query: 'we' }],
    ['hello\t@', 7, { start: 6, end: 7, query: '' }],
  ])('opens for %j with the caret at %i', (value, caret, expected) => {
    expect(findMentionTrigger(value, caret)).toEqual(expected);
  });

  it.each([
    ['an email address', 'write to me@host', 16],
    ['a handle glued to a word', 'abc@def', 7],
    ['a space after the token', '@web ', 5],
    ['text with no at sign', 'hello', 5],
    ['an empty text', '', 0],
    ['a newline after the token', '@web\n', 5],
  ])('stays closed for %s', (_name, value, caret) => {
    expect(findMentionTrigger(value, caret)).toBeNull();
  });

  it('follows the caret, not the end of the text', () => {
    expect(findMentionTrigger('@we and more', 3)).toEqual({ start: 0, end: 3, query: 'we' });
    expect(findMentionTrigger('@we and more', 9)).toBeNull();
  });

  it('finds a trigger after Arabic text (right-to-left)', () => {
    const value = 'مرحبا @وب';
    expect(findMentionTrigger(value, value.length)).toEqual({
      start: 6,
      end: value.length,
      query: 'وب',
    });
  });

  it('clamps a stale caret to the text', () => {
    expect(findMentionTrigger('@a', 99)).toEqual({ start: 0, end: 2, query: 'a' });
    expect(findMentionTrigger('@a', -4)).toBeNull();
  });
});

describe('filterMentionOptions', () => {
  const options = [
    view({ name: 'Web fetch' }),
    view({ name: 'Weather' }),
    view({ name: 'Date and math' }),
    view({ name: 'Disabled one', enabled: false }),
  ];

  it('lists every enabled plugin for an empty query', () => {
    expect(filterMentionOptions(options, '', new Set()).map((o) => o.name)).toEqual([
      'Web fetch',
      'Weather',
      'Date and math',
    ]);
  });

  it('never offers a disabled plugin', () => {
    expect(filterMentionOptions(options, 'disabled', new Set())).toEqual([]);
  });

  it('matches by name or slug, names that start with the text first', () => {
    const list = [view({ name: 'Tweather' }), view({ name: 'Weather' })];
    expect(filterMentionOptions(list, 'wea', new Set()).map((o) => o.name)).toEqual([
      'Weather',
      'Tweather',
    ]);
    expect(filterMentionOptions(options, 'date-and', new Set()).map((o) => o.name)).toEqual([
      'Date and math',
    ]);
  });

  it('ignores case', () => {
    expect(filterMentionOptions(options, 'WEB', new Set()).map((o) => o.name)).toEqual([
      'Web fetch',
    ]);
  });

  it('does not offer a plugin that is already chosen', () => {
    expect(filterMentionOptions(options, '', new Set(['id-Web fetch'])).map((o) => o.name)).toEqual(
      ['Weather', 'Date and math'],
    );
  });

  it('caps the rows', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      view({ name: `Plugin ${String(index)}` }),
    );
    expect(filterMentionOptions(many, '', new Set())).toHaveLength(PLUGIN_MENTION_MAX_OPTIONS);
  });
});

describe('applyMention', () => {
  it('replaces the typed token with @Name and a space, caret after it', () => {
    const value = 'summarise @we please';
    const trigger = findMentionTrigger(value, 13);
    expect(trigger).not.toBeNull();
    if (trigger === null) {
      return;
    }
    const edit = applyMention(value, trigger, 'Web fetch');
    expect(edit.value).toBe('summarise @Web fetch  please');
    expect(edit.caret).toBe('summarise @Web fetch '.length);
  });
});

describe('reconcileRefs', () => {
  const refs = [
    { installId: 'a', label: 'Web fetch' },
    { installId: 'b', label: 'Weather' },
  ];

  it('keeps chips whose @Name is still in the text', () => {
    expect(reconcileRefs(refs, 'use @Web fetch and @Weather')).toBe(refs);
  });

  it('drops a chip whose @Name was edited out, by label, not by position', () => {
    expect(reconcileRefs(refs, 'edited start. use @Weather')).toEqual([refs[1]]);
  });

  it('drops every chip from an empty text', () => {
    expect(reconcileRefs(refs, '')).toEqual([]);
  });
});

describe('removeMentionToken / mentionToken / mentionLabel', () => {
  it('removes the token and the one space after it', () => {
    expect(removeMentionToken('a @Weather b', 'Weather')).toBe('a b');
    expect(removeMentionToken('@Weather', 'Weather')).toBe('');
  });

  it('leaves the text alone when the token is not there', () => {
    expect(removeMentionToken('nothing', 'Weather')).toBe('nothing');
  });

  it('builds the token and bounds the label to what the server accepts', () => {
    expect(mentionToken('Weather')).toBe('@Weather');
    expect(mentionLabel(view({ name: `  ${'x'.repeat(200)}  ` }))).toHaveLength(80);
  });
});
