/**
 * What the user can actually DO about the limit that stopped their message.
 *
 * A boolean `showUpgrade` used to sit here, hardcoded true for every kind. That
 * was already a stretch for a daily ceiling, and it becomes wrong the moment
 * pay-as-you-go credit exists: somebody on the top tier with an empty wallet is
 * told to upgrade to the plan they are already on. Worse, a platform-side
 * pricing outage would advertise a purchase that fixes nothing.
 */
export enum ChatLimitAction {
  /** Nothing the user can buy will clear this. Show no button. */
  None = 'NONE',
  /** A larger plan raises the ceiling that was hit. */
  Upgrade = 'UPGRADE',
  /** The wallet is empty; the fix is credit, not a different plan. */
  AddCredit = 'ADD_CREDIT',
}
