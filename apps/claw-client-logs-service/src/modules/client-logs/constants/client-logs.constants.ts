/**
 * The most events one batch may carry.
 *
 * The client buffers for five seconds and then sends whatever accumulated, so
 * the cap is what stops a pathological burst — an error loop, a page mounting
 * fifty queries — from turning into one enormous insert. A client with more
 * than this splits into several requests, which is still vastly better than the
 * one-request-per-line it replaced.
 *
 * 100 x the 5,000-character message cap is a ~500 KB ceiling on the body,
 * comfortably inside any proxy limit.
 */
export const CLIENT_LOG_BATCH_MAX_EVENTS = 100;
