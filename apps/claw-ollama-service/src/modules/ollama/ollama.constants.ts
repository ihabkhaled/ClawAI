export const OLLAMA_API_TAGS = '/api/tags';
export const OLLAMA_API_GENERATE = '/api/generate';
// The only Ollama surface that accepts tool definitions and returns
// `message.tool_calls`. `/api/generate` is prompt-completion — no message
// array, no roles, nothing to attach tools to — so tools can never be
// retrofitted onto it.
export const OLLAMA_API_CHAT = '/api/chat';
export const OLLAMA_API_PULL = '/api/pull';
export const OLLAMA_API_DELETE = '/api/delete';
export const OLLAMA_API_VERSION = '/api/version';
