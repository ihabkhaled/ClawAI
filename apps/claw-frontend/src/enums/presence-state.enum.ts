/** Where a user stands on the presence clock. Mirrors auth-service PresenceState. */
export enum PresenceState {
  /** Seen within the last 5 minutes. */
  ONLINE = 'ONLINE',
  /** Seen within the last 24 hours, not online now. */
  RECENT = 'RECENT',
  /** Not seen for 24 hours, or never. */
  OFFLINE = 'OFFLINE',
}
