// Status of a single node in the ComfyUI per-node execution timeline.
// Derived from the runtime progress envelope stream:
//   - PENDING:   the node has been registered but has not started.
//   - EXECUTING: the node is currently running (EXECUTING_NODE stage).
//   - COMPLETED: the node has finished (NODE_COMPLETED stage).
export enum ComfyUINodeTimelineStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
}
