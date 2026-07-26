/**
 * The nine consequences of publishing a chat, as i18n keys in display order.
 *
 * Kept as data rather than nine props so adding a consequence is a one-line
 * change here plus a locale entry, and so the list cannot silently diverge
 * between the dialog and the privacy documentation that mirrors it.
 */
export const SHARE_PUBLICATION_BULLET_KEYS: ReadonlyArray<string> = [
  'chatShare.warning.noLoginRequired',
  'chatShare.warning.containsHistory',
  'chatShare.warning.mayBeIndexed',
  'chatShare.warning.mayAppearInSearch',
  'chatShare.warning.mayShowAds',
  'chatShare.warning.revokeIsNotRemoval',
  'chatShare.warning.futureMessagesPrivate',
  'chatShare.warning.mustUpdateExplicitly',
  'chatShare.warning.noSensitiveData',
];
