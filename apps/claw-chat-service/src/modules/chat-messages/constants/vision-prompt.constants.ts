/**
 * The Gemini deployment that reads an attached image before image generation.
 *
 * A fast, cheap vision model on purpose: this hop only has to describe a
 * picture well enough for an image generator to work from, and it is billed to
 * the user's pay-as-you-go credit like any other paid call.
 */
export const VISION_PROMPT_MODEL = 'gemini-2.5-flash';
