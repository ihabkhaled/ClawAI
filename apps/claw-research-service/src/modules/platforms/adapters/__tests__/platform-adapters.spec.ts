import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformApiKind } from '../../../../generated/prisma';
import { PLATFORM_API_MAX_BYTES } from '../../constants/platform-api.constants';
import { PlatformHostRefusedError } from '../../errors/platform-host-refused.error';
import {
  assertPlatformApiUrl,
  isPlatformApiHost,
  platformApiGet,
} from '../../utilities/platform-http.utility';
import { ArxivAdapter } from '../arxiv.adapter';
import { CrossrefAdapter } from '../crossref.adapter';
import { GithubAdapter } from '../github.adapter';
import { HnAlgoliaAdapter } from '../hn-algolia.adapter';
import { OpenAlexAdapter } from '../openalex.adapter';
import { PlatformApiAdapterFactory } from '../platform-api-adapter.factory';
import { PubMedAdapter } from '../pubmed.adapter';
import { SemanticScholarAdapter } from '../semantic-scholar.adapter';
import { StackExchangeAdapter } from '../stack-exchange.adapter';
import { WikipediaAdapter } from '../wikipedia.adapter';
import type { PlatformApiContext } from '../../types/platform.types';

const pinnedFetchMock = vi.hoisted(() => vi.fn());
vi.mock('../../../fetch/utilities/pinned-fetch.utility', () => ({ pinnedFetch: pinnedFetchMock }));

function response(body: string, status = 200, location: string | null = null): Response {
  const bytes = new TextEncoder().encode(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name === 'location' ? location : null) },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  } as unknown as Response;
}

const context = (onNetworkCall = vi.fn(async () => {})): PlatformApiContext => ({
  signal: AbortSignal.timeout(5_000),
  onNetworkCall,
});

const requestedUrl = (call = 0): URL => new URL(String(pinnedFetchMock.mock.calls[call]?.[0]));
const requestHeaders = (call = 0): Record<string, string> =>
  (pinnedFetchMock.mock.calls[call]?.[2] as { headers: Record<string, string> }).headers;

// ── Realistic fixtures (trimmed real answers, 2026-11) ──────────────────────
const OPENALEX = JSON.stringify({
  meta: { count: 2 },
  results: [
    {
      id: 'https://openalex.org/W2741809807',
      doi: 'https://doi.org/10.7717/peerj.4375',
      display_name: 'The state of OA: a large-scale analysis',
      publication_date: '2018-02-13',
      abstract_inverted_index: { Despite: [0], growing: [1], interest: [2], in: [3], OA: [4] },
      primary_location: { landing_page_url: 'https://peerj.com/articles/4375', source: null },
    },
    { id: 'https://openalex.org/W1', display_name: null, doi: null },
    {
      id: 'https://openalex.org/W2',
      doi: null,
      display_name: 'Only an <i>OpenAlex</i> id',
      publication_date: null,
      abstract_inverted_index: null,
      primary_location: null,
    },
  ],
});

const SEMANTIC_SCHOLAR = JSON.stringify({
  total: 2,
  offset: 0,
  data: [
    {
      paperId: '649def34f8be52c8b66281af98ae884c09aef38b',
      title: 'Construction of the Literature Graph in Semantic Scholar',
      url: 'https://www.semanticscholar.org/paper/649def34f8be52c8b66281af98ae884c09aef38b',
      abstract: 'We describe a deployed scalable system.',
      year: 2018,
      venue: 'NAACL',
    },
    {
      paperId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      title: 'No url, no abstract',
      url: null,
      abstract: null,
      year: 2020,
      venue: 'arXiv.org',
    },
  ],
});

const PUBMED_SEARCH = JSON.stringify({
  header: { type: 'esearch' },
  esearchresult: { count: '2', idlist: ['38012345', '37999999', 'DROP;TABLE'] },
});
const PUBMED_SUMMARY = JSON.stringify({
  header: { type: 'esummary' },
  result: {
    uids: ['38012345', '37999999'],
    '38012345': {
      uid: '38012345',
      title: 'Machine learning in clinical practice.',
      fulljournalname: 'The Lancet. Digital health',
      pubdate: '2023 Dec',
      sortpubdate: '2023/12/01 00:00',
      authors: [{ name: 'Smith J' }, { name: 'Doe A' }],
    },
    '37999999': { uid: '37999999', title: '' },
  },
});

const CROSSREF = JSON.stringify({
  status: 'ok',
  message: {
    items: [
      {
        DOI: '10.1038/nature14539',
        URL: 'https://doi.org/10.1038/nature14539',
        title: ['Deep learning'],
        abstract:
          '<jats:p>Deep learning allows <jats:italic>computational</jats:italic> models.</jats:p>',
        published: { 'date-parts': [[2015, 5, 27]] },
        'container-title': ['Nature'],
      },
      {
        DOI: '10.1000/xyz',
        title: ['No URL field'],
        published: { 'date-parts': [[2019]] },
        'container-title': ['Journal X'],
      },
    ],
  },
});

const ARXIV = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="html">ArXiv Query: search_query=all:machine learning</title>
  <id>http://arxiv.org/api/abcd</id>
  <entry>
    <id>http://arxiv.org/abs/2101.00001v2</id>
    <published>2021-01-01T00:00:00Z</published>
    <title>A Survey of
      Machine Learning</title>
    <summary>  We survey &amp; compare methods.  </summary>
    <author><name>Ada Lovelace</name></author>
  </entry>
  <entry>
    <id>javascript:alert(1)</id>
    <title>Bad id</title>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2202.00002v1</id>
    <published>2022-02-02T00:00:00Z</published>
    <title>Second paper</title>
  </entry>
</feed>`;

const STACK_EXCHANGE = JSON.stringify({
  items: [
    {
      tags: ['python', 'machine-learning'],
      is_answered: true,
      answer_count: 3,
      score: 42,
      creation_date: 1_600_000_000,
      link: 'https://stackoverflow.com/questions/123/how-to-train',
      title: 'How to train a model &amp; keep it &#39;fast&#39;?',
    },
    { title: 'no link' },
  ],
  has_more: true,
  quota_remaining: 290,
});

const HN = JSON.stringify({
  hits: [
    {
      objectID: '39000000',
      title: 'Show HN: A tiny ML library',
      url: 'https://example.org/tiny-ml',
      points: 321,
      num_comments: 87,
      created_at: '2024-01-15T10:00:00Z',
      story_text: null,
    },
    { objectID: 'not-a-number', title: 'bad id' },
  ],
});

const GITHUB = JSON.stringify({
  total_count: 2,
  items: [
    {
      full_name: 'scikit-learn/scikit-learn',
      html_url: 'https://github.com/scikit-learn/scikit-learn',
      description: 'scikit-learn: machine learning in Python',
      stargazers_count: 60_000,
      language: 'Python',
      created_at: '2010-08-17T09:43:38Z',
      pushed_at: '2026-11-20T12:00:00Z',
    },
    { full_name: 'x/y', html_url: 'ftp://github.com/x/y' },
  ],
});

const WIKIPEDIA = JSON.stringify({
  batchcomplete: '',
  query: {
    searchinfo: { totalhits: 2 },
    search: [
      {
        ns: 0,
        title: 'Machine learning',
        pageid: 233488,
        snippet:
          '<span class="searchmatch">Machine</span> <span class="searchmatch">learning</span> (ML) is a field',
      },
      { ns: 0, title: 'Apprentissage automatique', pageid: 1, snippet: '' },
    ],
  },
});

describe('platform API adapters — parsers on realistic fixtures', () => {
  it('OpenAlex: landing page, else DOI, else the record; abstract rebuilt; no title = skipped', () => {
    const hits = new OpenAlexAdapter().parse(OPENALEX, 5);
    expect(hits).toEqual([
      {
        title: 'The state of OA: a large-scale analysis',
        url: 'https://peerj.com/articles/4375',
        snippet: 'Despite growing interest in OA',
        publishedAt: '2018-02-13',
      },
      {
        title: 'Only an OpenAlex id',
        url: 'https://openalex.org/W2',
        snippet: null,
        publishedAt: null,
      },
    ]);
  });

  it('Semantic Scholar: paper page (or built from a 40-hex id), abstract else venue · year', () => {
    const hits = new SemanticScholarAdapter().parse(SEMANTIC_SCHOLAR, 5);
    expect(hits.map((hit) => [hit.url, hit.snippet, hit.publishedAt])).toEqual([
      [
        'https://www.semanticscholar.org/paper/649def34f8be52c8b66281af98ae884c09aef38b',
        'We describe a deployed scalable system.',
        '2018',
      ],
      [
        'https://www.semanticscholar.org/paper/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'arXiv.org · 2020',
        '2020',
      ],
    ]);
  });

  it('PubMed: ids are digits only; summaries in uid order; empty titles skipped', () => {
    const adapter = new PubMedAdapter();
    expect(adapter.parseIds(PUBMED_SEARCH, 5)).toEqual(['38012345', '37999999']);
    expect(adapter.parse(PUBMED_SUMMARY, 5)).toEqual([
      {
        title: 'Machine learning in clinical practice.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38012345/',
        snippet: 'The Lancet. Digital health · 2023 Dec · Smith J, Doe A',
        publishedAt: '2023-12-01',
      },
    ]);
  });

  it('Crossref: JATS stripped, DOI link built when URL is missing, date-parts padded', () => {
    const hits = new CrossrefAdapter().parse(CROSSREF, 5);
    expect(hits).toEqual([
      {
        title: 'Deep learning',
        url: 'https://doi.org/10.1038/nature14539',
        snippet: 'Deep learning allows computational models.',
        publishedAt: '2015-05-27',
      },
      {
        title: 'No URL field',
        url: 'https://doi.org/10.1000/xyz',
        snippet: 'Journal X',
        publishedAt: '2019-01-01',
      },
    ]);
  });

  it('arXiv: linear Atom scan, entries only (never the feed title), https ids, bad ids skipped', () => {
    const hits = new ArxivAdapter().parse(ARXIV, 5);
    expect(hits).toEqual([
      {
        title: 'A Survey of Machine Learning',
        url: 'https://arxiv.org/abs/2101.00001v2',
        snippet: 'We survey & compare methods.',
        publishedAt: '2021-01-01T00:00:00Z',
      },
      {
        title: 'Second paper',
        url: 'https://arxiv.org/abs/2202.00002v1',
        snippet: null,
        publishedAt: '2022-02-02T00:00:00Z',
      },
    ]);
    expect(new ArxivAdapter().parse(ARXIV, 1)).toHaveLength(1);
  });

  it('Stack Exchange: entities decoded; tags · score · answers; unix date', () => {
    const [hit, ...rest] = new StackExchangeAdapter().parse(STACK_EXCHANGE, 5);
    expect(rest).toEqual([]);
    expect(hit).toEqual({
      title: "How to train a model & keep it 'fast'?",
      url: 'https://stackoverflow.com/questions/123/how-to-train',
      snippet: 'Tags: python, machine-learning · score 42 · 3 answers · answered',
      publishedAt: new Date(1_600_000_000 * 1000).toISOString(),
    });
  });

  it('HN Algolia: the HN discussion URL, the story link in the snippet, numeric ids only', () => {
    expect(new HnAlgoliaAdapter().parse(HN, 5)).toEqual([
      {
        title: 'Show HN: A tiny ML library',
        url: 'https://news.ycombinator.com/item?id=39000000',
        snippet: 'Link: https://example.org/tiny-ml · 321 points · 87 comments',
        publishedAt: '2024-01-15T10:00:00Z',
      },
    ]);
  });

  it('GitHub: repo page; description · stars · language · last push; non-http URLs skipped', () => {
    expect(new GithubAdapter().parse(GITHUB, 5)).toEqual([
      {
        title: 'scikit-learn/scikit-learn',
        url: 'https://github.com/scikit-learn/scikit-learn',
        snippet:
          'scikit-learn: machine learning in Python · 60000 stars · Python · last push 2026-11-20',
        publishedAt: '2010-08-17T09:43:38Z',
      },
    ]);
  });

  it('Wikipedia: article URL on the same edition, searchmatch markup stripped', () => {
    const hits = new WikipediaAdapter().parse(WIKIPEDIA, 5, 'fr');
    expect(hits.map((hit) => [hit.url, hit.snippet])).toEqual([
      ['https://fr.wikipedia.org/wiki/Machine_learning', 'Machine learning (ML) is a field'],
      ['https://fr.wikipedia.org/wiki/Apprentissage_automatique', null],
    ]);
  });
});

describe('platform API adapters — malformed and oversized input', () => {
  const adapters = [
    new OpenAlexAdapter(),
    new SemanticScholarAdapter(),
    new PubMedAdapter(),
    new CrossrefAdapter(),
    new StackExchangeAdapter(),
    new HnAlgoliaAdapter(),
    new GithubAdapter(),
    new WikipediaAdapter(),
  ];

  it.each(adapters.map((adapter) => [adapter.kind, adapter] as const))(
    '%s: non-JSON is a named error, wrong shapes are empty',
    (kind, adapter) => {
      expect(() => adapter.parse('<html>rate limited</html>', 5)).toThrow(
        new RegExp(`${kind} API returned malformed JSON`, 'u'),
      );
      for (const body of ['null', '[]', '42', '{"results":{},"data":"x","items":7,"hits":null}']) {
        expect(adapter.parse(body, 5)).toEqual([]);
      }
    },
  );

  it('arXiv: unclosed, truncated or tag-less feeds yield what is complete, never throw', () => {
    const adapter = new ArxivAdapter();
    expect(adapter.parse('', 5)).toEqual([]);
    expect(adapter.parse('<feed><entry><id>https://arxiv.org/abs/1</id><title>x', 5)).toEqual([]);
    expect(
      adapter.parse('<entry><titlex>no</titlex><id>https://arxiv.org/abs/1</id></entry>', 5),
    ).toEqual([]);
  });

  it('an OpenAlex inverted index only keeps the first positions (bounded)', () => {
    const index = Object.fromEntries(
      Array.from({ length: 5_000 }, (_, i) => [`w${String(i)}`, [i]]),
    );
    const body = JSON.stringify({
      results: [
        { id: 'https://openalex.org/W9', display_name: 'Big', abstract_inverted_index: index },
      ],
    });
    const [hit] = new OpenAlexAdapter().parse(body, 1);
    expect(hit?.snippet?.length).toBeLessThanOrEqual(1_001);
    expect(hit?.snippet?.startsWith('w0 w1 w2')).toBe(true);
  });

  it('a body over PLATFORM_API_MAX_BYTES is refused while reading', async () => {
    pinnedFetchMock.mockReset().mockResolvedValue(response('x'.repeat(PLATFORM_API_MAX_BYTES + 1)));

    await expect(
      new GithubAdapter().search({ query: 'q', maxResults: 5, language: null }, context()),
    ).rejects.toThrow(/exceeds max size/u);
  });
});

describe('platform API adapters — wire', () => {
  beforeEach(() => {
    pinnedFetchMock.mockReset();
  });

  it.each([
    [
      new OpenAlexAdapter(),
      OPENALEX,
      'api.openalex.org',
      '/works',
      { search: 'deep nets', 'per-page': '3' },
    ],
    [
      new SemanticScholarAdapter(),
      SEMANTIC_SCHOLAR,
      'api.semanticscholar.org',
      '/graph/v1/paper/search',
      { query: 'deep nets', limit: '3', fields: 'title,url,abstract,year,venue,externalIds' },
    ],
    [
      new CrossrefAdapter(),
      CROSSREF,
      'api.crossref.org',
      '/works',
      { query: 'deep nets', rows: '3' },
    ],
    [
      new ArxivAdapter(),
      ARXIV,
      'export.arxiv.org',
      '/api/query',
      { search_query: 'all:deep nets', max_results: '3' },
    ],
    [
      new StackExchangeAdapter(),
      STACK_EXCHANGE,
      'api.stackexchange.com',
      '/2.3/search/advanced',
      { q: 'deep nets', site: 'stackoverflow', pagesize: '3', sort: 'relevance', order: 'desc' },
    ],
    [
      new HnAlgoliaAdapter(),
      HN,
      'hn.algolia.com',
      '/api/v1/search',
      { query: 'deep nets', hitsPerPage: '3' },
    ],
    [
      new GithubAdapter(),
      GITHUB,
      'api.github.com',
      '/search/repositories',
      { q: 'deep nets', per_page: '3' },
    ],
  ] as const)(
    '%s calls its fixed https host with the query, one unit, no secret or email',
    async (adapter, body, host, path, params) => {
      pinnedFetchMock.mockResolvedValue(response(body));
      const meter = vi.fn(async () => {});

      const hits = await adapter.search(
        { query: 'deep nets', maxResults: 3, language: null },
        context(meter),
      );

      expect(hits.length).toBeGreaterThan(0);
      expect(meter).toHaveBeenCalledTimes(1);
      const url = requestedUrl();
      expect(url.protocol).toBe('https:');
      expect(url.host).toBe(host);
      expect(url.pathname).toBe(path);
      for (const [key, value] of Object.entries(params)) {
        expect(url.searchParams.get(key)).toBe(value);
      }
      expect(url.search).not.toMatch(/mailto|email|api_?key|token/iu);
      expect(requestHeaders()['User-Agent']).toBe('ClawAI-ResearchBot/1.0');
      expect(JSON.stringify(requestHeaders())).not.toMatch(/@|authorization/iu);
    },
  );

  it('PubMed: esearch then esummary (two units); no second call when nothing matched', async () => {
    pinnedFetchMock
      .mockResolvedValueOnce(response(PUBMED_SEARCH))
      .mockResolvedValueOnce(response(PUBMED_SUMMARY));
    const meter = vi.fn(async () => {});

    const hits = await new PubMedAdapter().search(
      { query: 'ml', maxResults: 5, language: null },
      context(meter),
    );

    expect(hits).toHaveLength(1);
    expect(meter).toHaveBeenCalledTimes(2);
    expect(requestedUrl(0).pathname).toBe('/entrez/eutils/esearch.fcgi');
    expect(requestedUrl(1).searchParams.get('id')).toBe('38012345,37999999');

    pinnedFetchMock.mockReset().mockResolvedValueOnce(response('{"esearchresult":{"idlist":[]}}'));
    const none = vi.fn(async () => {});
    await expect(
      new PubMedAdapter().search({ query: 'zzz', maxResults: 5, language: null }, context(none)),
    ).resolves.toEqual([]);
    expect(pinnedFetchMock).toHaveBeenCalledTimes(1);
    expect(none).toHaveBeenCalledTimes(1);
  });

  it('Wikipedia: the requested edition host; an invalid language is refused with no request and no unit', async () => {
    pinnedFetchMock.mockResolvedValue(response(WIKIPEDIA));
    const meter = vi.fn(async () => {});

    await new WikipediaAdapter().search(
      { query: 'ml', maxResults: 2, language: 'ar' },
      context(meter),
    );
    expect(requestedUrl().host).toBe('ar.wikipedia.org');
    expect(requestedUrl().searchParams.get('srsearch')).toBe('ml');

    pinnedFetchMock.mockClear();
    meter.mockClear();
    for (const language of ['en.evil.example', 'EN', 'e', 'abcd', '../x']) {
      await expect(
        new WikipediaAdapter().search({ query: 'ml', maxResults: 2, language }, context(meter)),
      ).rejects.toBeInstanceOf(PlatformHostRefusedError);
    }
    expect(pinnedFetchMock).not.toHaveBeenCalled();
    expect(meter).not.toHaveBeenCalled();
  });

  it('a non-2xx answer is an error naming the API and the status', async () => {
    pinnedFetchMock.mockResolvedValue(response('{"message":"API rate limit exceeded"}', 403));

    await expect(
      new GithubAdapter().search({ query: 'q', maxResults: 5, language: null }, context()),
    ).rejects.toThrow('GITHUB API answered HTTP 403');
  });

  it('arXiv query syntax characters never reach the API as operators', async () => {
    pinnedFetchMock.mockResolvedValue(response(ARXIV));

    await new ArxivAdapter().search(
      { query: 'ti:"x" AND (y) OR z*', maxResults: 2, language: null },
      context(),
    );

    expect(requestedUrl().searchParams.get('search_query')).toBe('all:ti x AND y OR z');
  });
});

describe('platform host allow-list (SSRF)', () => {
  beforeEach(() => {
    pinnedFetchMock.mockReset();
  });

  it('allows the fixed API hosts and 2-3 letter Wikipedia editions only', () => {
    expect(isPlatformApiHost('api.openalex.org')).toBe(true);
    expect(isPlatformApiHost('de.wikipedia.org')).toBe(true);
    expect(isPlatformApiHost('evil.wikipedia.org.example')).toBe(false);
    expect(isPlatformApiHost('wikipedia.org')).toBe(false);
    expect(isPlatformApiHost('api.github.com.evil.example')).toBe(false);
  });

  it.each([
    'https://evil.example/works',
    'http://api.openalex.org/works',
    'https://api.openalex.org:8443/works',
    'https://user:pw@api.github.com/search',
    'https://169.254.169.254/latest',
    'https://127.0.0.1/',
    'not a url',
  ])('refuses %s before the metering hook and before any request', async (url) => {
    const meter = vi.fn(async () => {});

    await expect(
      platformApiGet(url, {
        label: 'X',
        accept: 'application/json',
        signal: AbortSignal.timeout(1_000),
        onNetworkCall: meter,
      }),
    ).rejects.toBeInstanceOf(PlatformHostRefusedError);
    expect(() => assertPlatformApiUrl(url)).toThrow(PlatformHostRefusedError);
    expect(meter).not.toHaveBeenCalled();
    expect(pinnedFetchMock).not.toHaveBeenCalled();
  });

  it('a redirect off the allow-list is refused before the second request is sent', async () => {
    pinnedFetchMock.mockResolvedValueOnce(response('', 302, 'https://evil.example/steal'));

    await expect(
      new OpenAlexAdapter().search({ query: 'q', maxResults: 2, language: null }, context()),
    ).rejects.toBeInstanceOf(PlatformHostRefusedError);
    expect(pinnedFetchMock).toHaveBeenCalledTimes(1);
  });

  it('a redirect to a private address is refused before it is requested', async () => {
    pinnedFetchMock.mockResolvedValueOnce(response('', 301, 'http://10.0.0.5/admin'));

    await expect(
      new CrossrefAdapter().search({ query: 'q', maxResults: 2, language: null }, context()),
    ).rejects.toThrow();
    expect(pinnedFetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('PlatformApiAdapterFactory', () => {
  const adapters = [
    new OpenAlexAdapter(),
    new SemanticScholarAdapter(),
    new PubMedAdapter(),
    new CrossrefAdapter(),
    new ArxivAdapter(),
    new StackExchangeAdapter(),
    new HnAlgoliaAdapter(),
    new GithubAdapter(),
    new WikipediaAdapter(),
  ] as const;
  const factory = new PlatformApiAdapterFactory(...adapters);

  it('returns the adapter of every PlatformApiKind', () => {
    for (const kind of Object.values(PlatformApiKind)) {
      expect(factory.getAdapter(kind).kind).toBe(kind);
    }
    expect(Object.values(PlatformApiKind)).toHaveLength(adapters.length);
  });

  it('an unknown kind is a 400 business error, never a guess', () => {
    expect(() => factory.getAdapter('GOOGLE_SCHOLAR' as PlatformApiKind)).toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED_PROVIDER' }),
    );
  });
});
