/** F099 step 2: what fired a routine run. Stored on the job; decides whether secrets are injected. */
export enum RoutineRunSource {
  SCHEDULE = 'SCHEDULE',
  MANUAL = 'MANUAL',
  WEBHOOK = 'WEBHOOK',
}
