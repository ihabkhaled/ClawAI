import { DOMAIN_KEYWORDS, DOMAIN_PRIORITY } from '../constants/domain-keywords.constants';
import { type DomainScore } from '../types/classification.types';

export function scoreMessageByDomain(messageLower: string): DomainScore[] {
  const scores: DomainScore[] = [];
  for (const entry of DOMAIN_KEYWORDS) {
    const matched: string[] = [];
    for (const keyword of entry.keywords) {
      if (messageLower.includes(keyword)) {
        matched.push(keyword);
      }
    }
    if (matched.length > 0) {
      scores.push({ domain: entry.domain, hits: matched.length, matchedKeywords: matched });
    }
  }
  scores.sort((a, b) => {
    if (a.hits !== b.hits) return b.hits - a.hits;
    return DOMAIN_PRIORITY[b.domain] - DOMAIN_PRIORITY[a.domain];
  });
  return scores;
}
