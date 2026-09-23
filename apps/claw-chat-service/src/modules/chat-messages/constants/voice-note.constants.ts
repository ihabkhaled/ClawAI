/**
 * Framing for a voice note's transcript when it reaches the model.
 *
 * A transcript handed to the model with no signal beyond "ATTACHED FILE" or
 * "the user has attached file X" reads as an ordinary document, not as
 * something the user said out loud. The model has no reason to treat "I need
 * this by Friday, thanks" as a spoken message rather than a typed one, and
 * nothing tells it the words came from a recording it cannot itself hear.
 * This frame makes that explicit — matching the house pattern in
 * `judge-referee.constants.ts#REVIEW_ORIGINAL_INSTRUCTIONS_FRAME`, where
 * untrusted or differently-sourced content gets one line of context before it,
 * not silence.
 */
export const VOICE_NOTE_TRANSCRIPT_FRAME =
  'The user sent this as a voice note, not typed text. What follows is its transcription — answer as if you heard them say it.';

/**
 * Prefix of the placeholder claw-file-service's `FileProcessingManager`
 * writes for a freshly-uploaded audio row, before transcription has run — the
 * exact same literal as `AUDIO_PLACEHOLDER_PREFIX` in
 * `apps/claw-file-service/src/modules/files/constants/transcription.constants.ts`.
 *
 * Not imported from a shared package on purpose: touching `@claw/shared-constants`
 * marks every one of the 18 services "affected" by the pre-commit gate, which
 * then needs a generated Prisma client for services this change has nothing to
 * do with. A one-line string literal is not worth that. Each copy is pinned by
 * a test (`context-assembly-attachments.spec.ts` here,
 * `transcription.manager.spec.ts` in claw-file-service), so a future rename on
 * one side breaks a test instead of silently drifting.
 */
export const AUDIO_TRANSCRIPTION_PLACEHOLDER_PREFIX = '[Audio file: ';
