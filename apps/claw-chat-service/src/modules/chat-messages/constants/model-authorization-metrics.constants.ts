// Rolling window of authorization latencies. Large enough that a p95 over it
// means something, small enough that it stays a fixed, bounded allocation in a
// process that never restarts on its own.
export const MODEL_AUTHORIZATION_LATENCY_WINDOW = 512;
