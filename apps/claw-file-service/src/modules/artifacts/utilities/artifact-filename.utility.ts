import {
  ARTIFACT_FILENAME_SEPARATORS,
  DELETE_CHAR_CODE,
  LAST_CONTROL_CHAR_CODE,
} from '../constants/artifact-filename.constants';

/** A bare file name: no directory separator and no control character. */
export function isSafeArtifactFilename(name: string): boolean {
  for (const char of name) {
    const code = char.codePointAt(0) ?? 0;
    if (
      ARTIFACT_FILENAME_SEPARATORS.has(char) ||
      code <= LAST_CONTROL_CHAR_CODE ||
      code === DELETE_CHAR_CODE
    ) {
      return false;
    }
  }
  return true;
}
