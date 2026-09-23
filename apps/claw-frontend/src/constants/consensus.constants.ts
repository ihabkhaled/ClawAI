export const MIN_CONSENSUS_MODELS = 2;
export const MAX_CONSENSUS_MODELS = 5;
export const CONSENSUS_POLL_INTERVAL_MS = 3000;
export const CONSENSUS_POLL_MESSAGES_LIMIT = 50;
// Backstop matching the other 7 orchestration labs (best-of-n, cost-ensemble,
// decompose, pipeline, repair, role-pack, verify): without it, a run that
// never produces a synthesis message (backend error with no error-tagged
// message written) polls forever and keeps the submit button disabled
// forever. 60 polls * 3s interval = 3 minutes.
export const MAX_CONSENSUS_POLL_COUNT = 60;
