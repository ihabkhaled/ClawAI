import { z } from 'zod';

import { ModelOutputFailureKind } from '../../../../common/enums/model-output-failure-kind.enum';
import { authorDraftSchema } from '../../types/generation-pipeline.types';
import { toExcerpt } from '../redact-excerpt.utility';
import { classifyModelOutput, describeOutputFailure } from '../describe-output-failure.utility';

describe('classifyModelOutput', () => {
  it.each([
    ['', ModelOutputFailureKind.EMPTY],
    ['   \n ', ModelOutputFailureKind.EMPTY],
    ['Sure, here is your article.', ModelOutputFailureKind.PROSE],
    ['{"markdown": "cut off here', ModelOutputFailureKind.TRUNCATED],
    ['Intro {"markdown": "cut off', ModelOutputFailureKind.TRUNCATED],
    ['{markdown: not json}', ModelOutputFailureKind.INVALID_JSON],
    ['{"markdown": "x"}', ModelOutputFailureKind.WRONG_SHAPE],
    ['[1, 2, 3]', ModelOutputFailureKind.WRONG_SHAPE],
  ])('classifies %j as %s', (content, kind) => {
    expect(classifyModelOutput(content, authorDraftSchema)).toBe(kind);
  });
});

describe('describeOutputFailure', () => {
  it('puts the cause first and names the missing fields of a wrong-shaped object', () => {
    const text = describeOutputFailure('{"markdown": "x"}', authorDraftSchema);

    expect(text.startsWith('WRONG_SHAPE: The JSON did not have the requested fields.')).toBe(true);
    expect(text).toContain('Problem: citations.');
    expect(text).toContain('17 characters');
  });

  it('reports a content-rule failure without echoing the rule message', () => {
    const schema = z.object({ a: z.string() }).refine(() => false, { message: 'secret-detail' });

    const text = describeOutputFailure('{"a": "x"}', schema);

    expect(text).toContain('a content rule');
    expect(text).not.toContain('secret-detail');
  });

  it('shows where a cut-off reply stopped instead of cutting the reason off', () => {
    const long = `{"markdown": "${'word '.repeat(400)}`;

    const excerpt = toExcerpt(describeOutputFailure(long, authorDraftSchema));

    expect(excerpt).toContain('TRUNCATED: The reply was cut off before the JSON object ended.');
    expect(excerpt).toContain(`${String(long.length)} characters`);
    expect(excerpt).toContain('End: "');
    expect((excerpt ?? '').length).toBeLessThanOrEqual(600);
  });

  it('keeps the reason through the recorder redaction', () => {
    const text = describeOutputFailure(
      `Here you go. api_key: sk-abcdefghijklmnopqrstuvwxyz0123456789`,
      authorDraftSchema,
    );

    const excerpt = toExcerpt(text);

    expect(excerpt?.startsWith('PROSE:')).toBe(true);
    expect(excerpt).not.toContain('sk-abcdefghijklmnop');
  });

  it('handles an empty reply without a start or end', () => {
    expect(describeOutputFailure('', authorDraftSchema)).toBe('EMPTY: The model returned nothing.');
  });
});
