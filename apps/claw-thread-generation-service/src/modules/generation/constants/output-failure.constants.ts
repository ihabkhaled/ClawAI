import { ModelOutputFailureKind } from '../../../common/enums/model-output-failure-kind.enum';

export const OUTPUT_HEAD_CHARS = 160;
export const OUTPUT_TAIL_CHARS = 120;
export const OUTPUT_ISSUE_PATHS_MAX = 5;
export const OUTPUT_ROOT_PATH = '(root)';
export const OUTPUT_CUSTOM_ISSUE_TEXT =
  'a content rule (for example a citation outside the evidence list)';

/** Owner-facing reason per failure kind. Plain words; the machine code stays OUTPUT_INVALID. */
export const OUTPUT_FAILURE_REASONS: ReadonlyMap<ModelOutputFailureKind, string> = new Map([
  [ModelOutputFailureKind.EMPTY, 'The model returned nothing'],
  [ModelOutputFailureKind.TRUNCATED, 'The reply was cut off before the JSON object ended'],
  [ModelOutputFailureKind.PROSE, 'The reply was plain text with no JSON object'],
  [ModelOutputFailureKind.INVALID_JSON, 'The reply held braces but not valid JSON'],
  [ModelOutputFailureKind.WRONG_SHAPE, 'The JSON did not have the requested fields'],
]);

export const CANDIDATE_SUMMARY_LEAD = 'Every model failed.';
