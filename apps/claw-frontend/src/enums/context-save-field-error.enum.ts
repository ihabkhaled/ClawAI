/** Why a field of the "Remember this" dialog cannot be saved yet (ADR-168). */
export enum ContextSaveFieldError {
  EMPTY = 'EMPTY',
  TOO_LONG = 'TOO_LONG',
  REQUIRED = 'REQUIRED',
}
