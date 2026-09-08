/**
 * IndexNow ownership key for the canonical origin.
 *
 * Committed rather than held in an env var, because this value is not a secret
 * and cannot be one: the protocol works by serving it back at a public URL, so
 * anyone who can read the site can read the key. Hiding it in `.env` would add
 * the full infra propagation (7 compose files, both install scripts, the docs)
 * to protect a string whose entire job is to be published, and would introduce
 * a way for the served file and the submitted `key` to drift apart per
 * environment — the one failure the protocol answers with a flat 403.
 *
 * What it authorises is narrow: submitting URLs that already belong to this
 * host. It grants no read access, no account access, and no ability to submit
 * anyone else's URLs.
 *
 * Rotating it means changing this constant AND renaming the route directory to
 * match, because the file has to live at `/<key>.txt` for the zero-config
 * verification path. `indexnow-key-route.test.ts` fails if the two drift.
 */
export const INDEXNOW_KEY = 'f97f50a25a734944bee9b54602a6ad0a';

/**
 * Where the key is served. Sent as `keyLocation` on every submission.
 *
 * The protocol allows either a key-named file at the root (no `keyLocation`
 * needed) or an arbitrary location that each submission names. We satisfy both:
 * the path IS the key-named root file, and we still send `keyLocation`
 * explicitly so a submission never depends on the search engine guessing the
 * convention.
 */
export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`;
