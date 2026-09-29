import { MEMORY_CARD_PREVIEW_MAX_CHARS } from '@/constants/memory.constants';

/**
 * What a memory card renders. Memories hold up to 250,000 characters of
 * markdown; a list of cards must not parse all of it. The full text is in the
 * edit dialog, and chat retrieves it whole.
 */
export function memoryCardPreview(content: string): string {
  return content.length <= MEMORY_CARD_PREVIEW_MAX_CHARS
    ? content
    : `${content.slice(0, MEMORY_CARD_PREVIEW_MAX_CHARS)}\n\n…`;
}
