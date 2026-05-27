// Workflow kinds emitted by the routing-service when Phase 6 wiring is
// active. Mirrors the backend Prisma enum but is intentionally a plain
// string enum so the FE can compare without importing the Prisma client.
//
// LIVE workflows render a real "what we did" badge. Everything else
// surfaces as "Workflow not yet available" — the BE returns those in
// `alternatives` so we know the FE didn't make them up.

export enum WorkflowKind {
  DIRECT_LLM = 'DIRECT_LLM',
  SEARCH_FIRST = 'SEARCH_FIRST',
  EXTRACT_FIRST = 'EXTRACT_FIRST',
  PDF_EXTRACTION = 'PDF_EXTRACTION',
  YOUTUBE_TRANSCRIPT = 'YOUTUBE_TRANSCRIPT',
  IMAGE_ANALYSIS = 'IMAGE_ANALYSIS',
  IMAGE_GENERATION = 'IMAGE_GENERATION',
  VIDEO_ANALYSIS = 'VIDEO_ANALYSIS',
  AUDIO_TRANSCRIBE = 'AUDIO_TRANSCRIBE',
  FILE_GENERATION = 'FILE_GENERATION',
  CODE_REVIEW = 'CODE_REVIEW',
  COMPARE_ENSEMBLE = 'COMPARE_ENSEMBLE',
  JUDGE_PIPELINE = 'JUDGE_PIPELINE',
}
