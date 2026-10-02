/**
 * Attachment awareness (ADR-152): an attachment is read whatever the user
 * typed. Nothing here is keyed on the user's words; every line is an
 * instruction to a model, in English on purpose, and the reply language
 * follows the user.
 */

/** Earlier turns' files kept in a follow-up's context, newest first. */
export const EARLIER_ATTACHMENTS_MAX_FILES = 3;

/** One earlier file's text is cut to this many characters (the current turn's files keep the full per-file limit). */
export const EARLIER_ATTACHMENT_TEXT_MAX_CHARS = 6_000;

/** Appended to a cut earlier file. */
export const EARLIER_ATTACHMENT_TRUNCATION_NOTE =
  '\n\n[...earlier attachment shortened to keep room for the conversation...]';

/** Names the earlier attachments in the block header. */
export const EARLIER_ATTACHMENT_HEADER_SUFFIX = ' — attached earlier in this conversation';

/**
 * Descriptions the vision helper already wrote are reused across turns, so a
 * follow-up does not pay for the same image again. Per replica, in memory.
 */
export const DERIVED_DESCRIPTION_TTL_MS = 6 * 60 * 60_000;
export const DERIVED_DESCRIPTION_MAX_ENTRIES = 500;

/** The pointer on the final user turn: current attachments, whatever was typed. */
export const ATTACHMENT_POINTER_LEAD =
  'The user attached the file(s) below to this message. Their content is already in this conversation. Read and use it to answer, even though the user did not say "look at the file" — attaching it is the request for you to read it.';

/** Blind lane with a helper description: the explicit instruction. {COUNT} is replaced. */
export const ATTACHMENT_POINTER_DESCRIBED_IMAGES =
  'The user attached {COUNT} image(s). You cannot see pixels, but a vision assistant described them in the derived observations of this conversation. Answer the user from that description. Never tell the user you cannot view images, and never ask them to describe an image, unless the description itself says it was unreadable.';

/** Blind lane, no description (helper off, refused or failed). {COUNT} is replaced. */
export const ATTACHMENT_POINTER_UNDESCRIBED_IMAGES =
  '{COUNT} attached image(s) could not be viewed or described this turn (see the note beside each one). Say that plainly to the user, with the reason in the note, and use any text extracted from the image. Do not guess what it shows.';

/** Files requested but not delivered at all. {COUNT} is replaced. */
export const ATTACHMENT_POINTER_UNREADABLE =
  '{COUNT} attached file(s) could not be opened this turn (still processing, or the extraction failed). Tell the user so plainly, in the language they wrote in, and do not guess at their content.';

/**
 * A non-image file (a scanned PDF) whose extraction produced only the image
 * placeholder: there is no text to read. {NAME} is replaced.
 */
export const UNREADABLE_DOCUMENT_NOTE =
  '[File "{NAME}" is a scanned or image-only document and no text could be extracted from it. Tell the user this plainly, in the language they wrote in, and suggest sending the pages as images or a text-based version. Do not guess at its contents.]';

/** Earlier files riding along on a follow-up. */
export const ATTACHMENT_POINTER_EARLIER =
  'Files attached earlier in this conversation are also provided; use them when the question refers to them.';

/** Delimits the pointer on the user turn, so the stored text and the pointer stay separable. */
export const ATTACHMENT_POINTER_MARKER = '[Attachments]';

/** Longest filename shown in the planner manifest. */
export const PLANNER_MANIFEST_NAME_MAX_CHARS = 80;

/** One manifest line for an image the helper has not described yet. */
export const PLANNER_MANIFEST_IMAGE_PENDING =
  'image — the answering AI will see it or receive a vision assistant description of it';

/** One manifest line for a file whose text is not ready. */
export const PLANNER_MANIFEST_NO_TEXT_YET = 'content is read by the answering AI';

/**
 * Planner "thinking" that says the AI cannot view the attachments. With
 * attachments present that is never true of the answering step, so the
 * sentence is dropped rather than shown as the assistant's reasoning.
 */
export const CANNOT_VIEW_ATTACHMENT_PATTERN =
  /\b(?:cannot|can't|can not|unable to|not able to|don't have (?:the )?(?:ability|access)|do not have (?:the )?(?:ability|access))\b[^.!?\n]{0,60}\b(?:view|see|open|read|access|look at|analy[sz]e|process)\b[^.!?\n]{0,60}\b(?:image|images|screenshot|screenshots|picture|photo|file|files|attachment|attachments|pdf|document)\b/iu;
