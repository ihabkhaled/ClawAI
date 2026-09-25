/**
 * The one pause the transcription walk takes before retrying a transient 429.
 * Its own module so a unit test can replace it instead of waiting in real time.
 */
export function waitForTranscriptionBackoff(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
