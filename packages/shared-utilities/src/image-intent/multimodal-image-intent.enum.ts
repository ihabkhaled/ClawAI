/**
 * What a user message asks of the image pipeline (pack §10/§81/§88).
 *
 * - GENERATE — a new picture from text; no image attached ("draw a cat").
 * - EDIT     — change or re-make an ATTACHED image ("remove the background",
 *              "make it blue", "add a hat", "something like this"). Executed
 *              as image generation with the attachment as the REFERENCE.
 * - ANALYZE  — a question about an attached image ("what is this?"). Vision
 *              Q&A in chat; never an image job.
 * - NONE     — no image involved ("describe how an image generator works").
 */
export enum MultimodalImageIntent {
  GENERATE = 'GENERATE',
  EDIT = 'EDIT',
  ANALYZE = 'ANALYZE',
  NONE = 'NONE',
}
