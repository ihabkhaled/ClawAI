/**
 * The task pages under `/model-fit`.
 *
 * Reframed from the "best AI model for X" naming in the original backlog:
 * "best" is an unsubstantiated superlative about third-party products, and
 * §6 of the SEO content architecture doc refuses benchmarks outright, so it
 * is unsubstantiable by construction. Same search intent, same traffic, no
 * superlative — "choosing a model for coding", not "the best model for
 * coding" (§8.2 of that doc).
 */
export enum ModelFitTask {
  CODING = 'coding',
  COMPLEX_REASONING = 'complex-reasoning',
  WRITING_AND_EDITING = 'writing-and-editing',
  RESEARCH_WITH_SOURCES = 'research-with-sources',
  PRIVATE_LOCAL_WORKLOADS = 'private-local-workloads',
}
