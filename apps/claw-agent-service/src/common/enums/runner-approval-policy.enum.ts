/**
 * F099/F100: what a runner may approve on its own when it runs a prompt job.
 * ASK approves nothing; AUTO_APPROVE_READ_ONLY approves read-only tool calls
 * only. Writes and commands always wait for the person at the runner.
 */
export enum RunnerApprovalPolicy {
  ASK = 'ASK',
  AUTO_APPROVE_READ_ONLY = 'AUTO_APPROVE_READ_ONLY',
}
