/** Why a mentioned workspace cannot be used for this request. */
export enum WorkspaceMentionRefusal {
  /// The user has no connector for that provider, or it is not CONNECTED and
  /// enabled. Fixable by the user, in settings.
  NOT_CONNECTED = 'NOT_CONNECTED',
  /// A connector exists and the user can see it, but their access level does
  /// not permit proposing actions against it. Fixable by whoever owns it.
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
}
