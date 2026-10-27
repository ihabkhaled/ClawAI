/** One-click ways out of a failed Thread generation the owner's panel can offer (ADR-181). */
export enum ThreadFailureRemedy {
  TRY_AGAIN = 'TRY_AGAIN',
  TRY_SUGGESTED_MODEL = 'TRY_SUGGESTED_MODEL',
  CHOOSE_ANOTHER_MODEL = 'CHOOSE_ANOTHER_MODEL',
  USE_RECOMMENDED_TEAM = 'USE_RECOMMENDED_TEAM',
  SHORTER_ARTICLE = 'SHORTER_ARTICLE',
  RAISE_SPEND_CAP = 'RAISE_SPEND_CAP',
  ADD_CREDIT = 'ADD_CREDIT',
  CHANGE_TOPIC = 'CHANGE_TOPIC',
  /** Retry with a fresh research pass instead of the saved one. */
  RESEARCH_MORE = 'RESEARCH_MORE',
  /** Retry with a topic that no longer demands the missing sources. */
  NARROW_CLAIMS = 'NARROW_CLAIMS',
  /** Retry with the owner's named evidence gaps accepted and disclosed in the article (ADR-194). */
  ACCEPT_GAPS = 'ACCEPT_GAPS',
}
