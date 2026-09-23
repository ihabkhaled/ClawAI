/**
 * What kind of upstream a connector preset connects.
 *
 * Only LLM presets exist today. The other members are here so an image,
 * search, embedding, rerank or data provider can be added as one registry
 * entry later without widening the type or refactoring its consumers.
 */
export enum ConnectorPresetCategory {
  LLM = 'LLM',
  IMAGE = 'IMAGE',
  SEARCH = 'SEARCH',
  EMBEDDING = 'EMBEDDING',
  RERANK = 'RERANK',
  DATA = 'DATA',
}
