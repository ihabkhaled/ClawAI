export const IMAGE_GENERATION_PROMPT_MAX_CHARACTERS = 4_000;
/**
 * How a reference-image prompt is built (pack §79 — no silent rewriting).
 * The user's own instruction always leads, VERBATIM; the vision model's
 * description of the attachment follows only as context. The old prompt
 * replaced the user's words with the description under a "closely matches the
 * reference" header, which turned "remove the background" into "draw this
 * again".
 */
export const IMAGE_REFERENCE_INSTRUCTION_PREFIX =
  'Edit the attached reference image. Follow this instruction exactly and keep everything it does not mention unchanged: ';
export const IMAGE_REFERENCE_DESCRIPTION_PREFIX =
  'Description of the attached image, for context: ';
