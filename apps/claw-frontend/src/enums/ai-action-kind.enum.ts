export enum AiActionKind {
  SUMMARIZE = 'SUMMARIZE',
  DRAFT = 'DRAFT',
  COMPARE = 'COMPARE',
  JUDGE = 'JUDGE',
  REWRITE = 'REWRITE',
  EXTRACT = 'EXTRACT',
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
