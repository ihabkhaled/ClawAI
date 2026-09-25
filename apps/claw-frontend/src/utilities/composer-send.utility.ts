/**
 * Whether a composer has something to send: words, files, or both.
 *
 * "I can send attachments/files WITHOUT text." Every send button used to gate
 * on `content.trim().length > 0`, so a voice note or a PDF could not be sent
 * on its own. Attached files waive the text requirement, including a lab's own
 * minimum length; with no files the trimmed text must still reach it.
 */
export function hasSendableInput(content: string, fileCount: number, minLength = 1): boolean {
  return fileCount > 0 || content.trim().length >= minLength;
}
