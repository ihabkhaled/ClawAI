/** Whether a model can be used for a Thread by this account, as threads-service reports it. */
export enum ThreadModelAvailability {
  Available = 'AVAILABLE',
  /** The account's plan does not include the model. */
  NeedsPlan = 'NEEDS_PLAN',
  /** The model's known context window cannot hold a role's context. */
  WindowTooSmall = 'WINDOW_TOO_SMALL',
  /** Kept out on purpose (provider out of credit or failing). */
  Unavailable = 'UNAVAILABLE',
}
