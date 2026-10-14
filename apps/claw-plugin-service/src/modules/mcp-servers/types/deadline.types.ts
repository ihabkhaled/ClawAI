export type Deadline = {
  /** Milliseconds left; throws McpFailure(TIMEOUT) once the budget is gone. */
  remaining: () => number;
};
