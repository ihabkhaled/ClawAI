// Signals used by detectFollowUp. Tuned for English + Arabic prompts —
// extend FOLLOW_UP_VERB_SIGNALS / FOLLOW_UP_REGEX_SIGNALS for new
// languages without touching the utility. Weights are intentionally
// small individually so multiple weak signals add up to "yes" without
// any single false-positive dominating.
//
// See docs/03-architecture/semantic-router-flagship-plan.md §4.6 for
// the curated list of follow-up phrases from the flagship prompt.

export type FollowUpRegexSignal = {
  name: string;
  regex: RegExp;
  weight: number;
};

export const FOLLOW_UP_VERB_SIGNALS: readonly string[] = [
  'continue',
  'more',
  'go on',
  'keep going',
  'next',
  'regenerate',
  'again',
  'retry',
  'shorter',
  'longer',
  'simpler',
  'expand',
  'elaborate',
];

export const FOLLOW_UP_PRONOUN_SIGNALS: readonly string[] = [
  'it',
  'this',
  'that',
  'them',
  'these',
  'those',
];

export const FOLLOW_UP_SHORT_REPLY_MAX_WORDS = 6;

export const FOLLOW_UP_REGEX_SIGNALS: readonly FollowUpRegexSignal[] = [
  // "make it shorter / longer / professional / simpler / friendlier / formal"
  { name: 'make_it_x', regex: /\bmake\s+(it|this|that|them)\b/, weight: 0.7 },
  // "rewrite it", "rewrite the second one"
  { name: 'rewrite', regex: /\brewrite\b/, weight: 0.7 },
  // "translate it to X" / "in arabic" / "to french" / "بالعربي"
  { name: 'translate', regex: /\btranslate\b/, weight: 0.7 },
  { name: 'in_language', regex: /\b(in|to)\s+(arabic|french|spanish|german|chinese|japanese|hindi|english|italian|portuguese|russian|egyptian|fusha)\b/, weight: 0.6 },
  { name: 'arabic_followup', regex: /(بالعربي|عربي|اعمله|اختصر|اطول)/, weight: 0.7 },
  // "do the same", "same for this", "do it again"
  { name: 'do_same', regex: /\b(do|use)\s+(the\s+)?same\b/, weight: 0.7 },
  // "do the second one", "the third option", "fix the first"
  { name: 'positional_ref', regex: /\b(first|second|third|fourth|fifth|last|previous|other)\s+(one|option|item|result|answer|response)\b/, weight: 0.6 },
  // "add more details", "add tests", "add a section"
  { name: 'add_more', regex: /\badd\s+(more|another|a|some|tests?|examples?|notes?|sections?|points?)\b/, weight: 0.6 },
  // "fix it", "fix the bug", "fix the second"
  { name: 'fix_it', regex: /\bfix\s+(it|this|that|them|the\s+)/, weight: 0.7 },
  // "what about this", "what about the", "and this one"
  { name: 'what_about', regex: /\b(what about|how about|and\s+(this|that))\b/, weight: 0.6 },
  // "explain more", "explain it"
  { name: 'explain_more', regex: /\bexplain\s+(more|it|further|that|this)\b/, weight: 0.6 },
  // "convert it to / convert this to"
  { name: 'convert', regex: /\bconvert\s+(it|this|that|the)\b/, weight: 0.6 },
  // "use the same format / structure / style"
  { name: 'same_format', regex: /\b(use|keep|with)\s+the\s+same\s+(format|structure|style|tone|approach)\b/, weight: 0.7 },
  // "compare them", "judge it", "approve it"
  { name: 'compare_them', regex: /\b(compare|judge|approve)\s+(them|it|this|that)\b/, weight: 0.7 },
];
