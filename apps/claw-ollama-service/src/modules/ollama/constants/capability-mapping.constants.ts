import { ModelCapability } from '../../../common/enums/model-capability.enum';

// Maps the ModelCapability enum (semantic, UI-facing labels) to the free-form
// capability strings actually stored in ModelCatalogEntry.capabilities[]. Catalog
// entries use snake_case strings like 'code_generation', 'reasoning', 'chain_of_thought'
// — matching them to the enum requires an explicit lookup rather than string equality.
// SEARCH_BROWSER is handled via the searchBrowserScore column, not this table.
export const CAPABILITY_MATCH: Record<ModelCapability, readonly string[]> = {
  [ModelCapability.TEXT]: ['general_chat', 'text_generation', 'text', 'content_writing'],
  [ModelCapability.CODE]: [
    'code_generation',
    'code_review',
    'code_completion',
    'code_explanation',
    'code_audit',
    'debugging',
    'refactoring',
    'multilingual_code',
    'api_generation',
  ],
  [ModelCapability.IMAGE_INPUT]: ['vision', 'multimodal', 'image_understanding'],
  [ModelCapability.IMAGE_OUTPUT]: ['image_generation', 'text_to_image'],
  [ModelCapability.AUDIO_INPUT]: ['audio', 'speech_recognition', 'audio_input'],
  [ModelCapability.VIDEO_INPUT]: ['video', 'video_understanding', 'video_input'],
  [ModelCapability.PDF_INPUT]: ['pdf', 'document_understanding', 'pdf_input'],
  [ModelCapability.WEB_SEARCH]: ['web_search', 'deep_research', 'search'],
  [ModelCapability.TOOL_CALLING]: ['tool_calling', 'tools', 'agentic', 'function_calling'],
  [ModelCapability.STRUCTURED_OUTPUT]: ['structured_output', 'json_output', 'schema_output'],
  [ModelCapability.OCR]: ['ocr', 'chart_understanding'],
  [ModelCapability.REASONING]: [
    'reasoning',
    'chain_of_thought',
    'analytical_reasoning',
    'clinical_reasoning',
  ],
  [ModelCapability.SEARCH_BROWSER]: ['search_browser'],
} as const;
