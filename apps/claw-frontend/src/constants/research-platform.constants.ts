import { ResearchPlatformAccessMethod } from '@/enums/research-platform-access-method.enum';
import { ResearchPlatformApiKind } from '@/enums/research-platform-api-kind.enum';
import { ResearchPlatformCategory } from '@/enums/research-platform-category.enum';
import { ResearchPlatformTestOutcome } from '@/enums/research-platform-test-outcome.enum';
import type { ResearchPlatformFormState } from '@/types/research-platform.types';

/** Category order on the admin page: groups render in this order, and the filter lists it. */
export const RESEARCH_PLATFORM_CATEGORIES: readonly ResearchPlatformCategory[] = [
  ResearchPlatformCategory.NEWS,
  ResearchPlatformCategory.ACADEMIC,
  ResearchPlatformCategory.TECHNICAL,
  ResearchPlatformCategory.SOCIAL,
  ResearchPlatformCategory.VIDEO,
  ResearchPlatformCategory.FORUM,
  ResearchPlatformCategory.OFFICIAL,
  ResearchPlatformCategory.REFERENCE,
  ResearchPlatformCategory.COMMERCE,
];

export const RESEARCH_PLATFORM_ACCESS_METHODS: readonly ResearchPlatformAccessMethod[] = [
  ResearchPlatformAccessMethod.SITE_SEARCH,
  ResearchPlatformAccessMethod.OFFICIAL_API,
];

export const RESEARCH_PLATFORM_API_KINDS: readonly ResearchPlatformApiKind[] = [
  ResearchPlatformApiKind.OPENALEX,
  ResearchPlatformApiKind.SEMANTIC_SCHOLAR,
  ResearchPlatformApiKind.PUBMED,
  ResearchPlatformApiKind.CROSSREF,
  ResearchPlatformApiKind.ARXIV,
  ResearchPlatformApiKind.STACK_EXCHANGE,
  ResearchPlatformApiKind.HN_ALGOLIA,
  ResearchPlatformApiKind.GITHUB,
  ResearchPlatformApiKind.WIKIPEDIA,
];

export const RESEARCH_PLATFORM_CATEGORY_KEYS: Record<ResearchPlatformCategory, string> = {
  [ResearchPlatformCategory.NEWS]: 'researchPlatforms.categories.NEWS',
  [ResearchPlatformCategory.ACADEMIC]: 'researchPlatforms.categories.ACADEMIC',
  [ResearchPlatformCategory.TECHNICAL]: 'researchPlatforms.categories.TECHNICAL',
  [ResearchPlatformCategory.SOCIAL]: 'researchPlatforms.categories.SOCIAL',
  [ResearchPlatformCategory.VIDEO]: 'researchPlatforms.categories.VIDEO',
  [ResearchPlatformCategory.FORUM]: 'researchPlatforms.categories.FORUM',
  [ResearchPlatformCategory.OFFICIAL]: 'researchPlatforms.categories.OFFICIAL',
  [ResearchPlatformCategory.REFERENCE]: 'researchPlatforms.categories.REFERENCE',
  [ResearchPlatformCategory.COMMERCE]: 'researchPlatforms.categories.COMMERCE',
};

export const RESEARCH_PLATFORM_ACCESS_METHOD_KEYS: Record<ResearchPlatformAccessMethod, string> = {
  [ResearchPlatformAccessMethod.SITE_SEARCH]: 'researchPlatforms.accessMethods.SITE_SEARCH',
  [ResearchPlatformAccessMethod.OFFICIAL_API]: 'researchPlatforms.accessMethods.OFFICIAL_API',
};

/** API names are product names, the same in every language, so they are not in the dictionaries. */
export const RESEARCH_PLATFORM_API_KIND_LABELS: Record<ResearchPlatformApiKind, string> = {
  [ResearchPlatformApiKind.OPENALEX]: 'OpenAlex',
  [ResearchPlatformApiKind.SEMANTIC_SCHOLAR]: 'Semantic Scholar',
  [ResearchPlatformApiKind.PUBMED]: 'PubMed',
  [ResearchPlatformApiKind.CROSSREF]: 'Crossref',
  [ResearchPlatformApiKind.ARXIV]: 'arXiv',
  [ResearchPlatformApiKind.STACK_EXCHANGE]: 'Stack Exchange',
  [ResearchPlatformApiKind.HN_ALGOLIA]: 'Hacker News (Algolia)',
  [ResearchPlatformApiKind.GITHUB]: 'GitHub',
  [ResearchPlatformApiKind.WIKIPEDIA]: 'Wikipedia',
};

/**
 * Display names for the seeded platform slugs a search line may name ("Platforms: Reddit, arXiv").
 * Brand names, so not translated. A slug missing here is title-cased from its words.
 */
export const RESEARCH_PLATFORM_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  openalex: 'OpenAlex',
  'semantic-scholar': 'Semantic Scholar',
  pubmed: 'PubMed',
  crossref: 'Crossref',
  arxiv: 'arXiv',
  'stack-overflow': 'Stack Overflow',
  stackoverflow: 'Stack Overflow',
  'hacker-news': 'Hacker News',
  hackernews: 'Hacker News',
  github: 'GitHub',
  wikipedia: 'Wikipedia',
  reddit: 'Reddit',
  youtube: 'YouTube',
  x: 'X',
  twitter: 'X',
  'x-twitter': 'X (Twitter)',
  linkedin: 'LinkedIn',
  quora: 'Quora',
  medium: 'Medium',
  'dev-to': 'dev.to',
  devto: 'dev.to',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  reuters: 'Reuters',
  'ap-news': 'AP News',
  apnews: 'AP News',
  bbc: 'BBC',
  'al-jazeera': 'Al Jazeera',
  aljazeera: 'Al Jazeera',
  bloomberg: 'Bloomberg',
  'the-guardian': 'The Guardian',
  guardian: 'The Guardian',
  nature: 'Nature',
  sciencedirect: 'ScienceDirect',
  who: 'WHO',
  cdc: 'CDC',
  'gov-uk': 'GOV.UK',
  govuk: 'GOV.UK',
  'europa-eu': 'europa.eu',
  europa: 'europa.eu',
  mdn: 'MDN',
  npm: 'npm',
  pypi: 'PyPI',
  amazon: 'Amazon',
  'product-hunt': 'Product Hunt',
  producthunt: 'Product Hunt',
};

/** research-service's slug rule (`^[a-z0-9-]{2,40}$`). */
export const RESEARCH_PLATFORM_SLUG_PATTERN = /^[a-z0-9-]{2,40}$/u;

/** A language code as research-service stores it: a base ISO 639 code (`en`, `zh`, `fil`). */
export const RESEARCH_PLATFORM_LANGUAGE_PATTERN = /^[a-z]{2,3}$/u;

/** One domain label (between the dots), and the last label, which is letters only. */
export const RESEARCH_PLATFORM_DOMAIN_LABEL_PATTERN = /^[a-z0-9-]{1,63}$/u;
export const RESEARCH_PLATFORM_DOMAIN_TLD_PATTERN = /^[a-z]{2,63}$/u;

/** What separates entries in the domains / languages inputs: commas, spaces or new lines. */
export const RESEARCH_PLATFORM_LIST_SEPARATOR = /[\s,]+/u;

/** research-service's DTO bounds (`platform-admin.constants.ts`); keep them equal. */
export const RESEARCH_PLATFORM_NAME_MIN_LENGTH = 2;
export const RESEARCH_PLATFORM_NAME_MAX_LENGTH = 80;
export const RESEARCH_PLATFORM_NOTES_MAX_LENGTH = 500;
export const RESEARCH_PLATFORM_MAX_DOMAINS = 10;
export const RESEARCH_PLATFORM_MAX_LANGUAGES = 13;
export const RESEARCH_PLATFORM_MAX_PRIORITY = 1000;
export const RESEARCH_PLATFORM_MAX_RESULTS = 20;
export const RESEARCH_PLATFORM_MIN_TIMEOUT_MS = 1000;
export const RESEARCH_PLATFORM_MAX_TIMEOUT_MS = 20_000;

/** The Select value meaning "every category"; never a category name. */
export const RESEARCH_PLATFORM_FILTER_ALL = 'ALL';

/** The defaults research-service applies (priority 100, 5 results, 8 s). */
export const INITIAL_RESEARCH_PLATFORM_FORM: ResearchPlatformFormState = {
  slug: '',
  name: '',
  category: ResearchPlatformCategory.NEWS,
  accessMethod: ResearchPlatformAccessMethod.SITE_SEARCH,
  apiKind: null,
  domains: '',
  languages: '',
  priority: '100',
  maxResults: '5',
  timeoutMs: '8000',
  notes: '',
};

/** The i18n key of the message for the first invalid field of the form. */
export const RESEARCH_PLATFORM_FIELD_ERROR_KEYS: Readonly<Record<string, string>> = {
  slug: 'researchPlatforms.errors.slug',
  name: 'researchPlatforms.errors.name',
  apiKind: 'researchPlatforms.errors.apiKind',
  domains: 'researchPlatforms.errors.domains',
  languages: 'researchPlatforms.errors.languages',
  priority: 'researchPlatforms.errors.number',
  maxResults: 'researchPlatforms.errors.number',
  timeoutMs: 'researchPlatforms.errors.number',
};

/** The dialog's submit label by [isEditing][isSaving]. */
export const RESEARCH_PLATFORM_SUBMIT_LABEL_KEYS = {
  create: { idle: 'researchPlatforms.form.create', saving: 'researchPlatforms.form.creating' },
  edit: { idle: 'researchPlatforms.form.save', saving: 'researchPlatforms.form.saving' },
} as const;

export const RESEARCH_PLATFORM_SAVE_FAILED_KEY = 'researchPlatforms.errors.saveFailed';
export const RESEARCH_PLATFORM_INVALID_KEY = 'researchPlatforms.errors.invalid';
export const RESEARCH_PLATFORM_SLUG_TAKEN_KEY = 'researchPlatforms.errors.slugTaken';

/** HTTP statuses research-service answers a rejected save with. */
export const RESEARCH_PLATFORM_CONFLICT_STATUS = 409;
export const RESEARCH_PLATFORM_BAD_REQUEST_STATUS = 400;

/** A placeholder cell for an empty list (no domains on an API platform). */
export const RESEARCH_PLATFORM_EMPTY_CELL = '—';

/** The text tone of a test result line. */
export const RESEARCH_PLATFORM_TEST_OUTCOME_CLASSES: Record<ResearchPlatformTestOutcome, string> = {
  [ResearchPlatformTestOutcome.PASSED]: 'text-success',
  [ResearchPlatformTestOutcome.FAILED]: 'text-destructive',
  [ResearchPlatformTestOutcome.REQUEST_FAILED]: 'text-destructive',
};

/** The labelled cell of a row: a table cell on a mouse, a "label: value" line in a touch card. */
export const RESEARCH_PLATFORM_CELL_CLASS =
  'touch:before:text-muted-foreground touch:flex touch:items-center touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm';
