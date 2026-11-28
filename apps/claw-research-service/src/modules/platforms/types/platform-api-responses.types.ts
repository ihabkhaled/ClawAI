/*
 * The fields each official platform API returns that the adapters read.
 * Everything is optional: a missing or malformed field is skipped, never trusted.
 */

/** OpenAlex `GET /works?search=`. */
export type OpenAlexWorksResponse = {
  results?: Array<{
    id?: unknown;
    doi?: unknown;
    display_name?: unknown;
    publication_date?: unknown;
    abstract_inverted_index?: unknown;
    primary_location?: {
      landing_page_url?: unknown;
      source?: { display_name?: unknown } | null;
    } | null;
  }>;
};

/** Semantic Scholar `GET /graph/v1/paper/search`. */
export type SemanticScholarSearchResponse = {
  data?: Array<{
    paperId?: unknown;
    title?: unknown;
    url?: unknown;
    abstract?: unknown;
    year?: unknown;
    venue?: unknown;
  }>;
};

/** PubMed E-utilities `esearch.fcgi?retmode=json`. */
export type PubMedSearchResponse = {
  esearchresult?: { idlist?: unknown };
};

/** One PubMed `esummary.fcgi?retmode=json` document. */
export type PubMedSummaryDocument = {
  uid?: unknown;
  title?: unknown;
  fulljournalname?: unknown;
  source?: unknown;
  pubdate?: unknown;
  sortpubdate?: unknown;
  authors?: Array<{ name?: unknown }>;
};

/** PubMed `esummary.fcgi?retmode=json`: `result.uids` plus one document per uid. */
export type PubMedSummaryResponse = {
  result?: Record<string, unknown>;
};

/** Crossref `GET /works?query=`. */
export type CrossrefWorksResponse = {
  message?: {
    items?: Array<{
      DOI?: unknown;
      URL?: unknown;
      title?: unknown;
      abstract?: unknown;
      published?: { 'date-parts'?: unknown };
      'container-title'?: unknown;
    }>;
  };
};

/** Stack Exchange `GET /2.3/search/advanced`. */
export type StackExchangeSearchResponse = {
  items?: Array<{
    title?: unknown;
    link?: unknown;
    tags?: unknown;
    score?: unknown;
    answer_count?: unknown;
    is_answered?: unknown;
    creation_date?: unknown;
  }>;
};

/** Algolia Hacker News `GET /api/v1/search`. */
export type HnAlgoliaSearchResponse = {
  hits?: Array<{
    objectID?: unknown;
    title?: unknown;
    url?: unknown;
    story_text?: unknown;
    points?: unknown;
    num_comments?: unknown;
    created_at?: unknown;
  }>;
};

/** GitHub `GET /search/repositories`. */
export type GithubRepoSearchResponse = {
  items?: Array<{
    full_name?: unknown;
    html_url?: unknown;
    description?: unknown;
    stargazers_count?: unknown;
    language?: unknown;
    created_at?: unknown;
    pushed_at?: unknown;
  }>;
};

/** Wikipedia `api.php?action=query&list=search`. */
export type WikipediaSearchResponse = {
  query?: { search?: Array<{ title?: unknown; snippet?: unknown; pageid?: unknown }> };
};
