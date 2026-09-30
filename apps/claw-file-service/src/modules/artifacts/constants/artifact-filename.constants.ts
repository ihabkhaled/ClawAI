/** Characters that make a name a path. A published artifact is one file, never a location. */
export const ARTIFACT_FILENAME_SEPARATORS: ReadonlySet<string> = new Set(['/', '\\']);

/** C0 control characters end here; DEL is the one control character above them. */
export const LAST_CONTROL_CHAR_CODE = 0x1f;
export const DELETE_CHAR_CODE = 0x7f;
