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
}
