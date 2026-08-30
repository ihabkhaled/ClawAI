// The context pack item type, mirroring memory-service's Prisma enum exactly.
// Keeps the `V2` name because it is imported under it across the app; there is
// no V1 — the enum that carried that role listed values no migration ever
// declared, shadowed this one in the types, and was deleted on 2026-08-30.
export enum ContextPackItemTypeV2 {
  TEXT = 'TEXT',
  FILE = 'FILE',
  URL = 'URL',
  MARKDOWN = 'MARKDOWN',
  SNIPPET = 'SNIPPET',
  MEMORY_REF = 'MEMORY_REF',
}
