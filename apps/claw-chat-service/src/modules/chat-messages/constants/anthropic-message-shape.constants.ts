// Anthropic native Messages API constants. Matches the OpenAI `image_url`
// data URL pattern (`data:<mime>;base64,<payload>`) — the OpenAI canonical
// content shape used by ContextAssemblyManager carries every attachment
// (image OR pdf) as `image_url` parts with that prefix.

export const DATA_URL_BASE64_PATTERN = /^data:([^;,]*);base64,(.*)$/i;

// Anthropic media type for PDF documents inside a `document` content block.
export const ANTHROPIC_PDF_MEDIA_TYPE = 'application/pdf';

// Anthropic content-block discriminator values.
export const ANTHROPIC_TEXT_BLOCK_TYPE = 'text';
export const ANTHROPIC_IMAGE_BLOCK_TYPE = 'image';
export const ANTHROPIC_DOCUMENT_BLOCK_TYPE = 'document';

// Source shape used by both `image` and `document` blocks.
export const ANTHROPIC_BASE64_SOURCE_TYPE = 'base64';
