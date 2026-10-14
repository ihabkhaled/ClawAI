import { AuthKind } from '../../../common/enums/auth-kind.enum';

/**
 * Stand-in address for an entry whose real server URL is not written down anywhere in the repo.
 * It is not a working server: the entry stays a disabled draft until an admin pastes the vendor's
 * documented URL and passes "Preview tools". Never replace it with a guess.
 */
export const UNVERIFIED_SERVER_URL = 'https://verify-url.example.com/mcp';

export const SEED_NOTE_REPO_URL =
  'URL taken from docs/02-business-product/plugins-roadmap/INTEGRATION-CATALOG.md, where it is marked "verify". Confirm it against the vendor documentation, run Preview tools, then publish.';
export const SEED_NOTE_NO_URL =
  'URL: verify. The vendor server address is not confirmed anywhere in the repo, so a placeholder is stored. Paste the documented URL, run Preview tools, then publish. Key header: check the vendor documentation.';

export type CuratedSeed = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  publisher: string;
  category: string;
  iconKey: string;
  authKind: AuthKind.NONE | AuthKind.API_KEY | AuthKind.BEARER_TOKEN;
  url: string;
  urlConfirmed: boolean;
};

const REPO_HINT = true;
const NOT_CONFIRMED = false;

/**
 * Wave 1 of INTEGRATION-CATALOG.md (remote, keyless or API key, read-oriented) plus a few keyed
 * remote servers from the same file. Every seed is a DISABLED DRAFT: it lists one placeholder tool
 * until an admin previews the server's real tools. Text is English; other locales fall back to it.
 */
export const CURATED_SEEDS: readonly CuratedSeed[] = [
  {
    slug: 'context7',
    name: 'Context7',
    summary: 'Up-to-date documentation for libraries and frameworks.',
    description:
      'Looks up current documentation and code examples for a library or framework so answers match the version you use. Only the library name and your question are sent.',
    publisher: 'Context7',
    category: 'dev',
    iconKey: 'code',
    authKind: AuthKind.NONE,
    url: 'https://mcp.context7.com/mcp',
    urlConfirmed: REPO_HINT,
  },
  {
    slug: 'deepwiki',
    name: 'DeepWiki',
    summary: 'Ask questions about public code repositories.',
    description:
      'Reads the generated documentation of a public repository and answers questions about its structure and code. Only public repositories are covered.',
    publisher: 'DeepWiki',
    category: 'dev',
    iconKey: 'code',
    authKind: AuthKind.NONE,
    url: 'https://mcp.deepwiki.com/mcp',
    urlConfirmed: REPO_HINT,
  },
  {
    slug: 'exa',
    name: 'Exa',
    summary: 'Web search built for AI answers.',
    description:
      'Searches the web with the Exa search service and returns the matching pages. You supply your own Exa API key; the search text is sent to Exa.',
    publisher: 'Exa',
    category: 'search',
    iconKey: 'search',
    authKind: AuthKind.API_KEY,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
  {
    slug: 'tavily',
    name: 'Tavily',
    summary: 'Web search and page extraction for AI answers.',
    description:
      'Searches the web and extracts page content with the Tavily service. You supply your own Tavily API key; the search text is sent to Tavily.',
    publisher: 'Tavily',
    category: 'search',
    iconKey: 'search',
    authKind: AuthKind.API_KEY,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
  {
    slug: 'firecrawl',
    name: 'Firecrawl',
    summary: 'Turn web pages into clean text.',
    description:
      'Fetches and cleans web pages with the Firecrawl service so the text is easy to read and quote. You supply your own Firecrawl API key; the page address is sent to Firecrawl.',
    publisher: 'Firecrawl',
    category: 'search',
    iconKey: 'globe',
    authKind: AuthKind.API_KEY,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
  {
    slug: 'hugging-face',
    name: 'Hugging Face',
    summary: 'Browse models, datasets and Spaces.',
    description:
      'Searches the Hugging Face hub for models, datasets and Spaces. You supply your own Hugging Face access token.',
    publisher: 'Hugging Face',
    category: 'data',
    iconKey: 'database',
    authKind: AuthKind.BEARER_TOKEN,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
  {
    slug: 'apify',
    name: 'Apify',
    summary: 'Run web scraping and automation actors.',
    description:
      'Finds and runs Apify actors that scrape or automate websites and returns their results. You supply your own Apify API token; runs may use your Apify credit.',
    publisher: 'Apify',
    category: 'data',
    iconKey: 'database',
    authKind: AuthKind.BEARER_TOKEN,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
  {
    slug: 'bright-data',
    name: 'Bright Data',
    summary: 'Public web data through a proxy network.',
    description:
      'Collects public web data with the Bright Data network. You supply your own Bright Data API key; usage is billed by Bright Data.',
    publisher: 'Bright Data',
    category: 'data',
    iconKey: 'globe',
    authKind: AuthKind.API_KEY,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
  {
    slug: 'sourcegraph',
    name: 'Sourcegraph',
    summary: 'Search code across repositories.',
    description:
      'Searches code across your repositories with Sourcegraph. You supply your own Sourcegraph access token; queries run against your Sourcegraph instance.',
    publisher: 'Sourcegraph',
    category: 'dev',
    iconKey: 'code',
    authKind: AuthKind.API_KEY,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
  {
    slug: 'new-relic',
    name: 'New Relic',
    summary: 'Read application and infrastructure telemetry.',
    description:
      'Reads telemetry from your New Relic account to answer questions about errors and performance. You supply your own New Relic API key; it is only used to read.',
    publisher: 'New Relic',
    category: 'data',
    iconKey: 'database',
    authKind: AuthKind.API_KEY,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
  {
    slug: 'honeycomb',
    name: 'Honeycomb',
    summary: 'Query traces and events from your services.',
    description:
      'Queries your Honeycomb datasets for traces and events. You supply your own Honeycomb API key; it is only used to read.',
    publisher: 'Honeycomb',
    category: 'data',
    iconKey: 'database',
    authKind: AuthKind.API_KEY,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
  {
    slug: 'cloudinary',
    name: 'Cloudinary',
    summary: 'Find and manage your images and videos.',
    description:
      'Searches and manages media in your Cloudinary account. You supply your own Cloudinary API key; actions that change media are asked about before they run.',
    publisher: 'Cloudinary',
    category: 'media',
    iconKey: 'image',
    authKind: AuthKind.API_KEY,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
  {
    slug: 'mem0',
    name: 'Mem0',
    summary: 'Keep long-term notes an assistant can recall.',
    description:
      'Stores and recalls memories in your Mem0 account. You supply your own Mem0 API key; whatever you ask it to remember is sent to Mem0.',
    publisher: 'Mem0',
    category: 'productivity',
    iconKey: 'database',
    authKind: AuthKind.API_KEY,
    url: UNVERIFIED_SERVER_URL,
    urlConfirmed: NOT_CONFIRMED,
  },
];
