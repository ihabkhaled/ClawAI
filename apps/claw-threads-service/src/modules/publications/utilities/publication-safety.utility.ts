import {
  PUBLICATION_PII_PATTERNS,
  PUBLICATION_SECRET_PATTERNS,
} from '../constants/publication-safety.constants';
import type { PublicationSafetyResult } from '../types/publication-safety.types';

export function evaluatePublicationSafety(content: string): PublicationSafetyResult {
  const reasons: PublicationSafetyResult['reasons'] = [];
  if (PUBLICATION_SECRET_PATTERNS.some((pattern) => pattern.test(content))) {
    reasons.push('POSSIBLE_SECRET');
  }
  if (PUBLICATION_PII_PATTERNS.some((pattern) => pattern.test(content))) {
    reasons.push('POSSIBLE_PII');
  }
  return { approved: reasons.length === 0, reasons };
}
