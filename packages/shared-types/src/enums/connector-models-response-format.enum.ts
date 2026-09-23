/**
 * The JSON shape a preset's model-list endpoint answers with.
 *
 * OPENAI_LIST is `{ data: [{ id }] }` — most providers. BARE_ARRAY is a bare
 * `[{ id, type }]` (Together). COHERE_MODELS is `{ models: [{ name,
 * endpoints }] }`. CLOUDFLARE_SEARCH is `{ result: [{ name, task }] }`.
 */
export enum ConnectorModelsResponseFormat {
  OPENAI_LIST = 'OPENAI_LIST',
  BARE_ARRAY = 'BARE_ARRAY',
  COHERE_MODELS = 'COHERE_MODELS',
  CLOUDFLARE_SEARCH = 'CLOUDFLARE_SEARCH',
}
