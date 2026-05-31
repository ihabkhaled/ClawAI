export const ANTHROPIC_DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
// Slice D foundation 3 — bumped from 2023-06-01 to 2024-06-01 so the
// anthropic adapter can opt-in to the native `document` content part for
// PDF attachments (ENABLE_ANTHROPIC_NATIVE_PDF). All earlier features stay
// backward-compatible; the header is the only requirement Anthropic
// publishes for the document/PDF content type.
export const ANTHROPIC_VERSION = '2024-06-01';
