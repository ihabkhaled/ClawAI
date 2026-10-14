/** Why a built-in adapter could not produce a result. The message that goes with it is ours and safe to show. */
export enum AdapterFailureKind {
  BAD_INPUT = 'BAD_INPUT',
  UNAVAILABLE = 'UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
}
