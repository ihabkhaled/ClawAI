/** What a user notification is about. The text is chosen from this, never sent in the event. */
export enum UserNotificationKind {
  THREAD_READY_FOR_REVIEW = 'THREAD_READY_FOR_REVIEW',
  THREAD_PUBLISHED = 'THREAD_PUBLISHED',
  THREAD_FAILED = 'THREAD_FAILED',
}
