import { MessageRole } from '../../../generated/prisma';

// Bytes of entropy in a public share identifier. 16 bytes is 128 bits, which
// makes the id space unenumerable — a crawler cannot walk it, and a guessed id
// is not a realistic attack.
export const PUBLIC_SHARE_ID_BYTES = 16;

// Roles that may appear in a published transcript.
//
// SYSTEM and TOOL are excluded deliberately and permanently. A SYSTEM message
// is the operator's prompt — it can carry business instructions, jailbreak
// defences, or customer-specific configuration. A TOOL message can carry raw
// connector output including credentials and internal endpoints. Neither is
// part of the conversation the user had.
export const PUBLISHABLE_ROLES: MessageRole[] = [MessageRole.USER, MessageRole.ASSISTANT];

// Below this, a share is not offered for indexing or ads. A two-message
// exchange is not a page worth putting in a search index, and thin content is
// exactly what an ad network penalises a whole site for.
export const MIN_INDEXABLE_MESSAGE_COUNT = 4;
export const MIN_INDEXABLE_CONTENT_CHARS = 500;

// Hard caps on what one snapshot may contain, so a pathological thread cannot
// turn a public page into a denial-of-service surface.
export const MAX_SNAPSHOT_MESSAGES = 500;
export const MAX_SNAPSHOT_MESSAGE_CHARS = 100_000;

/**
 * Images copied per published message.
 *
 * Same reasoning as MAX_SNAPSHOT_MESSAGE_CHARS: one pathological message must
 * not be able to make a public page unloadable, and each asset here is a real
 * byte-for-byte copy in file-service, so the cap is a storage bound too.
 */
export const MAX_SNAPSHOT_ASSETS_PER_MESSAGE = 8;

/**
 * The largest image a share will copy.
 *
 * Above this the asset is skipped rather than the publish failing: losing one
 * oversized picture from a public page is a better outcome than refusing to
 * publish the conversation.
 */
export const MAX_SNAPSHOT_ASSET_BYTES = 12 * 1024 * 1024;

/** Only images are published. A PDF on a public page is a different question. */
export const PUBLISHABLE_ASSET_MIME_PREFIX = 'image/';

/**
 * Per-image budget for the copy call.
 *
 * Generous, because file-service is reading and re-writing a real file; but
 * bounded, because a publish that hangs on one picture is worse than a publish
 * that loses it.
 */
export const SHARE_ASSET_COPY_TIMEOUT_MS = 20_000;

// Description shown in search results and social previews. Google truncates
// around 160; going much beyond that just pads the payload.
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_TITLE_LENGTH = 120;

// Fallback title for a thread the user never named. Never derived from message
// content, which could put a fragment of the conversation in a browser tab and
// a search result before anyone reviewed it.
export const DEFAULT_SHARE_TITLE = 'Shared conversation';
