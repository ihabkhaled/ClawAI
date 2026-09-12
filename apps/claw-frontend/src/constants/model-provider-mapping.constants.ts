import { ModelProviderPage } from '@/enums/model-provider-page.enum';

/**
 * Which backend connector providers feed each `/models/<provider>` page.
 *
 * The two vocabularies are deliberately different and must not be collapsed.
 * `ConnectorProvider` names an ADAPTER — how we talk to a vendor — while
 * `ModelProviderPage` names a PAGE, which is a marketing decision. Most map one
 * to one, but `local-ai` is one page covering both local runtimes, because a
 * reader looking for "can I run models on my own hardware" does not care
 * whether the answer is Ollama or llama.cpp.
 *
 * An array per page, not a single value, is what makes that possible — and what
 * will let a future page cover two vendors without reshaping anything.
 *
 * `AWS_BEDROCK` appears nowhere: it has a connector but its model sync throws
 * "not yet implemented", so it can never contribute a model to the catalog.
 * Listing it would create a page that is permanently empty.
 */
export const MODEL_PAGE_CONNECTOR_PROVIDERS: Readonly<
  Record<ModelProviderPage, readonly string[]>
> = {
  [ModelProviderPage.OPENAI]: ['OPENAI'],
  [ModelProviderPage.ANTHROPIC]: ['ANTHROPIC'],
  [ModelProviderPage.GOOGLE]: ['GEMINI'],
  [ModelProviderPage.DEEPSEEK]: ['DEEPSEEK'],
  [ModelProviderPage.XAI]: ['GROK'],
  [ModelProviderPage.LOCAL_AI]: ['OLLAMA', 'LLAMACPP'],
};

/**
 * How many models a page lists before it stops and says "and N more".
 *
 * OpenAI alone exposes 86 on this deployment. Printing every one turns a page
 * meant to answer "which models can I use here" into a wall of near-identical
 * dated snapshot ids, which is worse for a reader AND worse for search: the
 * distinctive copy gets buried under boilerplate.
 */
export const MODEL_PAGE_VISIBLE_MODEL_LIMIT = 24;
