import { describe, expect, it } from 'vitest';

import { countArticleWords, validateFormatted } from '../format-guard.utility';
import { isFormattedArticle } from '../is-formatted-article.utility';
import { FORMAT_FIXTURES, type FormatFixture } from './format-article.fixtures';

function input(fixture: FormatFixture, after: string, before = fixture.before) {
  return {
    before,
    after,
    evidenceIds: fixture.evidenceIds,
    citationUrls: fixture.urls,
    locale: fixture.locale,
  };
}

describe.each(FORMAT_FIXTURES)('format guard ($locale)', (fixture) => {
  it('accepts the typeset article: table, citations, numbers and sources preserved', () => {
    expect(validateFormatted(input(fixture, fixture.after))).toBeNull();
  });

  it('keeps the word count within the drift limit', () => {
    const before = countArticleWords(fixture.before, fixture.locale, fixture.evidenceIds);
    const after = countArticleWords(fixture.after, fixture.locale, fixture.evidenceIds);
    expect(Math.abs(after - before) / before).toBeLessThanOrEqual(0.15);
  });

  it('refuses a lost citation marker', () => {
    const after = fixture.after.replace('[a1b2c3d4]', '');
    expect(validateFormatted(input(fixture, after))).toBe('FORMAT_CITATION_LOST');
  });

  it('refuses an invented citation id', () => {
    const after = `${fixture.after}\n\nExtra claim [deadbeef00].`;
    expect(validateFormatted(input(fixture, after))).toBe('FORMAT_CITATION_ADDED');
  });

  it('refuses a changed number', () => {
    const after = fixture.after.replace('17', '19').replace('١٧', '١٩');
    expect(validateFormatted(input(fixture, after))).toBe('FORMAT_NUMBER_CHANGED');
  });

  it('refuses an invented number', () => {
    const after = fixture.after.replace('## ', '## 999 ').replace('- https', '- https');
    expect(validateFormatted(input(fixture, `${after}\n\nAbout 4242 more.`))).toBe(
      'FORMAT_NUMBER_CHANGED',
    );
  });

  it('refuses a url that is not cited', () => {
    const after = `${fixture.after}\n- https://evil.example/x`;
    expect(validateFormatted(input(fixture, after))).toBe('FORMAT_URL_ADDED');
  });

  it('refuses raw html the original did not have', () => {
    const after = fixture.after.replace('## ', '<div>x</div>\n\n## ');
    expect(validateFormatted(input(fixture, after))).toBe('FORMAT_RAW_HTML');
  });

  it('refuses a rewrite that shortens the article too much', () => {
    const short = ['# T', '', fixture.after.split('\n').slice(2, 6).join('\n')].join('\n');
    const result = validateFormatted(input(fixture, short));
    expect(result).not.toBeNull();
  });

  it('refuses an article with two titles or none', () => {
    expect(validateFormatted(input(fixture, `# Another\n\n${fixture.after}`))).toBe(
      'FORMAT_STRUCTURE',
    );
    expect(validateFormatted(input(fixture, fixture.after.replace(/^# .*\n/u, '')))).toBe(
      'FORMAT_STRUCTURE',
    );
  });

  it('is idempotent: an already typeset article passes against itself and is recognised as pretty', () => {
    expect(validateFormatted(input(fixture, fixture.after, fixture.after))).toBeNull();
    expect(isFormattedArticle(fixture.after)).toBe(true);
    expect(isFormattedArticle(fixture.before)).toBe(false);
  });
});

describe('format guard tables and headings', () => {
  const [english] = FORMAT_FIXTURES;
  const [, german] = FORMAT_FIXTURES;

  it('refuses to drop a table the article had', () => {
    if (!english) throw new Error('fixture');
    const withTable = english.after;
    const flat = `${withTable.replaceAll(/^\|.*\n/gmu, '')}\n\n22 17 0.9 0.7 [e5f6a7b8]`;
    expect(validateFormatted(input(english, flat, withTable))).toBe('FORMAT_TABLE_LOST');
  });

  it('refuses an English heading left in a German article', () => {
    if (!german) throw new Error('fixture');
    const after = german.after.replace('## Quellen', '## Sources');
    expect(validateFormatted(input(german, after))).toBe('FORMAT_HEADING_LANGUAGE');
  });

  it('refuses an empty reply', () => {
    if (!english) throw new Error('fixture');
    expect(validateFormatted(input(english, '  '))).toBe('FORMAT_EMPTY');
  });
});
