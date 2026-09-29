/** Why a chat save failed (ADR-133), mirroring chat-service. */
export enum SaveFailureReason {
  PLAN = 'PLAN',
  LIMIT = 'LIMIT',
  UNAVAILABLE = 'UNAVAILABLE',
}
