import { normaliseCitationMarkers, toStoredCitations } from '../stored-citations.utility';
import { type ResearchEvidenceCitation } from '../../types/context.types';

const item = (title: string | null, url: string, snippet = 'snippet'): ResearchEvidenceCitation =>
  ({
    id: url,
    title,
    url,
    snippet,
    source: 'web',
    providerKind: null,
    publishedAt: null,
    confidence: 0.8,
  }) as ResearchEvidenceCitation;

describe('toStoredCitations', () => {
  it('numbers sources exactly as the research block prints them: [index + 1]', () => {
    const stored = toStoredCitations([
      item('A', 'https://a.example'),
      item('B', 'https://b.example'),
    ]);

    expect(stored.map((citation) => [citation.index, citation.url])).toEqual([
      [1, 'https://a.example'],
      [2, 'https://b.example'],
    ]);
  });

  it('keeps a source whose URL is not http(s), so later numbers do not shift', () => {
    // The frontend decides what may become a link; dropping an entry here
    // would make every following [n] point at the wrong source.
    const stored = toStoredCitations([
      item('A', 'ftp://a.example'),
      item('B', 'https://b.example'),
    ]);

    expect(stored[1]).toMatchObject({ index: 2, url: 'https://b.example' });
  });

  it('bounds the stored title and snippet', () => {
    const [stored] = toStoredCitations([
      item('t'.repeat(500), 'https://a.example', 's'.repeat(900)),
    ]);

    expect(stored?.title).toHaveLength(300);
    expect(stored?.snippet).toHaveLength(280);
  });

  it('stores nothing when the turn had no research', () => {
    expect(toStoredCitations(undefined)).toEqual([]);
    expect(toStoredCitations([])).toEqual([]);
  });
});

describe('normaliseCitationMarkers', () => {
  it('turns the gpt-oss marks into the [n] the UI links (measured 2026-11-28)', () => {
    expect(normaliseCitationMarkers('ppi【12】 and refresh【1】【8】.', 20)).toBe(
      'ppi[12] and refresh[1][8].',
    );
    expect(normaliseCitationMarkers('A【3†L1-L4】 B【1, 2】 C【4、5】', 5)).toBe(
      'A[3] B[1][2] C[4][5]',
    );
  });

  it('splits a bracketed list into linkable marks, only when every number is a shown source', () => {
    expect(normaliseCitationMarkers('Docker [2, 4, 23] and 【1】.', 30)).toBe(
      'Docker [2][4][23] and [1].',
    );
    expect(normaliseCitationMarkers('Years [1998, 2004] and [2, 99]', 30)).toBe(
      'Years [1998, 2004] and [2, 99]',
    );
  });

  it('never rewrites code or an indexing expression', () => {
    const code =
      'Use `const ids = [1, 2]` or\n```ts\nconst pairs = [2, 3];\n```\nand matrix[1, 2].';
    expect(normaliseCitationMarkers(`${code} See [1, 2]`, 5)).toBe(`${code} See [1][2]`);
  });

  it('never touches CJK headings, unknown numbers or answers without research', () => {
    expect(normaliseCitationMarkers('【重要】 注意【2024】 【7】', 5)).toBe(
      '【重要】 注意【2024】 【7】',
    );
    expect(normaliseCitationMarkers('A【1】', 0)).toBe('A【1】');
    expect(normaliseCitationMarkers('plain [1] text', 3)).toBe('plain [1] text');
  });
});

describe('toStoredCitations cap', () => {
  const sources = (count: number): ResearchEvidenceCitation[] =>
    Array.from({ length: count }, (_, index) => ({
      id: String(index + 1),
      title: `Source ${String(index + 1)}`,
      url: `https://example.org/${String(index + 1)}`,
      snippet: 'text',
      source: 'search',
      providerKind: null,
      publishedAt: null,
      confidence: 1,
    }));

  it('keeps every source research rounds gather, so [53] stays linkable (measured: was cut at 50)', () => {
    const stored = toStoredCitations(sources(72));
    expect(stored).toHaveLength(72);
    expect(stored.at(52)).toMatchObject({ index: 53, url: 'https://example.org/53' });
  });

  it('still caps the stored list at the largest crawl', () => {
    expect(toStoredCitations(sources(240))).toHaveLength(200);
  });
});
