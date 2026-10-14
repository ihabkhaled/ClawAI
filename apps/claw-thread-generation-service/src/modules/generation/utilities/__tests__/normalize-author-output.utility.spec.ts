import { z } from 'zod';

import { authorDraftSchema } from '../../types/generation-pipeline.types';
import { normalizeAuthorOutput } from '../normalize-author-output.utility';
import { parseModelJson } from '../parse-model-json.utility';

const EVIDENCE = new Map([
  ['922197023defa567', 'https://example.com/a'],
  ['9f056d1e0e48b360', 'https://example.com/b'],
]);
const schema = z.preprocess(
  (value) => normalizeAuthorOutput(value, EVIDENCE),
  authorDraftSchema.refine((d) => d.citations.every((c) => EVIDENCE.get(c.evidenceId) === c.url)),
);

describe('author output tolerance', () => {
  it('accepts a json code fence with bare-string citations', () => {
    const reply =
      '```json\n{"markdown":"# T\\n\\nx [922197023defa567]","citations":["922197023defa567"]}\n```';
    const out = schema.safeParse(parseModelJson(reply, schema));
    expect(out.success).toBe(true);
  });

  it('accepts a prose-wrapped object with {id} citations and a missing url', () => {
    const reply =
      'Here is the draft:\n{"markdown":"# T\\n\\nx","citations":[{"id":"[9f056d1e0e48b360]"}]}\nDone.';
    const out = schema.safeParse(parseModelJson(reply, schema));
    expect(out.success && out.data.citations).toEqual([
      { evidenceId: '9f056d1e0e48b360', url: 'https://example.com/b' },
    ]);
  });

  it('derives citations from [id1, id2] and [[id]] markers when the list is missing', () => {
    const reply =
      '{"content":"# T\\n\\nx [922197023defa567, 9f056d1e0e48b360] y [[922197023defa567]]"}';
    const out = schema.safeParse(parseModelJson(reply, schema));
    expect(out.success && out.data.citations.map((c) => c.evidenceId)).toEqual([
      '922197023defa567',
      '9f056d1e0e48b360',
    ]);
  });

  it('still rejects a citation outside the evidence bundle', () => {
    const reply = '{"markdown":"# T","citations":["ffffffffffffffff"]}';
    expect(schema.safeParse(parseModelJson(reply, schema)).success).toBe(false);
  });

  it('still rejects prose with no JSON', () => {
    expect(schema.safeParse(parseModelJson('Sure, here is a long article', schema)).success).toBe(
      false,
    );
  });
});
