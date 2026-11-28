/** Joins the research counters after a work-log line: "Searched with Brave: 6 sources read · 4 queries". */
export const NARRATION_COUNTER_SEPARATOR = ' · ';

/** A `round` from this value up is a follow-up research round; round 1 (or none) reads as the plain line. */
export const NARRATION_FIRST_FOLLOW_UP_ROUND = 2;

/** i18n bases of the counted phrases; `pluralText` appends the plural form (`.one`, `.few`, `.other`, ...). */
export const NARRATION_COUNT_KEYS = {
  queries: 'narration.count.queries',
  moreQueries: 'narration.count.moreQueries',
  newQueries: 'narration.count.newQueries',
  languages: 'narration.count.languages',
  duplicatesRemoved: 'narration.count.duplicatesRemoved',
  reusedFromThread: 'narration.count.reusedFromThread',
} as const;
