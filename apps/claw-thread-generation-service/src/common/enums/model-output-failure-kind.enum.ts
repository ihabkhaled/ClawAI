/** Why a model reply was not the JSON object a role asked for. */
export enum ModelOutputFailureKind {
  EMPTY = 'EMPTY',
  TRUNCATED = 'TRUNCATED',
  PROSE = 'PROSE',
  INVALID_JSON = 'INVALID_JSON',
  WRONG_SHAPE = 'WRONG_SHAPE',
}
