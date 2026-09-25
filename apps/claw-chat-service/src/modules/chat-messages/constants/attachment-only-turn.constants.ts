import { type AttachmentOnlyKind } from '../types/attachment-only-turn.types';

/**
 * What the model is told when the user sends attachments and no words.
 *
 * On 2026-09-25 a voice note sent with "." as its text got "Is there something
 * I can help you with?" from gemini-2.5-pro. The transcript WAS in the prompt,
 * framed as speech (rule 42 §12) — but it sat in the system message, and the
 * final user turn, the part a model actually answers, said ".". The model did
 * exactly what it was asked. These lines replace that empty turn, per request,
 * never in storage: the stored message stays empty and the UI shows only the
 * attachments.
 *
 * English on purpose: this is an instruction to a model, not user-facing text.
 * The reply's language is steered by `ATTACHMENT_ONLY_LANGUAGE_LINE`.
 */
export const ATTACHMENT_ONLY_TURN_MARKER = '[Attachment-only message]';

export const ATTACHMENT_ONLY_TURN_LEAD =
  'The user sent the attachment(s) listed below with no typed message. The attachment IS the message: respond to it directly — do not ask what they want, and do not reply with a generic greeting or offer of help.';

export const ATTACHMENT_ONLY_AUDIO_LINE =
  'For a voice note: respond to what the speaker said — answer their question, act on their request, or reply to their message, as if they had said it to you in person. Do not merely transcribe or summarise it unless that is what they asked for.';

/**
 * Covers both video paths: a lane that watches the video natively (Gemini),
 * and one that reads it as a timestamped transcript plus sampled frames. The
 * last sentence is for a video whose document is not ready: the context then
 * says it is still processing, and the model must say so, not invent scenes.
 */
export const ATTACHMENT_ONLY_VIDEO_LINE =
  'For a video: describe what it shows and respond to anything said or asked in it. You may receive the video itself, or its timestamped transcript and sampled frames — use whatever you were given. If its content has not reached you yet, say so plainly instead of guessing.';

/**
 * The turn when files were attached but NONE had readable content — a video
 * still being processed, a failed extraction, a file removed mid-send. The old
 * empty turn got a generic greeting, or a provider's "empty message" refusal,
 * which the user saw as silence.
 */
export const ATTACHMENT_ONLY_UNREADABLE_INSTRUCTION = [
  ATTACHMENT_ONLY_TURN_MARKER,
  'The user sent attachment(s) with no typed message, but none of them could be read yet (still processing, or the extraction failed).',
  'Tell the user plainly that you could not open the attachment yet, and ask them to try again in a moment or to say what they need from it. Do not reply with a generic greeting, and do not guess its contents.',
].join('\n');

export const ATTACHMENT_ONLY_IMAGE_LINE =
  'For an image: describe what it shows and respond to any question, text or task visible in it.';

export const ATTACHMENT_ONLY_DOCUMENT_LINE =
  'For a document: summarize its key points, then offer two or three concrete next steps you could help with.';

export const ATTACHMENT_ONLY_LANGUAGE_LINE =
  'Reply in the language the attachment is spoken or written in.';

/**
 * What routing-service scores for an attachment-only send.
 *
 * routing-service drops a `message.created` whose `content` is empty — the
 * turn would never be routed and the UI would wait forever. The stored row
 * stays empty; only the event carries this line.
 */
export const ATTACHMENT_ONLY_ROUTING_HINT = 'Respond to the attached file(s).';

/** Whitespace, punctuation and nothing else — "." and "?" carry no request. */
export const TRIVIAL_USER_TEXT_PATTERN = /^[\s\p{P}]*$/u;

/** The order the per-kind lines appear in, so the instruction is stable. */
export const ATTACHMENT_ONLY_KIND_ORDER: readonly AttachmentOnlyKind[] = [
  'audio',
  'video',
  'image',
  'document',
];

export const ATTACHMENT_ONLY_KIND_LINES: ReadonlyMap<AttachmentOnlyKind, string> = new Map([
  ['audio', ATTACHMENT_ONLY_AUDIO_LINE],
  ['video', ATTACHMENT_ONLY_VIDEO_LINE],
  ['image', ATTACHMENT_ONLY_IMAGE_LINE],
  ['document', ATTACHMENT_ONLY_DOCUMENT_LINE],
]);

/** MIME prefix → kind. Anything that matches none of these is a document. */
export const ATTACHMENT_ONLY_MIME_PREFIX_KINDS: ReadonlyArray<
  readonly [string, AttachmentOnlyKind]
> = [
  ['audio/', 'audio'],
  ['video/', 'video'],
  ['image/', 'image'],
];
