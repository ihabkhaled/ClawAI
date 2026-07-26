/**
 * Machine-readable failures the frontend maps to i18n keys.
 *
 * Deliberately coarse. A code naming which safety detector fired would tell
 * somebody how to evade it.
 */
export enum ChatShareErrorCode {
  EMPTY_THREAD = 'EMPTY_THREAD',
  SHARE_NOT_FOUND = 'SHARE_NOT_FOUND',
  INVALID_SHARE_ID = 'INVALID_SHARE_ID',
}
