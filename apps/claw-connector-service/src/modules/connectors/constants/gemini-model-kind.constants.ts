/**
 * Gemini `supportedGenerationMethods` entries that mean "returns vectors".
 * A model with one of these and no `generateContent` is an embedding model;
 * a model with neither (aqa's `generateAnswer`, Imagen `predict`) is not a
 * chat model either. See `classifyGeminiModelKind`.
 */
export const GEMINI_EMBEDDING_METHODS: readonly string[] = [
  'embedContent',
  'batchEmbedContents',
  'embedText',
  'asyncBatchEmbedContent',
];

/** The one method that answers a chat turn. */
export const GEMINI_CHAT_METHOD = 'generateContent';
