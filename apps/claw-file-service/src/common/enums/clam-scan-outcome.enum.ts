/**
 * What one ClamAV scan concluded.
 *
 * UNAVAILABLE is not a verdict on the file: clamd could not be reached before
 * the deadline. It still fails closed, but the upload path reports it as a
 * retryable `ANTIVIRUS_UNAVAILABLE` instead of "your file was rejected".
 */
export enum ClamScanOutcome {
  CLEAN = 'clean',
  INFECTED = 'infected',
  UNAVAILABLE = 'unavailable',
  UNEXPECTED = 'unexpected',
  DISABLED = 'disabled',
}
