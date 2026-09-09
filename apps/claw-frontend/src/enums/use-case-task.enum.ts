/**
 * The task pages under `/use-cases`. Distinct from `ModelFitTask`
 * (`/model-fit/*`): a model-fit page answers "which model fits this task",
 * an ad-INELIGIBLE commercial-investigation page about choosing a model.
 * A use-case page answers "how do I do this job with ClawAI" — the
 * workflow, the routing modes and features involved, ad-ELIGIBLE per §8.2
 * of the SEO content architecture doc. Two of these slugs deliberately
 * reuse a `ModelFitTask` string value (`writing-and-editing`) because it is
 * the clearest name for both intents; the two live under different route
 * prefixes so there is no collision.
 */
export enum UseCaseTask {
  CODING_AND_DEVELOPMENT = 'coding-and-development',
  RESEARCH_AND_FACT_FINDING = 'research-and-fact-finding',
  WRITING_AND_EDITING = 'writing-and-editing',
  COMPARING_MODEL_ANSWERS = 'comparing-model-answers',
  PRIVATE_AND_LOCAL_DEPLOYMENT = 'private-and-local-deployment',
  WORKSPACE_AUTOMATION = 'workspace-automation',
  STRUCTURED_DATA_EXTRACTION = 'structured-data-extraction',
}
