/** Appended to the prompt of a stricter second ask, after the reason the last reply was refused. */
export const STRICT_PROMPT_NOTE =
  ' Answer with exactly one JSON object and nothing else: no code fence, no comment, no text before or after. Every "citations" entry is an object {"evidenceId","url"} copied from researchEvidence.items; cite only those ids. Keep the article shorter if you are unsure it fits. Reason the last reply was refused: ';

/** Appended when the output limit hit twice: the article is asked to be shorter, not just given room. */
export const COMPACT_OUTPUT_NOTE =
  ' Your previous reply was cut off again. Write a much shorter article (about 60 percent of the usual length), keep only the strongest points, and close the JSON object.';

/** Appended when a provider rejected the request: nothing else changes but the reply size. */
export const LOWER_LIMIT_NOTE = ' Keep the whole reply compact.';

export const SHRINK_SOURCE_NOTE =
  ' The source conversation was shortened to fit the model: older messages were cut. Rely on researchEvidence for facts.';

export const SHORT_ARTICLE_NOTE =
  'Write a short article: about 60 percent of the usual length, the strongest points only.';

export const JSON_REPAIR_SYSTEM_PROMPT =
  'You fix the format of a model reply. You are given a reply that was meant to be one JSON object and the shape it must have. Return only that JSON object, valid, with every brace closed. Do not add facts, sources or sentences that are not in the reply. Keep the original language and wording. Do not include analysis.';

export const REVIEW_REPLY_SHAPE =
  '{"score": integer 0-100, "blockers": string[], "findings": string[], "revisionBrief": string, "selectedCandidateIndex": integer 0-4}';
export const VOTE_REPLY_SHAPE = '{"agrees": boolean}';
export const AUTHOR_CANDIDATE_VOTE_REPLY_SHAPE = '{"preferredCandidateIndex": integer 0-4}';

export const JSON_REPAIR_USER_LEAD = 'Required shape and reason it was refused: ';
export const JSON_REPAIR_REPLY_LEAD = '\nReply to fix:\n';
