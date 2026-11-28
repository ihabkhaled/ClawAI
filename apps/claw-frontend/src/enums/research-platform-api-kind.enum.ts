/** Which API adapter an OFFICIAL_API platform uses. Mirrors research-service `PlatformApiKind`. */
export enum ResearchPlatformApiKind {
  OPENALEX = 'OPENALEX',
  SEMANTIC_SCHOLAR = 'SEMANTIC_SCHOLAR',
  PUBMED = 'PUBMED',
  CROSSREF = 'CROSSREF',
  ARXIV = 'ARXIV',
  STACK_EXCHANGE = 'STACK_EXCHANGE',
  HN_ALGOLIA = 'HN_ALGOLIA',
  GITHUB = 'GITHUB',
  WIKIPEDIA = 'WIKIPEDIA',
}
