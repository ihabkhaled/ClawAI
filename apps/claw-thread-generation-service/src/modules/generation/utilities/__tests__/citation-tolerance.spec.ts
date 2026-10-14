import { normalizeEvidenceUrl, resolveEvidenceId } from '../citation-id.utility';
import { normalizeAuthorOutput } from '../normalize-author-output.utility';
import { citationTable } from '../citation-table.utility';

const EVIDENCE = new Map([
  ['a1a1a1a1', 'https://www.example.com/heat-pumps'],
  ['b2b2b2b2', 'https://example.org/guide?id=7'],
  ['c3c3c3c3', 'https://news.example.net/story/'],
]);

type Normalized = { markdown: string; citations: Array<{ evidenceId: string; url: string }> };
const normalize = (value: unknown): Normalized =>
  normalizeAuthorOutput(value, EVIDENCE) as Normalized;

describe('citation tolerance (ADR-181)', () => {
  it('recognises the same page written with a trailing slash, tracking parameters, another scheme or case', () => {
    expect(normalizeEvidenceUrl('HTTP://Example.COM/heat-pumps/?utm_source=x#top')).toBe(
      normalizeEvidenceUrl('https://www.example.com/heat-pumps'),
    );
    expect(resolveEvidenceId('https://example.com/heat-pumps/', EVIDENCE)).toBe('a1a1a1a1');
    expect(resolveEvidenceId('https://news.example.net/story?utm_campaign=z', EVIDENCE)).toBe(
      'c3c3c3c3',
    );
    expect(resolveEvidenceId('https://example.org/guide?id=8', EVIDENCE)).toBeNull();
  });

  it('fills the url from the bundle for a model that listed only the id', () => {
    const out = normalize({
      markdown: 'Text [a1a1a1a1].',
      citations: [{ evidenceId: 'a1a1a1a1' }, 'b2b2b2b2'],
    });
    expect(out.citations).toEqual([
      { evidenceId: 'a1a1a1a1', url: 'https://www.example.com/heat-pumps' },
      { evidenceId: 'b2b2b2b2', url: 'https://example.org/guide?id=7' },
    ]);
  });

  it('resolves a citation whose url is the bundle page written differently', () => {
    const out = normalize({
      markdown: 'x',
      citations: [{ evidenceId: 'wrong-id', url: 'https://example.com/heat-pumps/' }],
    });
    expect(out.citations).toEqual([
      { evidenceId: 'a1a1a1a1', url: 'https://www.example.com/heat-pumps' },
    ]);
  });

  it('drops a listed id that names nothing when another citation is real', () => {
    const out = normalize({
      markdown: 'x',
      citations: [
        { evidenceId: 'a1a1a1a1' },
        { evidenceId: 'made-up', url: 'https://nowhere.test' },
      ],
    });
    expect(out.citations.map(({ evidenceId }) => evidenceId)).toEqual(['a1a1a1a1']);
  });

  it('keeps unknown ids when nothing resolves, so the evidence rule still refuses the draft', () => {
    const out = normalize({
      markdown: 'x',
      citations: [{ evidenceId: 'made-up', url: 'https://nowhere.test' }],
    });
    expect(out.citations).toEqual([{ evidenceId: 'made-up', url: 'made-up' }]);
  });

  it('accepts numbers only when they point at the listed url, and rewrites the markers', () => {
    const out = normalize({
      markdown: 'First [1] and second [2], unrelated [3].',
      citations: [
        { evidenceId: '1', url: 'https://example.com/heat-pumps' },
        { evidenceId: '2', url: 'https://example.org/guide?id=7' },
      ],
    });
    expect(out.citations.map(({ evidenceId }) => evidenceId)).toEqual(['a1a1a1a1', 'b2b2b2b2']);
    expect(out.markdown).toBe('First [a1a1a1a1] and second [b2b2b2b2], unrelated [3].');
  });

  it('never guesses from a bare number without a matching url', () => {
    const out = normalize({ markdown: 'x [1]', citations: [{ evidenceId: '1' }] });
    expect(out.citations).toEqual([{ evidenceId: '1', url: '1' }]);
    const wrong = normalize({
      markdown: 'x',
      citations: [{ evidenceId: '1', url: 'https://example.org/guide?id=7' }],
    });
    // Number 1 would be the first item, but the url names another page: the url wins.
    expect(wrong.citations).toEqual([
      { evidenceId: 'b2b2b2b2', url: 'https://example.org/guide?id=7' },
    ]);
  });

  it('survives an empty markdown value, a non-object reply and an emoji or RTL body', () => {
    expect(normalizeAuthorOutput('text', EVIDENCE)).toBe('text');
    expect(normalizeAuthorOutput({ markdown: '' }, EVIDENCE)).toEqual({ markdown: '' });
    const out = normalize({ markdown: '😀 مرحبا [a1a1a1a1]', citations: [] });
    expect(out.citations).toEqual([
      { evidenceId: 'a1a1a1a1', url: 'https://www.example.com/heat-pumps' },
    ]);
  });
});

describe('citationTable', () => {
  it('lists id and url per line and nothing for an empty bundle', () => {
    expect(citationTable(EVIDENCE)).toContain('- a1a1a1a1 https://www.example.com/heat-pumps');
    expect(citationTable(new Map())).toBe('');
  });

  it('is bounded', () => {
    const many = new Map(
      Array.from({ length: 200 }, (_, i) => [`id${String(i)}`, `https://e.test/${String(i)}`]),
    );
    expect(citationTable(many).split('\n').length).toBeLessThan(70);
  });
});
