/** Which door a feedback ticket came through. Stored on the ticket, filterable by admins. */
export enum FeedbackSource {
  AUTHENTICATED = 'AUTHENTICATED',
  PUBLIC = 'PUBLIC',
  /** Raised by the platform itself, e.g. a Threads job that ran out of retries. */
  SYSTEM = 'SYSTEM',
}
