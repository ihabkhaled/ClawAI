import {
  TRANSCRIBE_READ_AMBIGUOUS_EXTENSION,
  TRANSCRIBE_READ_AUDIO_MIME_BY_EXTENSION,
  TRANSCRIBE_READ_GENERIC_MIME,
  TRANSCRIBE_READ_MAX_TEXT_CHARS,
  TRANSCRIBE_READ_MIME_PREFIXES,
  TRANSCRIBE_READ_TRUNCATION_NOTE,
  TRANSCRIBE_READ_VIDEO_EXTENSIONS,
} from '../constants/transcribe-read.constants';
import { type TranscribeReadClassification } from '../types/transcribe-read.types';

/** Lower-case extension without the dot, or '' when there is none. */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/**
 * Audio or video, from the extension (the trusted signal) and the optional mime
 * type (only to settle `.webm`, and to refuse an obviously wrong type). Null =
 * unsupported. The client's mime type is never forwarded to a provider.
 */
export function classifyReadMedia(
  fileName: string,
  mimeType?: string,
): TranscribeReadClassification | null {
  const mime = mimeType?.toLowerCase().split(';')[0]?.trim();
  if (
    mime !== undefined &&
    mime !== TRANSCRIBE_READ_GENERIC_MIME &&
    !TRANSCRIBE_READ_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))
  ) {
    return null;
  }
  const extension = fileExtension(fileName);
  const audioMime = new Map(Object.entries(TRANSCRIBE_READ_AUDIO_MIME_BY_EXTENSION)).get(extension);
  if (audioMime === undefined && !TRANSCRIBE_READ_VIDEO_EXTENSIONS.includes(extension)) {
    return null;
  }
  const audioHint = mime?.startsWith('audio/') === true;
  return audioMime !== undefined && (extension !== TRANSCRIBE_READ_AMBIGUOUS_EXTENSION || audioHint)
    ? { kind: 'audio', mimeType: audioMime }
    : { kind: 'video', mimeType: '' };
}

/** Cuts a transcript at the character limit; `truncated` says whether it did. */
export function boundReadText(text: string): { text: string; truncated: boolean } {
  return text.length <= TRANSCRIBE_READ_MAX_TEXT_CHARS
    ? { text, truncated: false }
    : {
        text: text.slice(0, TRANSCRIBE_READ_MAX_TEXT_CHARS) + TRANSCRIBE_READ_TRUNCATION_NOTE,
        truncated: true,
      };
}
