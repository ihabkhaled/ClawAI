/** How a search chose its providers (ADR-210). */
export enum SearchExecutionMode {
  /** No provider named: every enabled + ACTIVE provider, in parallel. */
  AUTO_ALL = 'AUTO_ALL',
  /** The caller named one provider. */
  EXPLICIT = 'EXPLICIT',
}
