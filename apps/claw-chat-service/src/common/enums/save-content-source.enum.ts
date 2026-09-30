/** Which text a context-pack save keeps (ADR-134). */
export enum SaveContentSource {
  /** What the user wrote in this message. */
  USER_TEXT = 'USER_TEXT',
  /** The message right before this one (usually the assistant's answer). */
  PREVIOUS_MESSAGE = 'PREVIOUS_MESSAGE',
  /** A summary the classifier wrote because the user asked for one. */
  SUMMARY = 'SUMMARY',
}
