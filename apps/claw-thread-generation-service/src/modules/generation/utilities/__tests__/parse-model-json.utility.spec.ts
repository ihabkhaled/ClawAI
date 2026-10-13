import { z } from 'zod';

import { parseModelJson } from '../parse-model-json.utility';

const FENCE = '```';
const draft = z.object({ markdown: z.string(), citations: z.array(z.unknown()) });

describe('parseModelJson', () => {
  it('reads bare JSON', () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('reads JSON inside a single code fence', () => {
    expect(parseModelJson(`${FENCE}json\n{"a":1}\n${FENCE}`)).toEqual({ a: 1 });
  });

  it('reads a fence that carries prose before and after it', () => {
    const reply = `Here is the draft you asked for:\n\n${FENCE}json\n{"a":{"b":2}}\n${FENCE}\n\nLet me know!`;
    expect(parseModelJson(reply)).toEqual({ a: { b: 2 } });
  });

  it('reads a fence whose language tag is not lowercase json', () => {
    expect(parseModelJson(`${FENCE}JSON {"a":1} ${FENCE}`)).toEqual({ a: 1 });
  });

  it('extracts the first object from surrounding prose', () => {
    expect(parseModelJson('Sure. {"score":80,"blockers":[]} Hope that helps.')).toEqual({
      score: 80,
      blockers: [],
    });
  });

  it('balances nested braces', () => {
    const reply = 'Result: {"a":{"b":{"c":[{"d":1}]}},"e":2} done';
    expect(parseModelJson(reply)).toEqual({ a: { b: { c: [{ d: 1 }] } }, e: 2 });
  });

  it('ignores braces inside strings, including escaped quotes', () => {
    const reply = 'Draft: {"markdown":"use { and } and \\" } here","citations":[]} thanks';
    expect(parseModelJson(reply)).toEqual({
      markdown: 'use { and } and " } here',
      citations: [],
    });
  });

  it('skips a stray brace pair in the prose before the object', () => {
    expect(parseModelJson('Note {not json} then {"a":1}')).toEqual({ a: 1 });
  });

  it('strips a byte order mark and surrounding whitespace', () => {
    expect(parseModelJson('﻿  \n{"a":1}\n ')).toEqual({ a: 1 });
  });

  it('prefers the object the schema accepts over an earlier example', () => {
    const reply = 'Format: {"example":true}\nAnswer: {"markdown":"x","citations":[]}';
    expect(parseModelJson(reply, draft)).toEqual({ markdown: 'x', citations: [] });
    expect(parseModelJson(reply)).toEqual({ example: true });
  });

  it('returns the first candidate when no schema accepts one, so the caller can report it', () => {
    expect(parseModelJson('{"other":1}', draft)).toEqual({ other: 1 });
  });

  it('does not read objects nested in a reply that is itself valid JSON', () => {
    expect(parseModelJson('{"wrapper":{"markdown":"x","citations":[]}}', draft)).toEqual({
      wrapper: { markdown: 'x', citations: [] },
    });
  });

  it('returns undefined for an empty or blank reply', () => {
    expect(parseModelJson('')).toBeUndefined();
    expect(parseModelJson('  \n\t ')).toBeUndefined();
  });

  it('returns undefined for prose without JSON', () => {
    expect(parseModelJson('I cannot help with that, sorry.')).toBeUndefined();
    expect(parseModelJson('# Title\n\nJust markdown with a list:\n- a\n- b')).toBeUndefined();
  });

  it('returns undefined for a truncated object, never a smaller valid one', () => {
    expect(parseModelJson('{"markdown":"cut off here')).toBeUndefined();
    expect(parseModelJson('{"a":{"b":1},"markdown":"cut')).toBeUndefined();
    expect(parseModelJson(`${FENCE}json\n{"a":{"b":1},"c":[1,2\n`)).toBeUndefined();
  });

  it('returns undefined when the braces balance but the text is not JSON', () => {
    expect(parseModelJson('{a: 1, b: 2}')).toBeUndefined();
  });

  it('stays bounded on a reply made of thousands of broken objects', () => {
    expect(parseModelJson('{x} '.repeat(5_000))).toBeUndefined();
  });
});
