/** Why a tool the server listed was not taken into the snapshot. */
export enum ToolSkipReason {
  BAD_NAME = 'BAD_NAME',
  BAD_DESCRIPTION = 'BAD_DESCRIPTION',
  BAD_SCHEMA = 'BAD_SCHEMA',
  NAME_COLLISION = 'NAME_COLLISION',
  MALFORMED = 'MALFORMED',
}
