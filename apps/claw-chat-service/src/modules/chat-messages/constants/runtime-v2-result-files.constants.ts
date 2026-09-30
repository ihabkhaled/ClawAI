/**
 * Files a Runtime V2 tool result may hand the next model turn (F030).
 *
 * A tool result is strict JSON, so a screenshot the browser tool took never
 * reached the model — it only saw the path. The client now uploads the image
 * through the ordinary file upload and names it here. The cap is small because
 * every id is fetched and sent to the model as image bytes on the next turn.
 */
export const RUNTIME_V2_MAX_RESULT_FILE_IDS = 4;

/** Same bound the start command uses for a file id. */
export const RUNTIME_V2_RESULT_FILE_ID_CHARACTERS = 200;

/** Only images: the feature is "let the model see what the tool saw". */
export const RUNTIME_V2_RESULT_FILE_MIME_PREFIX = 'image/';

export const RUNTIME_V2_RESULT_FILE_UNAVAILABLE_CODE = 'RUNTIME_RESULT_FILE_UNAVAILABLE';
export const RUNTIME_V2_RESULT_FILE_UNAVAILABLE_MESSAGE =
  'A tool result names a file that does not exist or belongs to another account.';

export const RUNTIME_V2_RESULT_FILE_NOT_IMAGE_CODE = 'RUNTIME_RESULT_FILE_NOT_IMAGE';
export const RUNTIME_V2_RESULT_FILE_NOT_IMAGE_MESSAGE = 'A tool result file must be an image.';

/**
 * The line the continuation adds when the result carried images. Neutral on
 * purpose: whether this lane's model is sent the bytes or a note that it
 * cannot see them is decided later, per lane, by attachment delivery.
 */
export const RUNTIME_V2_RESULT_FILES_NOTE_PREFIX =
  'The tool result also returned image file(s), attached to the tool result message when this model accepts images:';
