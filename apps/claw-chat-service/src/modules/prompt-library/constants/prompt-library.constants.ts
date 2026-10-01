/** Most templates one user may keep. */
export const MAX_TEMPLATES_PER_USER = 200;
export const MAX_TITLE_LENGTH = 120;
export const MAX_BODY_LENGTH = 20000;
export const MAX_TAGS_PER_TEMPLATE = 10;
export const MAX_TAG_LENGTH = 32;
export const MAX_VARIABLES_PER_TEMPLATE = 20;
export const MAX_SEARCH_LENGTH = 120;
export const DEFAULT_LIST_LIMIT = 30;
export const MAX_LIST_LIMIT = 100;

/** `{{name}}` with a lowercase snake-case name. */
export const VARIABLE_NAME_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
export const PLACEHOLDER_PATTERN = /\{\{([^{}]*)\}\}/g;
export const PROMPT_TEMPLATE_ENTITY = 'PromptTemplate';
export const OPEN_BRACES = '{{';
export const CLOSE_BRACES = '}}';
/** Most distinct tags the tag summary returns (the 10-per-template x 200-template ceiling). */
export const MAX_TAG_SUMMARIES = 100;
