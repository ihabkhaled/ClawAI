import { COMPOSER_DRAFT_KEY_PREFIX, COMPOSER_DRAFT_MAX_LENGTH } from '@/constants';
import { logger } from '@/utilities/logger.utility';

/**
 * One key per thread.
 *
 * A single shared key would carry a half-written message from one conversation
 * into another, which is worse than losing it.
 */
export function buildComposerDraftKey(threadId: string): string {
  return `${COMPOSER_DRAFT_KEY_PREFIX}${threadId}`;
}

/**
 * Reads a saved draft, or an empty string.
 *
 * Never throws. localStorage is unavailable in a private window, in some
 * embedded webviews, and whenever the origin's storage is full — none of which
 * are reasons to fail to render a composer.
 */
export function readComposerDraft(threadId: string): string {
  if (typeof window === 'undefined') {return '';}
  try {
    return window.localStorage.getItem(buildComposerDraftKey(threadId)) ?? '';
  } catch (error) {
    logger.warn({
      component: 'chat',
      action: 'composer-draft-read',
      message: 'localStorage read failed; draft not restored',
      details: { error: (error as Error).message },
    });
    return '';
  }
}

/**
 * Persists a draft, or removes the key when the composer is empty.
 *
 * Long drafts are dropped rather than truncated: half a message restored
 * silently is a worse outcome than none, because the user cannot tell it
 * happened.
 */
export function writeComposerDraft(threadId: string, content: string): void {
  if (typeof window === 'undefined') {return;}
  try {
    if (content.trim().length === 0 || content.length > COMPOSER_DRAFT_MAX_LENGTH) {
      window.localStorage.removeItem(buildComposerDraftKey(threadId));
      return;
    }
    window.localStorage.setItem(buildComposerDraftKey(threadId), content);
  } catch (error) {
    logger.warn({
      component: 'chat',
      action: 'composer-draft-write',
      message: 'localStorage write failed; draft not saved',
      details: { error: (error as Error).message },
    });
  }
}

export function clearComposerDraft(threadId: string): void {
  writeComposerDraft(threadId, '');
}
