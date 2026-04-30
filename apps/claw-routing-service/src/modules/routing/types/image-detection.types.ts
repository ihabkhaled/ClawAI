/**
 * Result of classifying a user message as an image-generation request.
 *
 * `matched` is true when at least one of the detection signals fires.
 * The remaining fields explain WHICH signal matched, so callers can log
 * or render an explanation alongside the routing decision.
 */
export type ImageDetectionResult = {
  matched: boolean;
  exactKeyword: boolean;
  verbPlusImageWord: boolean;
  strongImageNoun: boolean;
  artStyle: boolean;
  reference: boolean;
};
