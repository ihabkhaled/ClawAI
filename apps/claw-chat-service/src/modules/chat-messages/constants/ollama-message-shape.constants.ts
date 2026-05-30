// Native Ollama `/api/chat` accepts per-message `images: string[]` (base64 bodies
// with NO `data:...;base64,` prefix). Matches RFC 2397 data URLs whose MIME has
// no parameters; captures the raw base64 payload (allowing empty for the
// EMPTY_IMAGE_PAYLOAD warning path).
export const DATA_URL_BASE64_PATTERN = /^data:[^;,]*;base64,(.*)$/i;
