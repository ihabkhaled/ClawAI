export const RUNTIME_V2_POLL_MS = 350;

// How many CONSECUTIVE failed polls the stream tolerates before it gives up.
//
// The read loop polls Redis every 350ms for the run's next events. Any error
// from that poll used to propagate straight out of the generator and end the
// SSE stream, which the client reports as RUNTIME_STATE_UNAVAILABLE — the run
// looks dead. It usually is not. Observed repeatedly while the agent ran
// `git commit`, whose pre-commit hook takes minutes: the ioredis connection
// reported `Connection is closed` on one poll while Redis itself answered PING
// and the service had not restarted. One dropped poll killed a run whose tool
// call was still executing normally and whose work then had nowhere to land.
//
// A poll is idempotent — it re-reads from the same cursor — so retrying costs
// nothing and loses no events. Only a sustained outage should end the stream,
// which is what a consecutive-failure count expresses. At 350ms per attempt
// this tolerates roughly seven seconds of Redis unavailability.
export const RUNTIME_V2_POLL_FAILURE_TOLERANCE = 20;
