/**
 * Size ceilings for user-authored memory and context-pack content.
 *
 * Memories and pack items are TEXT columns; the ceiling exists to bound the
 * request body and the embedding work, not the storage. 250,000 characters
 * holds a large specification (the real-world trigger was a ~45K-char
 * markdown pack) with room to spare. Retrieval never injects a body this size
 * whole — it is chunked and ranked (see memory-retrieval.service.ts).
 */
export const MEMORY_CONTENT_MAX_CHARS = 250_000;
export const CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS = 250_000;

/**
 * JSON body ceiling for memory-service. 250K chars of markdown can be up to
 * ~1 MB once UTF-8 multibyte text (Arabic, CJK) and JSON escaping are counted,
 * so the parser allows 4 MB. Express's default is 100 KB, which silently
 * capped every create at roughly 100K characters.
 */
export const MEMORY_SERVICE_BODY_LIMIT = '4mb';
