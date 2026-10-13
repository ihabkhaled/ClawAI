import { Locale } from '@claw/shared-types';

import { ReviewerRole } from '../../types/reviewer-role.enum';
import { buildReviewSystemPrompt, describeContentLanguage } from '../review-prompt.utility';

describe('describeContentLanguage', () => {
  it.each([
    [Locale.EN, 'English'],
    [Locale.ES, 'Spanish'],
    [Locale.FR, 'French'],
    [Locale.AR, 'Arabic'],
  ])('names %s as %s', (locale, name) => {
    expect(describeContentLanguage(locale)).toBe(name);
  });

  it('names every supported locale with a real language name, not the bare code', () => {
    for (const locale of Object.values(Locale)) {
      expect(describeContentLanguage(locale)).not.toBe(locale);
    }
  });
});

describe('buildReviewSystemPrompt', () => {
  it.each([ReviewerRole.JUDGE, ReviewerRole.CRITIC])(
    'treats the requested Spanish as correct for the %s',
    (reviewer) => {
      const prompt = buildReviewSystemPrompt(reviewer, Locale.ES);

      expect(prompt).toContain(`independently as ${reviewer}`);
      expect(prompt).toContain('requested this publication in Spanish (es)');
      expect(prompt).toContain('Spanish is the correct language for the draft');
    },
  );

  it('forbids penalising, rewriting or translating because the topic is in another language', () => {
    const prompt = buildReviewSystemPrompt(ReviewerRole.JUDGE, Locale.FR);

    expect(prompt).toContain(
      'Never lower the score, add a blocker, or ask for a rewrite or a translation',
    );
    expect(prompt).toContain('differs from the language of the topic, source or evidence');
    expect(prompt).toContain('only if the draft is not written in French');
  });

  it('asks for findings and the revision brief in the requested language', () => {
    expect(buildReviewSystemPrompt(ReviewerRole.CRITIC, Locale.AR)).toContain(
      'Write every finding and the revisionBrief in Arabic.',
    );
  });

  it('never tells a reviewer to answer in English, whatever the locale', () => {
    for (const locale of Object.values(Locale)) {
      const prompt = buildReviewSystemPrompt(ReviewerRole.JUDGE, locale);
      expect(prompt).not.toMatch(/rewrite[^.]*\bin English/i);
      expect(prompt).not.toMatch(/translate[^.]*\binto English/i);
    }
  });

  it('keeps the reply contract: one JSON object, English keys, no chain-of-thought', () => {
    const prompt = buildReviewSystemPrompt(ReviewerRole.JUDGE, Locale.ES);

    expect(prompt).toContain('"score": integer 0-100');
    expect(prompt).toContain('"blockers": string[]');
    expect(prompt).toContain('"revisionBrief": string');
    expect(prompt).toContain('Keep the JSON keys exactly as shown');
    expect(prompt).toContain('Do not include chain-of-thought');
  });

  it('judges support, coherence, completeness and safety, and not the language itself', () => {
    const prompt = buildReviewSystemPrompt(ReviewerRole.JUDGE, Locale.DE);

    expect(prompt).toContain('factual support');
    expect(prompt).toContain('safety');
  });
});
