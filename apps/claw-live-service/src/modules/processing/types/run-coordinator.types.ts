import type { LiveMode } from '../../../generated/prisma';

/**
 * The surface the sessions module calls on the processing module
 * (RunCoordinatorService). Implemented by the processing module.
 */
export interface RunAttachRequest {
  streamId: string;
  mode: LiveMode;
}

export interface RunAttachResult {
  runId: string;
  /** True when this call created the run (first eligible viewer). */
  created: boolean;
}

export interface RunCoordinatorContract {
  /** Create-or-join the one active run for (stream, mode, pipeline version). Atomic via activeKey. */
  attach(request: RunAttachRequest): Promise<RunAttachResult>;
  /** Called after any viewer detaches; stops the run immediately when no viewer remains. */
  onViewerDetached(runId: string): Promise<void>;
  /** Refuses new runs over capacity/budget: returns a LiveStatusCode.CAPACITY reason or null. */
  admissionRefusal(): Promise<string | null>;
}
