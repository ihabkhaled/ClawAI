import type { RuntimeV2ThreadActivity } from '../types/runtime-v2-thread-activity.types';

// The code the store raises when a run's Redis state is gone. For an activity
// query that is an answer, not an error: an expired run is not running.
export const RUNTIME_V2_RUN_NOT_FOUND_CODE = 'RUNTIME_RUN_NOT_FOUND';

// Reads the journal from past its end, so the read returns the run's terminal
// flag and no events. The read script never refreshes TTLs, so asking whether a
// run is live cannot keep a dead one alive.
export const RUNTIME_V2_ACTIVITY_READ_CURSOR = Number.MAX_SAFE_INTEGER;

export const RUNTIME_V2_THREAD_INACTIVE: RuntimeV2ThreadActivity = { active: false };
