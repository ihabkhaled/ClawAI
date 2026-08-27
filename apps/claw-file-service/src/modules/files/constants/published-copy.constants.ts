/**
 * Only images become share-owned copies.
 *
 * A PDF or a spreadsheet on a public, ad-serving, indexable page is a different
 * content-rights question, and it must not get answered by accident because a
 * message happened to carry one.
 */
export const PUBLISHABLE_COPY_MIME_PREFIX = 'image/';

/**
 * The largest file a share will copy.
 *
 * Each copy is permanent by design — the sweeper never reaps it — so this is a
 * storage bound, not just a request bound.
 */
export const MAX_PUBLISHED_COPY_BYTES = 12 * 1024 * 1024;
