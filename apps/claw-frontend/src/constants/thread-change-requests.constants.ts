/** The `#change-request-<id>` anchor scheme shared with the notification links. */
export const THREAD_CHANGE_REQUEST_ANCHOR_PREFIX = 'change-request-';

/** A suggestion longer than this many characters is shown clamped, with a Show more toggle. */
export const THREAD_SUGGESTION_CLAMP_CHARS = 600;

/** The editor block on the review screen, so accepting "I will edit it myself" can bring it into view. */
export const THREAD_REVISION_EDITOR_ID = 'thread-revision-editor';
export const THREAD_REVISION_TEXTAREA_ID = 'thread-revision-markdown';

/** How long a linked suggestion stays highlighted. */
export const THREAD_CHANGE_REQUEST_HIGHLIGHT_MS = 4000;

/** How long the owner-ness of a public Thread and its credit line are reused before asking again. */
export const THREAD_CHANGE_REQUEST_VIEW_STALE_MS = 60_000;
