import {
  PASTED_TEXT_ATTACHMENT_THRESHOLD_CHARS,
  PASTED_TEXT_FILE_EXTENSION,
  PASTED_TEXT_FILENAME_PREFIX,
  PASTED_TEXT_MIME_TYPE,
} from '@/constants/pasted-text.constants';

// True when a paste is big enough to go in as a text attachment rather than
// as composer text (ADR-219). Short pastes stay inline, as typed text does.
export function isLargePaste(text: string): boolean {
  return text.length > PASTED_TEXT_ATTACHMENT_THRESHOLD_CHARS;
}

// The plain text a clipboard carries, or '' when it carries none.
export function readClipboardPlainText(data: DataTransfer | null): string {
  return data === null ? '' : data.getData('text/plain');
}

// The attachment a large paste becomes: "Pasted text <n>.txt", text/plain,
// UTF-8 (a Blob built from a JS string is always encoded as UTF-8).
export function buildPastedTextFile(text: string, index: number): File {
  return new File(
    [text],
    `${PASTED_TEXT_FILENAME_PREFIX}${String(index)}${PASTED_TEXT_FILE_EXTENSION}`,
    { type: PASTED_TEXT_MIME_TYPE },
  );
}
