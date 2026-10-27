import {
  RESEARCH_QUERIES_MAX,
  RESEARCH_QUERY_MAX_CHARS,
} from '../../constants/research-queries.constants';
import { extractRepositories, extractSourceHints } from '../research-hints.utility';
import { buildEvidenceGapQueries, buildResearchQueries } from '../research-query.utility';
import { clampQuery, significantWords, topicSubject } from '../research-text.utility';
import {
  ARABIC_TOPIC,
  GERMAN_TOPIC,
  JAPANESE_TOPIC,
  PRODUCTION_TOPIC,
} from './research-topic.fixtures';

const ARXIV_IDS = ['2310.13548', '2209.13085', '2201.03544', '1606.06565'];

const namesEveryId = (queries: readonly string[]): boolean =>
  ARXIV_IDS.every((id) => queries.some((query) => query.includes(id)));

describe('the first-pass queries (ADR-195)', () => {
  it('keeps a short topic with no source hint as exactly one query', () => {
    expect(buildResearchQueries('How do bees communicate?')).toEqual(['How do bees communicate?']);
    expect(buildResearchQueries('  A sufficiently detailed topic for a publication  ')).toEqual([
      'A sufficiently detailed topic for a publication',
    ]);
  });

  it('splits the production topic (about 1.7k characters) into short targeted queries', () => {
    expect(PRODUCTION_TOPIC.length).toBeGreaterThan(1500);

    const queries = buildResearchQueries(PRODUCTION_TOPIC);

    expect(queries.length).toBeGreaterThan(1);
    expect(queries.length).toBeLessThanOrEqual(RESEARCH_QUERIES_MAX);
    expect(queries.every((query) => query.length <= RESEARCH_QUERY_MAX_CHARS)).toBe(true);
    // The hints at the END of the topic are searched, one query each, with the words around them.
    expect(namesEveryId(queries)).toBe(true);
    expect(queries[0]).toContain('Sharma');
    expect(queries[0]).toContain('sycophancy');
    expect(queries.some((query) => query.includes('Concrete Problems in AI Safety'))).toBe(true);
    // No query is the whole topic.
    expect(queries.every((query) => query.length < PRODUCTION_TOPIC.length / 5)).toBe(true);
  });

  it.each([
    ['Arabic', ARABIC_TOPIC],
    ['Japanese', JAPANESE_TOPIC],
    ['German', GERMAN_TOPIC],
  ])('finds the four hints in a %s topic', (_name, topic) => {
    const queries = buildResearchQueries(topic);

    expect(namesEveryId(queries)).toBe(true);
    expect(queries.length).toBeLessThanOrEqual(RESEARCH_QUERIES_MAX);
    expect(queries.every((query) => query.length <= RESEARCH_QUERY_MAX_CHARS)).toBe(true);
    expect(new Set(queries.map((query) => query.toLowerCase())).size).toBe(queries.length);
  });

  it('keeps the author and the words that describe each id, in the topic language', () => {
    const arabic = buildResearchQueries(ARABIC_TOPIC);
    const japanese = buildResearchQueries(JAPANESE_TOPIC);
    const german = buildResearchQueries(GERMAN_TOPIC);

    expect(arabic[0]).toContain('شارما');
    expect(arabic[0]).toContain('arXiv 2310.13548');
    expect(japanese[0]).toContain('Sharma');
    expect(japanese[0]).toContain('迎合性');
    expect(german[0]).toContain('Sprachmodellen');
  });

  it('adds a subject query and a key-term query for a long topic', () => {
    const queries = buildResearchQueries(PRODUCTION_TOPIC);
    const subject = queries.find((query) => query.startsWith('How can AI agents detect'));

    expect(subject).toBeDefined();
    expect(queries.at(-1)).toMatch(/drift/u);
    expect(queries.at(-1)).not.toMatch(/arxiv/iu);
  });

  it('searches a long topic that names no source as its subject and key terms', () => {
    const topic = `${'Explain how solar thermal storage works in large grids and why molten salt matters. '.repeat(6)}`;
    const queries = buildResearchQueries(topic);

    expect(queries.length).toBeGreaterThanOrEqual(1);
    expect(queries.length).toBeLessThanOrEqual(2);
    expect(queries.every((query) => query.length <= RESEARCH_QUERY_MAX_CHARS)).toBe(true);
  });

  it('caps the pass at six queries even when the topic names more sources', () => {
    const many = Array.from(
      { length: 10 },
      (_, i) =>
        `Author${String(i)} et al. 2020 on topic${String(i)} (arXiv 2001.0${String(1000 + i)})`,
    );
    const queries = buildResearchQueries(`${'Background text. '.repeat(20)}${many.join('; ')}`);

    expect(queries.length).toBeLessThanOrEqual(RESEARCH_QUERIES_MAX);
  });

  it('adds one fetch query for a repository the topic names', () => {
    const topic = `Review the repository acme-labs/agent-monitor and its design. ${'Describe the architecture in depth. '.repeat(6)}`;
    const queries = buildResearchQueries(topic);

    expect(queries).toContain('https://github.com/acme-labs/agent-monitor');
    expect(
      buildResearchQueries('See https://github.com/foo/bar.git, then compare it with the paper'),
    ).toContain('https://github.com/foo/bar');
  });

  it('removes secrets and URL query strings from every query', () => {
    const topic = `${'Long background about the system. '.repeat(8)}Key: sk-abcdefghijklmnopqrstuvwxyz0123456789 and https://example.org/x?token=abc (arXiv 2310.13548)`;
    const joined = buildResearchQueries(topic).join('\n');

    expect(joined).not.toContain('sk-abcdefghijklmnopqrstuvwxyz');
    expect(joined).not.toContain('token=abc');
  });
});

describe('source-hint extraction (ADR-195)', () => {
  it('reads an arXiv id with its description and the closing bracket', () => {
    const [query] = extractSourceHints(
      'Cite Sharma et al. 2023 on sycophancy (arXiv 2310.13548); more.',
    );

    expect(query).toContain('Sharma et al. 2023 on sycophancy (arXiv 2310.13548)');
    expect(query?.endsWith(')')).toBe(true);
  });

  it('drops a label such as "search hints:" from the front of the description', () => {
    const [query] = extractSourceHints(
      'Primary-source search hints: Pan et al. 2022 (arXiv 2201.03544)',
    );

    expect(query).toBe('Pan et al. 2022 (arXiv 2201.03544)');
  });

  it('reads a DOI without its trailing punctuation', () => {
    const [query] = extractSourceHints(
      'See the trial report 10.1038/s41586-020-2649-2. It matters.',
    );

    expect(query).toContain('10.1038/s41586-020-2649-2');
    expect(query?.endsWith('.')).toBe(false);
  });

  it('reads quoted titles in several quotation styles', () => {
    expect(extractSourceHints('Cite "Attention Is All You Need" for transformers')).toEqual([
      'Attention Is All You Need',
    ]);
    expect(extractSourceHints('引用: 「注意機構だけで十分である」を参照')).toEqual([
      '注意機構だけで十分である',
    ]);
    expect(extractSourceHints('اذكر «التعلم العميق في معالجة اللغات» كمصدر')).toHaveLength(1);
  });

  it('reads "Author et al. YEAR" and "Author (YEAR)" with what follows', () => {
    const queries = extractSourceHints(
      'Use Skalse et al. 2022 on reward hacking; Amodei (2016) on AI safety problems',
    );

    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain('Skalse et al. 2022');
    expect(queries[0]).toContain('reward hacking');
    expect(queries[1]).toContain('Amodei (2016)');
  });

  it('ignores a bare year and ordinary prose', () => {
    expect(extractSourceHints('In 2023 many teams shipped agents. Since 2020 it grew.')).toEqual(
      [],
    );
    expect(extractSourceHints('Nothing here names a source at all.')).toEqual([]);
  });

  it('does not take a version number for an arXiv id', () => {
    expect(extractSourceHints('Release 3.14159 and build 2024.5 were tagged')).toEqual([]);
  });

  it('deduplicates the same hint written twice and bounds the number', () => {
    const repeated = 'Sharma et al. 2023 (arXiv 2310.13548); Sharma et al. 2023 (arXiv 2310.13548)';
    expect(extractSourceHints(repeated)).toHaveLength(1);
    const many = Array.from(
      { length: 9 },
      (_, i) => `Work ${String(i)} (arXiv 2001.0${String(1000 + i)})`,
    ).join('; ');
    expect(extractSourceHints(many).length).toBeLessThanOrEqual(4);
  });
});

describe('repositories named in a topic', () => {
  it('reads github.com urls and "repository owner/repo", once each', () => {
    expect(
      extractRepositories('Compare https://github.com/a/b with repository a/b and github c-d/e_f.'),
    ).toEqual(['a/b', 'c-d/e_f']);
    expect(extractRepositories('Use input/output ports and TCP/IP')).toEqual([]);
  });
});

describe('the evidence-gap queries (ADR-195)', () => {
  const BLOCKERS = [
    'the article does not cite independent primary sources on sycophancy and reward hacking',
    'repository files are not in the evidence, so claims about the repository cannot be verified',
  ];

  it('searches the hinted sources first, then each blocker reduced to its key terms', () => {
    const queries = buildEvidenceGapQueries(PRODUCTION_TOPIC, BLOCKERS);

    expect(queries.length).toBeLessThanOrEqual(RESEARCH_QUERIES_MAX);
    expect(queries.every((query) => query.length <= RESEARCH_QUERY_MAX_CHARS)).toBe(true);
    // The hints that sit at the end of the topic are no longer cut off.
    expect(queries.filter((query) => query.includes('arXiv')).length).toBeGreaterThanOrEqual(3);
    const blockerQuery = queries.find(
      (query) => query.includes('sycophancy') && !query.includes('arXiv'),
    );
    expect(blockerQuery).toBeDefined();
    expect(blockerQuery).not.toMatch(/\bsources\b/u);
    expect(blockerQuery).not.toMatch(/\bcite\b/u);
  });

  it('takes an arXiv id named inside a blocker as a hint of its own', () => {
    const queries = buildEvidenceGapQueries('A short topic about reward hacking in agents', [
      'the article does not cite Skalse et al. 2022 (arXiv 2209.13085)',
    ]);

    expect(queries.some((query) => query.includes('2209.13085'))).toBe(true);
  });

  it('works for a short topic and falls back to its subject', () => {
    const queries = buildEvidenceGapQueries('How do bees communicate?', []);

    expect(queries).toEqual(['How do bees communicate?']);
  });

  it.each([
    ['Arabic', ARABIC_TOPIC, 'لا يذكر المقال مصادر أولية مستقلة عن التملق وخداع المكافأة'],
    ['Japanese', JAPANESE_TOPIC, '記事は報酬ハッキングに関する独立した一次情報を引用していない'],
    [
      'German',
      GERMAN_TOPIC,
      'Der Artikel zitiert keine unabhängigen Primärquellen zu Reward Hacking',
    ],
  ])('builds queries for a %s blocker', (_name, topic, blocker) => {
    const queries = buildEvidenceGapQueries(topic, [blocker]);

    expect(
      namesEveryId(queries.slice(0, 3)) || queries.some((query) => query.includes('arXiv')),
    ).toBe(true);
    expect(queries.every((query) => query.length <= RESEARCH_QUERY_MAX_CHARS)).toBe(true);
    expect(queries.length).toBeLessThanOrEqual(RESEARCH_QUERIES_MAX);
  });
});

describe('query text helpers', () => {
  it('clamps at a word boundary and collapses whitespace', () => {
    const clamped = clampQuery(`${'alpha '.repeat(60)}`, 50);

    expect(clamped.length).toBeLessThanOrEqual(50);
    expect(clamped.endsWith('alpha')).toBe(true);
    expect(clampQuery('a \n\t b')).toBe('a b');
  });

  it('takes the first sentence as the subject and drops a label', () => {
    expect(topicSubject('Research question: How do agents drift? Then more text.')).toBe(
      'How do agents drift?',
    );
    expect(topicSubject('No sentence end here')).toBe('No sentence end here');
  });

  it('picks the most frequent subject words in reading order and skips task words', () => {
    const words = significantWords(
      'Agents drift. Agents drift. Prepare the research article about cooling systems.',
      3,
    );

    expect(words).toEqual(['Agents', 'drift', 'cooling']);
  });

  it('skips sourcing vocabulary when asked, in any language', () => {
    expect(significantWords('cite independent sources about solar storage', 4, true)).toEqual([
      'solar',
      'storage',
    ]);
  });
});
