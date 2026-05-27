// Search-first workflow constants — Phase 6 of the semantic router flagship.

// Workflow value emitted by routing-service. Compared as a plain string to
// avoid coupling chat-service to the routing-service Prisma enum (different
// Prisma client; the value is serialized as a string over RabbitMQ anyway).
export const WORKFLOW_KIND_SEARCH_FIRST = 'SEARCH_FIRST';

// Top-N search results to include in the prompt. 5 is a balance between
// signal density and prompt token cost.
export const SEARCH_FIRST_MAX_RESULTS = 5;

// Hard ceiling for snippet length per result. Long snippets eat the token
// budget for negligible quality gain.
export const SEARCH_FIRST_MAX_SNIPPET_CHARS = 280;

// Timeout for the research-service search call. Search MUST not block the
// chat request indefinitely; on timeout we degrade to DIRECT_LLM and log
// a warning that surfaces in metadata.
export const SEARCH_FIRST_TIMEOUT_MS = 8_000;

// Reason codes used for telemetry / metadata so the FE can render an
// honest "we tried to search but ..." banner.
export const SEARCH_FIRST_WARNING_TIMEOUT = 'search_timeout';
export const SEARCH_FIRST_WARNING_NO_RESULTS = 'search_no_results';
export const SEARCH_FIRST_WARNING_HTTP_ERROR = 'search_http_error';
export const SEARCH_FIRST_WARNING_EXCEPTION = 'search_exception';
