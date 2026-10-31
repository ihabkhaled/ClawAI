/** Where a user stands on the presence clock (lastSeenAt vs now). */
export enum PresenceState {
  /** Seen within the online window (5 minutes). */
  ONLINE = 'ONLINE',
  /** Seen within the last 24 hours but not online now. */
  RECENT = 'RECENT',
  /** Not seen for 24 hours, or never. */
  OFFLINE = 'OFFLINE',
}

/** The two admin list filters over lastSeenAt. ACTIVE_24H includes ONLINE users. */
export enum PresenceFilter {
  ONLINE = 'ONLINE',
  ACTIVE_24H = 'ACTIVE_24H',
}
