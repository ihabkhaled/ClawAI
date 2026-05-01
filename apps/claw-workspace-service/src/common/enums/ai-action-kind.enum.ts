export enum AiActionKind {
  SUMMARIZE = 'SUMMARIZE',
  DRAFT = 'DRAFT',
  COMPARE = 'COMPARE',
  JUDGE = 'JUDGE',
  REWRITE = 'REWRITE',
  EXTRACT = 'EXTRACT',
  // Stream 41 — ticket planning + coding bridge
  PLAN = 'PLAN',
  DECOMPOSE = 'DECOMPOSE',
  ESTIMATE = 'ESTIMATE',
  IMPL_PROMPT = 'IMPL_PROMPT',
}

export enum AiActionPrivacyClass {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  PRIVATE = 'PRIVATE',
}

export enum AiActionMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}
