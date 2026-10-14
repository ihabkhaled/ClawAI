import { describe, expect, it } from 'vitest';

import { PAYG_STEP_CODES } from '../../constants/step-recorder.constants';
import { authorDraftSchema, reviewSchema } from '../../types/generation-pipeline.types';
import { revisionAuthorResponseSchema } from '../../types/revision-review.types';
import { clampReviewText } from '../clamp-review-text.utility';
import { parseStepError } from '../parse-step-error.utility';
import { sanitizeDraftMarkup } from '../sanitize-draft-markup.utility';

describe('reviewSchema', () => {
  it.each([
    ['Arabic', 'ن'.repeat(1_900)],
    ['German', 'Größenänderung '.repeat(127).slice(0, 1_900)],
  ])('shortens 1,900-char %s findings instead of rejecting', (_name, text) => {
    const parsed = reviewSchema.parse({
      score: 90,
      blockers: [text],
      findings: [text, text, text, text, text, text, text],
      revisionBrief: text,
    });
    expect(parsed.findings).toHaveLength(5);
    for (const finding of parsed.findings) expect([...finding].length).toBeLessThanOrEqual(280);
    expect([...(parsed.blockers[0] ?? '')].length).toBeLessThanOrEqual(280);
    expect(parsed.revisionBrief.length).toBeLessThanOrEqual(1_000);
  });

  it('drops blank findings and keeps short ones intact', () => {
    const parsed = reviewSchema.parse({
      score: 1,
      blockers: [],
      findings: ['  ', 'ok '],
      revisionBrief: '',
    });
    expect(parsed.findings).toEqual(['ok']);
  });

  it('never cuts a surrogate pair', () => {
    expect(clampReviewText('😀'.repeat(400))).toBe(`${'😀'.repeat(279)}\u2026`);
  });
});

describe('revisionAuthorResponseSchema', () => {
  it('accepts a 63-char echo and ignores it', () => {
    const parsed = revisionAuthorResponseSchema.parse({ agrees: true, draftHash: 'a'.repeat(63) });
    expect(parsed).toEqual({ agrees: true });
  });

  it('accepts a reply with no hash at all', () => {
    expect(revisionAuthorResponseSchema.parse({ agrees: false })).toEqual({ agrees: false });
  });
});

describe('sanitizeDraftMarkup', () => {
  it('flattens doubled citation groups', () => {
    expect(sanitizeDraftMarkup('Heat pumps [[id1], [id2]] work.')).toBe(
      'Heat pumps [id1] [id2] work.',
    );
    expect(sanitizeDraftMarkup('x [[a][b]] y')).toBe('x [a] [b] y');
  });

  it('keeps single citations and is idempotent', () => {
    const once = sanitizeDraftMarkup('Fact [id1]. More [[id2], [id3]].');
    expect(once).toBe('Fact [id1]. More [id2] [id3].');
    expect(sanitizeDraftMarkup(once)).toBe(once);
  });

  it('strips stray sup and sub tags, including at the end of an Arabic draft', () => {
    expect(sanitizeDraftMarkup('نص <sup>[a]</sup> ونص آخر.</sup>')).toBe('نص [a] ونص آخر.');
    expect(sanitizeDraftMarkup('H<sub class="x">2</SUB>O')).toBe('H2O');
  });

  it('runs inside the draft schema', () => {
    const draft = authorDraftSchema.parse({
      markdown: 'A [[e1], [e2]]</sup>',
      citations: [{ evidenceId: 'e1', url: 'https://example.com/a' }],
    });
    expect(draft.markdown).toBe('A [e1] [e2]');
  });
});

describe('parseStepError upstream outages', () => {
  it('reports a provider outage sent as 400 honestly as 503', () => {
    const error = new Error('Chat model request failed (400: CLOUD_PROVIDER_UNAVAILABLE)');
    expect(parseStepError(error)).toEqual({ code: 'PROVIDER_UNAVAILABLE', httpStatus: 503 });
  });

  it('keeps the real status of an upstream 5xx without a code', () => {
    expect(parseStepError(new Error('Chat model request failed (502)'))).toEqual({
      code: 'PROVIDER_ERROR',
      httpStatus: 502,
    });
  });

  it.each(PAYG_STEP_CODES)('keeps %s distinct', (code) => {
    const parsed = parseStepError(new Error(`Chat model request failed (402: ${code})`));
    expect(parsed).toEqual({ code, httpStatus: 402 });
  });

  it('reports an unpriced model refused by auth as PAYG_PRICE_UNAVAILABLE', () => {
    const parsed = parseStepError(
      new Error('Chat model request failed (402: PAYG_MODEL_UNPRICED)'),
    );
    expect(parsed).toEqual({ code: 'PAYG_PRICE_UNAVAILABLE', httpStatus: 402 });
  });
});
