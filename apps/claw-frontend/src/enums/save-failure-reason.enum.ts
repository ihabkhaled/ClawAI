/** Why a chat save failed (ADR-134), mirroring chat-service. */
export enum SaveFailureReason {
  PLAN = 'PLAN',
  LIMIT = 'LIMIT',
  UNAVAILABLE = 'UNAVAILABLE',
}
