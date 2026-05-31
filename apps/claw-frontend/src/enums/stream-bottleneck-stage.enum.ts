// Mirrors the BE `StreamBottleneck.stage` literal union. Identifies the
// slowest local-runtime stage on the terminal METRICS frame: model loading,
// prompt evaluation, or token generation. String values match the BE
// serialization verbatim so JSON payloads deserialize without remapping.
export enum StreamBottleneckStage {
  MODEL_LOAD = 'modelLoad',
  PROMPT_EVAL = 'promptEval',
  GENERATION = 'generation',
}
