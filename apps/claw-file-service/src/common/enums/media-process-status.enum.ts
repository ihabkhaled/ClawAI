/**
 * How one bounded ffprobe/ffmpeg run ended (`runMediaProcess`). Only `EXITED`
 * means the process finished on its own; the caller still checks the exit code.
 */
export enum MediaProcessStatus {
  EXITED = 'EXITED',
  /** Killed with SIGKILL at the wall-clock budget. */
  TIMED_OUT = 'TIMED_OUT',
  /** Killed with SIGKILL for printing more than the stdout cap. */
  OUTPUT_LIMIT_EXCEEDED = 'OUTPUT_LIMIT_EXCEEDED',
  /** Killed with SIGKILL because the caller's AbortSignal fired (a user cancel). */
  ABORTED = 'ABORTED',
  /** The binary is missing or could not be started. */
  SPAWN_FAILED = 'SPAWN_FAILED',
}
