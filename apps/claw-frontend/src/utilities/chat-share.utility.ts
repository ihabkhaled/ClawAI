import { SHARED_CHAT_DESCRIPTION_MAX_CHARS } from '@/constants/chat-share.constants';
import { BadgeTone } from '@/enums/badge-tone.enum';
import { ChatShareSafetyStatus, ChatShareVisibility } from '@/enums/chat-share.enum';
import type { OwnerChatShare } from '@/types/chat-share.types';

/** i18n keys for the visibility badge, keyed by visibility. */
export function visibilityLabelKey(visibility: ChatShareVisibility): string {
  if (visibility === ChatShareVisibility.PUBLIC_INDEXED) {
    return 'chatShare.visibility.indexed';
  }
  if (visibility === ChatShareVisibility.PUBLIC_UNLISTED) {
    return 'chatShare.visibility.unlisted';
  }
  return 'chatShare.visibility.private';
}

/**
 * Indexed is INFO rather than SUCCESS on purpose.
 *
 * A green "success" badge would read as reassurance, and "this conversation is in
 * Google" is not a reassuring state — it is a factual one the owner chose.
 */
export function visibilityTone(visibility: ChatShareVisibility): BadgeTone {
  if (visibility === ChatShareVisibility.PUBLIC_INDEXED) {
    return BadgeTone.INFO;
  }
  if (visibility === ChatShareVisibility.PUBLIC_UNLISTED) {
    return BadgeTone.WARNING;
  }
  return BadgeTone.SECONDARY;
}

/**
 * Why the server refused indexing, as an i18n key, or null when it did not.
 *
 * The two causes are treated differently because the remedies differ: a safety
 * flag needs the owner to remove something from the conversation, while thin
 * content just needs more conversation.
 */
export function indexingBlockedReasonKey(share: OwnerChatShare | null): string | null {
  if (share === null || share.visibility === ChatShareVisibility.PUBLIC_INDEXED) {
    return null;
  }
  if (share.safetyStatus === ChatShareSafetyStatus.REQUIRES_REVIEW) {
    return 'chatShare.blocked.safety';
  }
  if (!share.adsEligible) {
    return 'chatShare.blocked.tooShort';
  }
  return null;
}

/**
 * Builds a meta description from published message text.
 *
 * Truncates on a word boundary within the character cap so a search result never
 * ends mid-word, and collapses whitespace so a code block's indentation does not
 * turn the snippet into a ragged mess. Returns null when there is nothing worth
 * describing, and the caller falls back to a generic description rather than
 * emitting an empty one.
 */
export function buildShareMetaDescription(source: string | null): string | null {
  if (source === null) {
    return null;
  }
  const collapsed = source.replaceAll(/\s+/gu, ' ').trim();
  if (collapsed.length === 0) {
    return null;
  }
  if (collapsed.length <= SHARED_CHAT_DESCRIPTION_MAX_CHARS) {
    return collapsed;
  }
  const clipped = collapsed.slice(0, SHARED_CHAT_DESCRIPTION_MAX_CHARS);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped}…`;
}

/**
 * The provider/model label for a public message, or null when there is nothing
 * safe to show.
 *
 * Both labels are display strings the server already sanitised — never connector
 * ids. Returning null rather than an empty string lets the view omit the element
 * entirely instead of rendering a stray separator.
 */
export function formatPublicModelLabel(
  providerLabel: string | null,
  modelLabel: string | null,
): string | null {
  if (modelLabel !== null && modelLabel.length > 0) {
    return providerLabel !== null && providerLabel.length > 0
      ? `${providerLabel} · ${modelLabel}`
      : modelLabel;
  }
  return providerLabel !== null && providerLabel.length > 0 ? providerLabel : null;
}
