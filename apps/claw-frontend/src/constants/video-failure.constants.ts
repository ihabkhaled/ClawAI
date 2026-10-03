/**
 * Stored video failure codes that have a translated sentence. A code absent here
 * falls back to the English sentence the server stored with the failure.
 */
export const VIDEO_FAILURE_MESSAGE_KEY_BY_CODE: ReadonlyMap<string, string> = new Map([
  ['VIDEO_SOURCE_IMAGE_INVALID', 'chat.videoFailureSourceImageInvalid'],
  ['VIDEO_PROVIDER_CREDITS_DEPLETED', 'chat.videoFailureCreditsDepleted'],
]);
