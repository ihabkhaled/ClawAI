export enum RuntimeProgressStage {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  HEALTH_CHECK = 'HEALTH_CHECK',
  QUEUED = 'QUEUED',
  MODEL_LOADING = 'MODEL_LOADING',
  MODEL_WARMING_UP = 'MODEL_WARMING_UP',
  PROMPT_EVAL = 'PROMPT_EVAL',
  THINKING = 'THINKING',
  TOOL_CALLING = 'TOOL_CALLING',
  // Research-enricher lifecycle stages. Emitted by chat-service today, but
  // exposed cross-service so image-service / agent-service can reuse them
  // when they orchestrate web-research workflows in the future. Aligned
  // with AiStreamStage.RESEARCH_* in the chat-service runtime.
  // Site-crawl lifecycle. SEPARATE from the RESEARCH_* family on purpose:
  // crawling a page the user named and searching the web are different
  // operations that happen at different times, and collapsing crawl ticks into
  // RESEARCH_* left the UI able to render only one undifferentiated "research"
  // blob while two distinct things were happening.
  CRAWL_STARTED = 'CRAWL_STARTED',
  CRAWL_DISCOVERING = 'CRAWL_DISCOVERING',
  CRAWL_READING_PAGE = 'CRAWL_READING_PAGE',
  CRAWL_COMPLETED = 'CRAWL_COMPLETED',
  RESEARCH_STARTED = 'RESEARCH_STARTED',
  RESEARCH_SOURCES_FOUND = 'RESEARCH_SOURCES_FOUND',
  RESEARCH_FETCHING = 'RESEARCH_FETCHING',
  RESEARCH_COMPLETED = 'RESEARCH_COMPLETED',
  RESEARCH_FAILED = 'RESEARCH_FAILED',
  GENERATING = 'GENERATING',
  SAMPLING = 'SAMPLING',
  EXECUTING_NODE = 'EXECUTING_NODE',
  NODE_COMPLETED = 'NODE_COMPLETED',
  DECODING = 'DECODING',
  POST_PROCESSING = 'POST_PROCESSING',
  SAVING = 'SAVING',
  FINALIZING = 'FINALIZING',
  DONE = 'DONE',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED',
}
