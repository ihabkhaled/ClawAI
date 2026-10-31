// Search-first workflow constants — Phase 6 of the semantic router flagship.

// Workflow value emitted by routing-service. Compared as a plain string to
// avoid coupling chat-service to the routing-service Prisma enum (different
// Prisma client; the value is serialized as a string over RabbitMQ anyway).
export const WORKFLOW_KIND_SEARCH_FIRST = 'SEARCH_FIRST';

// Top-N merged results (all providers, ADR-212) to include in the prompt. The window-sized
// evidence budget (research-evidence-budget.utility) trims this to fit, so it is a ceiling.
export const SEARCH_FIRST_MAX_RESULTS = 8;

// Ceiling for snippet length per result (was 280). The same budget shortens it on a small
// model, so a larger ceiling costs nothing there.
export const SEARCH_FIRST_MAX_SNIPPET_CHARS = 500;

// The timeout is not here: there is one set for every surface, in the research gateway.

// Reason codes used for telemetry / metadata so the FE can render an
// honest "we tried to search but ..." banner.
export const SEARCH_FIRST_WARNING_TIMEOUT = 'search_timeout';
export const SEARCH_FIRST_WARNING_NO_RESULTS = 'search_no_results';
export const SEARCH_FIRST_WARNING_HTTP_ERROR = 'search_http_error';
export const SEARCH_FIRST_WARNING_EXCEPTION = 'search_exception';
export const SEARCH_FIRST_WARNING_ALREADY_RESEARCHED = 'search_already_researched';
