export const THREAD_PUBLICATION_OPTIONS = [
  { value: 'article', translationKey: 'threadTypeArticle' },
  { value: 'research-article', translationKey: 'threadTypeResearchArticle' },
  { value: 'guide', translationKey: 'threadTypeGuide' },
  { value: 'technical-explanation', translationKey: 'threadTypeTechnicalExplanation' },
] as const;

export type ThreadPublicationType = (typeof THREAD_PUBLICATION_OPTIONS)[number]['value'];
