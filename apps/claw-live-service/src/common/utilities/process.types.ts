export interface BoundedProcessOptions {
  /** Hard wall-clock limit; the child is SIGKILLed when reached. */
  timeoutMs: number;
  /** Largest stdout kept; the child is killed when exceeded. */
  maxOutputBytes: number;
}

export interface BoundedProcessResult {
  exitCode: number | null;
  stdout: Buffer;
  /** Last bytes of stderr, for a log line. Never contains secrets: ffmpeg args carry none. */
  stderrTail: string;
}
