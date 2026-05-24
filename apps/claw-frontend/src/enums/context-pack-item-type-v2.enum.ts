// Backend-aligned V2 enum (TEXT/FILE/URL/MARKDOWN/SNIPPET/MEMORY_REF).
// The legacy `ContextPackItemType` (NOTE/INSTRUCTION/FILE_REFERENCE) remains
// to drive the v1 display labels; the V2 grid uses this enum instead.
export enum ContextPackItemTypeV2 {
  TEXT = 'TEXT',
  FILE = 'FILE',
  URL = 'URL',
  MARKDOWN = 'MARKDOWN',
  SNIPPET = 'SNIPPET',
  MEMORY_REF = 'MEMORY_REF',
}
