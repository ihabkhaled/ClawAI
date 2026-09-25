/**
 * The stored bytes of an upload could not be read back into a media job's
 * temp dir. Its own class so the video pipeline records SOURCE_UNREADABLE
 * rather than blaming the container.
 */
export class MediaSourceUnreadableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaSourceUnreadableError';
  }
}
