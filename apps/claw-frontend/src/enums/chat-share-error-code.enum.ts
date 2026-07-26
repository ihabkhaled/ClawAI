/**
 * Machine-readable share failures, mirroring `ChatShareErrorCode` in
 * chat-service verbatim.
 *
 * The set is deliberately coarse on the backend — a code naming which safety
 * detector fired would tell somebody how to evade it — so this is the complete
 * list, not a subset the UI happens to care about.
 */
export enum ChatShareErrorCode {
  EmptyThread = 'EMPTY_THREAD',
  ShareNotFound = 'SHARE_NOT_FOUND',
  InvalidShareId = 'INVALID_SHARE_ID',
}
