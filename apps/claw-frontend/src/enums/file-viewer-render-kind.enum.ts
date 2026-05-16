// v3 round 11 (2026-05-14) — Prompt 08: how the file viewer modal
// should render fetched content, resolved from the MIME type.
export enum FileViewerRenderKind {
  PDF = 'pdf',
  IMAGE = 'image',
  TEXT = 'text',
  UNSUPPORTED = 'unsupported',
}
