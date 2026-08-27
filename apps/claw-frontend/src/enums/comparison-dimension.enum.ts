/**
 * The axes every comparison page is scored on.
 *
 * Fixed and shared across all rivals on purpose: a comparison that picks
 * different axes per competitor is a sales page, not a comparison. Every rival
 * answers the same eight questions, so a reader can hold two pages side by side
 * and the rows line up.
 */
export enum ComparisonDimension {
  MODEL_CHOICE = 'model-choice',
  ROUTING = 'routing',
  SIDE_BY_SIDE = 'side-by-side',
  LOCAL_MODELS = 'local-models',
  SELF_HOSTING = 'self-hosting',
  MEMORY_AND_FILES = 'memory-and-files',
  CONNECTORS = 'connectors',
  RECEIPTS = 'receipts',
}
