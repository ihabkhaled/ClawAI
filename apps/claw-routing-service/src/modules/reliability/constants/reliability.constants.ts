/// Number of consecutive failures within the rolling window that flips
/// a breaker from CLOSED to OPEN.
export const CB_FAILURE_THRESHOLD = 3;

/// Failures within this many ms count toward the threshold.
export const CB_FAILURE_WINDOW_MS = 60_000;

/// How long a breaker stays OPEN before transitioning to HALF_OPEN.
export const CB_OPEN_DURATION_MS = 60_000;
