export const PIPELINE_POLL_INTERVAL_MS = 2000;
export const MAX_PIPELINE_POLL_COUNT = 90;
export const PIPELINE_POLL_MESSAGES_LIMIT = 10;
export const PIPELINE_AUTO_NAVIGATE_DELAY_MS = 3000;
export const PIPELINE_CONTENT_MIN_LENGTH = 10;
export const PIPELINE_TEMPLATE_OPTIONS = [
  { value: 'analyze-reason-format', labelKey: 'pipeline.templateAnalyze' },
  { value: 'code-debug-review', labelKey: 'pipeline.templateCode' },
  { value: 'draft-critique-revise', labelKey: 'pipeline.templateDraft' },
] as const;
