/**
 * Terminator that separates one SSE event from the next. Both the W3C and
 * OpenAI SSE conventions use a single blank line, which over the wire is
 * `\n\n`. We match exactly that and never assume `\r\n\r\n` — llama-server
 * emits `\n\n` natively.
 */
export const SSE_EVENT_TERMINATOR = '\n\n';
