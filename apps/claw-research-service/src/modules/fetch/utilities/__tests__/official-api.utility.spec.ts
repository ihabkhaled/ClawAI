import { OfficialApiSource } from '../../enums/official-api-source.enum';
import { formatOfficialApiDocument } from '../official-api-format.utility';
import { resolveOfficialApiTarget } from '../official-api-resolver.utility';

describe('resolveOfficialApiTarget', () => {
  it.each([
    [
      'https://en.wikipedia.org/wiki/Web_scraping',
      OfficialApiSource.WIKIPEDIA,
      'https://en.wikipedia.org/api/rest_v1/page/html/Web_scraping',
    ],
    [
      'https://github.com/apify/impit',
      OfficialApiSource.GITHUB,
      'https://api.github.com/repos/apify/impit/readme',
    ],
    [
      'https://arxiv.org/abs/2401.01234v2',
      OfficialApiSource.ARXIV,
      'https://export.arxiv.org/api/query?id_list=2401.01234v2',
    ],
    [
      'https://doi.org/10.1145/3290605.3300233',
      OfficialApiSource.CROSSREF,
      'https://api.crossref.org/works/10.1145%2F3290605.3300233',
    ],
    [
      'https://news.ycombinator.com/item?id=8863',
      OfficialApiSource.HACKER_NEWS,
      'https://hacker-news.firebaseio.com/v0/item/8863.json',
    ],
  ])('maps %s to %s', (url, source, apiUrl) => {
    expect(resolveOfficialApiTarget(url)).toMatchObject({ source, apiUrl });
  });

  it.each([
    'https://en.wikipedia.org/wiki/Special:Random',
    'https://en.wikipedia.org/w/index.php?title=X',
    'https://github.com/apify/impit/issues/1',
    'https://github.com/trending/rust',
    'https://doi.org/not-a-doi',
    'https://news.ycombinator.com/item?id=abc',
    'https://example.com/',
    'not a url',
  ])('returns null for %s', (url) => {
    expect(resolveOfficialApiTarget(url)).toBeNull();
  });
});

describe('formatOfficialApiDocument', () => {
  it('formats an arXiv Atom entry', () => {
    const target = resolveOfficialApiTarget('https://arxiv.org/abs/1706.03762');
    if (target === null) {
      throw new Error('expected an arXiv target');
    }
    const xml = `<feed><entry><title>Attention Is All You Need</title><summary>The dominant sequence
      models...</summary><published>2017-06-12T17:57:34Z</published><author><name>Ashish Vaswani</name></author></entry></feed>`;

    const document = formatOfficialApiDocument(target, xml, 'https://arxiv.org/abs/1706.03762');

    expect(document.title).toBe('Attention Is All You Need');
    expect(document.content).toContain('Authors: Ashish Vaswani');
    expect(document.content).toContain('The dominant sequence models...');
  });

  it('throws on an empty arXiv feed', () => {
    const target = resolveOfficialApiTarget('https://arxiv.org/abs/0000.00000');
    if (target === null) {
      throw new Error('expected an arXiv target');
    }
    expect(() =>
      formatOfficialApiDocument(target, '<feed></feed>', 'https://arxiv.org/abs/0000.00000'),
    ).toThrow();
  });

  it('formats a Crossref work and strips JATS tags from the abstract', () => {
    const target = resolveOfficialApiTarget('https://doi.org/10.1000/xyz');
    if (target === null) {
      throw new Error('expected a DOI target');
    }
    const json = JSON.stringify({
      message: {
        title: ['A Paper'],
        abstract: '<jats:p>An abstract.</jats:p>',
        author: [{ given: 'Ada', family: 'Lovelace' }],
        'container-title': ['Journal'],
        published: { 'date-parts': [[1843]] },
        URL: 'https://doi.org/10.1000/xyz',
      },
    });

    const document = formatOfficialApiDocument(target, json, 'https://doi.org/10.1000/xyz');

    expect(document.content).toContain('# A Paper');
    expect(document.content).toContain('Ada Lovelace');
    expect(document.content).toContain('An abstract.');
    expect(document.content).toContain('1843');
  });

  it('formats a Hacker News item and throws on a null one', () => {
    const target = resolveOfficialApiTarget('https://news.ycombinator.com/item?id=1');
    if (target === null) {
      throw new Error('expected an HN target');
    }
    const document = formatOfficialApiDocument(
      target,
      JSON.stringify({
        id: 1,
        title: 'Y Combinator',
        by: 'pg',
        score: 57,
        url: 'http://ycombinator.com',
      }),
      'https://news.ycombinator.com/item?id=1',
    );
    expect(document.content).toContain('by pg · 57 points');
    expect(document.links).toEqual(['http://ycombinator.com']);
    expect(() =>
      formatOfficialApiDocument(target, 'null', 'https://news.ycombinator.com/item?id=1'),
    ).toThrow();
  });

  it('extracts a Wikipedia REST article through the shared page extraction', () => {
    const target = resolveOfficialApiTarget('https://en.wikipedia.org/wiki/Test');
    if (target === null) {
      throw new Error('expected a Wikipedia target');
    }
    const document = formatOfficialApiDocument(
      target,
      '<html><head><title>Test</title></head><body><p>Article body text.</p></body></html>',
      'https://en.wikipedia.org/wiki/Test',
    );
    expect(document.content).toContain('Article body text.');
  });
});
