import { PlatformAccessMethod, PlatformApiKind, PlatformCategory } from '../../../generated/prisma';
import type { PlatformSeed } from '../types/platform.types';

const { OFFICIAL_API, SITE_SEARCH } = PlatformAccessMethod;

/**
 * The platform registry's boot seed (research engine B3). The seeder creates a
 * row only when its slug is missing: a row an admin edited is never touched.
 * Deleting a seeded row brings it back at the next boot; disable it instead.
 *
 * Policy: public APIs that need no key, and public pages reached through the
 * search engines (`site:<first domain>`). No login, no captcha or paywall bypass.
 * `priority` orders platforms inside a category (lower first).
 */
export const PLATFORM_SEED: readonly PlatformSeed[] = [
  // ── Official APIs (free, unauthenticated) ──────────────────────────────
  api(
    'openalex',
    'OpenAlex',
    PlatformCategory.ACADEMIC,
    PlatformApiKind.OPENALEX,
    ['openalex.org'],
    10,
    'Scholarly works index.',
  ),
  api(
    'semantic-scholar',
    'Semantic Scholar',
    PlatformCategory.ACADEMIC,
    PlatformApiKind.SEMANTIC_SCHOLAR,
    ['semanticscholar.org'],
    20,
    'Shared unauthenticated rate limit; 429s are expected under load.',
  ),
  api(
    'arxiv',
    'arXiv',
    PlatformCategory.ACADEMIC,
    PlatformApiKind.ARXIV,
    ['arxiv.org'],
    30,
    'Preprints, Atom export API.',
  ),
  api(
    'pubmed',
    'PubMed',
    PlatformCategory.ACADEMIC,
    PlatformApiKind.PUBMED,
    ['pubmed.ncbi.nlm.nih.gov'],
    40,
    'NCBI E-utilities: esearch then esummary (2 calls).',
  ),
  api(
    'crossref',
    'Crossref',
    PlatformCategory.ACADEMIC,
    PlatformApiKind.CROSSREF,
    ['crossref.org'],
    50,
    'DOI metadata.',
  ),
  api(
    'stack-overflow',
    'Stack Overflow',
    PlatformCategory.TECHNICAL,
    PlatformApiKind.STACK_EXCHANGE,
    ['stackoverflow.com'],
    10,
    'Stack Exchange API, site=stackoverflow.',
  ),
  api(
    'github',
    'GitHub',
    PlatformCategory.TECHNICAL,
    PlatformApiKind.GITHUB,
    ['github.com'],
    20,
    'Repository search, unauthenticated (10 requests/minute per IP).',
  ),
  api(
    'hacker-news',
    'Hacker News',
    PlatformCategory.TECHNICAL,
    PlatformApiKind.HN_ALGOLIA,
    ['news.ycombinator.com'],
    30,
    'Algolia HN search, stories only.',
  ),
  api(
    'wikipedia',
    'Wikipedia',
    PlatformCategory.REFERENCE,
    PlatformApiKind.WIKIPEDIA,
    ['wikipedia.org'],
    10,
    'Searched once per requested language (max 3).',
  ),
  // ── Site search through the search engines ─────────────────────────────
  site('nature', 'Nature', PlatformCategory.ACADEMIC, ['nature.com'], 60),
  site('sciencedirect', 'ScienceDirect', PlatformCategory.ACADEMIC, ['sciencedirect.com'], 70),
  site('mdn', 'MDN Web Docs', PlatformCategory.TECHNICAL, ['developer.mozilla.org'], 40),
  site('dev-to', 'DEV Community', PlatformCategory.TECHNICAL, ['dev.to'], 50),
  site('npm', 'npm', PlatformCategory.TECHNICAL, ['npmjs.com'], 60),
  site('pypi', 'PyPI', PlatformCategory.TECHNICAL, ['pypi.org'], 70),
  site('reddit', 'Reddit', PlatformCategory.FORUM, ['reddit.com'], 10),
  site('quora', 'Quora', PlatformCategory.FORUM, ['quora.com'], 20),
  site('x-twitter', 'X (Twitter)', PlatformCategory.SOCIAL, ['x.com', 'twitter.com'], 10),
  site('linkedin', 'LinkedIn', PlatformCategory.SOCIAL, ['linkedin.com'], 20),
  site('medium', 'Medium', PlatformCategory.SOCIAL, ['medium.com'], 30),
  site('facebook', 'Facebook', PlatformCategory.SOCIAL, ['facebook.com'], 40),
  site('instagram', 'Instagram', PlatformCategory.SOCIAL, ['instagram.com'], 50),
  site('youtube', 'YouTube', PlatformCategory.VIDEO, ['youtube.com', 'youtu.be'], 10),
  site('tiktok', 'TikTok', PlatformCategory.VIDEO, ['tiktok.com'], 20),
  site('reuters', 'Reuters', PlatformCategory.NEWS, ['reuters.com'], 10),
  site('ap-news', 'AP News', PlatformCategory.NEWS, ['apnews.com'], 20),
  site('bbc', 'BBC', PlatformCategory.NEWS, ['bbc.com', 'bbc.co.uk'], 30),
  site('the-guardian', 'The Guardian', PlatformCategory.NEWS, ['theguardian.com'], 40),
  site('al-jazeera', 'Al Jazeera', PlatformCategory.NEWS, ['aljazeera.com', 'aljazeera.net'], 50),
  site('bloomberg', 'Bloomberg', PlatformCategory.NEWS, ['bloomberg.com'], 60),
  site('who', 'World Health Organization', PlatformCategory.OFFICIAL, ['who.int'], 10),
  site('cdc', 'CDC', PlatformCategory.OFFICIAL, ['cdc.gov'], 20),
  site('gov-uk', 'GOV.UK', PlatformCategory.OFFICIAL, ['gov.uk'], 30),
  site('europa-eu', 'European Union (europa.eu)', PlatformCategory.OFFICIAL, ['europa.eu'], 40),
  site('amazon', 'Amazon', PlatformCategory.COMMERCE, ['amazon.com'], 10),
  site('product-hunt', 'Product Hunt', PlatformCategory.COMMERCE, ['producthunt.com'], 20),
];

function api(
  slug: string,
  name: string,
  category: PlatformCategory,
  apiKind: PlatformApiKind,
  domains: string[],
  priority: number,
  notes: string,
): PlatformSeed {
  return {
    slug,
    name,
    category,
    accessMethod: OFFICIAL_API,
    apiKind,
    domains,
    languages: [],
    priority,
    notes,
  };
}

function site(
  slug: string,
  name: string,
  category: PlatformCategory,
  domains: string[],
  priority: number,
): PlatformSeed {
  return {
    slug,
    name,
    category,
    accessMethod: SITE_SEARCH,
    apiKind: null,
    domains,
    languages: [],
    priority,
    notes: null,
  };
}
