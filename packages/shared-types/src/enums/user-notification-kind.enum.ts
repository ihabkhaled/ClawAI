/** What a user notification is about. The text is chosen from this, never sent in the event. */
export enum UserNotificationKind {
  THREAD_READY_FOR_REVIEW = 'THREAD_READY_FOR_REVIEW',
  THREAD_PUBLISHED = 'THREAD_PUBLISHED',
  THREAD_FAILED = 'THREAD_FAILED',
  /** Someone commented on your Thread (to the publication owner). */
  THREAD_COMMENTED = 'THREAD_COMMENTED',
  /** Someone replied to your comment. */
  THREAD_COMMENT_REPLIED = 'THREAD_COMMENT_REPLIED',
  /** Someone mentioned you with @username in a comment. */
  THREAD_MENTIONED = 'THREAD_MENTIONED',
  /** Someone liked (or first reacted to) your Thread. */
  THREAD_REACTED = 'THREAD_REACTED',
  /** Someone liked your comment. */
  THREAD_COMMENT_REACTED = 'THREAD_COMMENT_REACTED',
  /** Someone asked for a change to your Thread. */
  THREAD_CHANGE_REQUESTED = 'THREAD_CHANGE_REQUESTED',
  /** The owner accepted a change the person suggested (to the requester). */
  THREAD_CHANGE_ACCEPTED = 'THREAD_CHANGE_ACCEPTED',
  /** The owner republished the Thread with the person's suggestion applied (to the requester). */
  THREAD_CHANGE_APPLIED = 'THREAD_CHANGE_APPLIED',
  /** The owner declined a change the person suggested (to the requester). */
  THREAD_CHANGE_DECLINED = 'THREAD_CHANGE_DECLINED',
  /** An admin approved a remote MCP server the user registered. */
  MCP_SERVER_APPROVED = 'MCP_SERVER_APPROVED',
  /** An admin rejected a remote MCP server the user registered (the reason travels in params.excerpt). */
  MCP_SERVER_REJECTED = 'MCP_SERVER_REJECTED',
}
