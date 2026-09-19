/** Why a message was, or was not, read as a request for a file. */
export type FileIntentReason =
  'phrase' | 'extension' | 'strong_word_with_verb' | 'soft_word_with_delivery_verb' | 'none';

export interface FileIntentResult {
  isFileRequest: boolean;
  reason: FileIntentReason;
}
