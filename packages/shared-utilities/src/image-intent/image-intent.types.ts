/**
 * Which generation signals fired for a message. `matched` is true when at
 * least one did; the rest explain which, so a caller can log it. Same shape
 * routing-service's `ImageDetectionResult` always had.
 */
export type ImageGenerationSignals = {
  matched: boolean;
  exactKeyword: boolean;
  verbPlusImageWord: boolean;
  strongImageNoun: boolean;
  artStyle: boolean;
  reference: boolean;
};
