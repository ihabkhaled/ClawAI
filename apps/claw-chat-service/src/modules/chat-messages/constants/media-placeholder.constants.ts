/**
 * Placeholders claw-file-service's `FileProcessingManager` writes into
 * `extractedText` when a file has no text of its own — the exact literals
 * `[Image file: <name>]` (no OCR text) and `[Video file: <name>]` (always,
 * until batch 6 adds frames + transcript).
 *
 * They say "this row has no text"; they are never content. A reader that hands
 * one to a model as if it were the file is the rule-42 bug in a new shape: the
 * model paraphrases our own placeholder back as if it had watched the video.
 *
 * Mirrored rather than imported, for the reason `AUDIO_TRANSCRIPTION_PLACEHOLDER_PREFIX`
 * gives in `voice-note.constants.ts`; pinned by `context-assembly-attachments.spec.ts`.
 */
export const IMAGE_FILE_PLACEHOLDER_PREFIX = '[Image file:';
export const VIDEO_FILE_PLACEHOLDER_PREFIX = '[Video file:';

export const AUDIO_MIME_PREFIX = 'audio/';
