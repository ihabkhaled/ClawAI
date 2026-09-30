import { toStoredCitations } from '../stored-citations.utility';
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
