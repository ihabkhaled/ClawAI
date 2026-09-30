import { describe, expect, it } from 'vitest';

import { appendToDraft, fillTemplate, parsePromptTags } from '../prompt-template.utility';

describe('fillTemplate', () => {
  it('replaces every occurrence of a placeholder', () => {
    expect(fillTemplate('Hi {{name}}, bye {{name}}', { name: 'Sam' })).toBe('Hi Sam, bye Sam');
  });

  it('fills several different placeholders', () => {
    expect(fillTemplate('{{a}}-{{b}}', { a: '1', b: '2' })).toBe('1-2');
  });

  it('leaves a placeholder with no value as written', () => {
    expect(fillTemplate('{{a}} {{b}}', { a: 'x' })).toBe('x {{b}}');
  });

  it('inserts replacement text verbatim, including $ patterns', () => {
    expect(fillTemplate('{{a}}', { a: '$& $1 $$' })).toBe('$& $1 $$');
  });

  it('ignores malformed placeholders', () => {
    expect(fillTemplate('{{Bad}} {{ a }} {a}', { a: 'x', Bad: 'y' })).toBe('{{Bad}} {{ a }} {a}');
  });

  it('returns the body unchanged when it has no placeholders', () => {
    expect(fillTemplate('plain', { a: 'x' })).toBe('plain');
  });
});

describe('parsePromptTags', () => {
  it('trims, lowercases, drops blanks and dedupes', () => {
    expect(parsePromptTags(' Work, work ,, Email ')).toEqual(['work', 'email']);
  });

  it('caps the count at 10 and the length at 32', () => {
    const many = Array.from({ length: 15 }, (_, i) => `t${i}`).join(',');
    expect(parsePromptTags(many)).toHaveLength(10);
    expect(parsePromptTags('x'.repeat(40))[0]).toHaveLength(32);
  });
});

describe('appendToDraft', () => {
  it('returns the text alone for an empty draft', () => {
    expect(appendToDraft('  ', 'hello')).toBe('hello');
  });

  it('appends on a new line to an existing draft', () => {
    expect(appendToDraft('first', 'second')).toBe('first\nsecond');
  });
});
