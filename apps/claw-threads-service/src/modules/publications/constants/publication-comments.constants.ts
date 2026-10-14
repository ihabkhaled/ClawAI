import { z } from 'zod';

/** Replies one conversation (top-level comment) may hold. Past it a reply is refused with 422. */
export const MAX_REPLIES_PER_ROOT = 500;

/** Distinct @mentions kept from one comment; further ones are ignored. */
export const MAX_MENTIONS_PER_COMMENT = 10;

/** Top-level comments per page: default and ceiling. */
export const COMMENTS_DEFAULT_PAGE_SIZE = 20;
export const COMMENTS_MAX_PAGE_SIZE = 50;

/** Replies sent with each top-level comment; the rest are fetched from the replies endpoint. */
export const REPLY_PREVIEW_COUNT = 3;

/** Replies per page of the replies endpoint: default and ceiling. */
export const REPLIES_DEFAULT_PAGE_SIZE = 20;
export const REPLIES_MAX_PAGE_SIZE = 50;

/** Shown in place of a hidden or removed comment that still has visible replies. */
export const COMMENT_REMOVED_PLACEHOLDER = '[removed]';

/** Length of the one-line excerpt carried in a notification. */
export const NOTIFICATION_EXCERPT_MAX_LENGTH = 120;

/** Longest actor name carried in a notification. */
export const NOTIFICATION_ACTOR_NAME_MAX_LENGTH = 100;

export const COMMENT_REPLY_LIMIT_ERROR_CODE = 'THREADS_COMMENT_REPLY_LIMIT';
export const COMMENT_PARENT_NOT_FOUND_MESSAGE = 'Comment not found';

/**
 * An @username as the register form allows one (3-32 of letters, digits, `_`, `-`). It must not touch
 * a letter, digit, `_`, `@`, `.` or `-` before the `@` (so an e-mail address and `a@@b` are not
 * mentions) nor a letter or digit after the name, whatever the script. Both neighbours are single
 * characters and the name is bounded, so the scan is linear in the text.
 */
export const MENTION_PATTERN = /(?<![\p{L}\p{N}_@.-])@([A-Za-z0-9_-]{3,32})(?![\p{L}\p{N}_-])/gu;

/** Markdown code fence and inline-code marker, removed before mentions are read. */
export const CODE_FENCE = '```';
export const CODE_TICK = '`';

/** The decoded shape of a replies cursor: time of the last reply and its id. */
export const REPLY_CURSOR_SCHEMA = z.object({
  t: z.string().datetime(),
  i: z.string().min(1).max(64),
});
