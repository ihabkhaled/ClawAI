import type { RoutingLabPromptLengthBucket } from '../../../../common/enums';
import { recordGet } from '../../../../common/utilities';
import type { DomainTag } from '../../../../generated/prisma';
import {
  ROUTING_LAB_LENGTH_BUCKET_TARGET_CHARS,
  ROUTING_LAB_LENGTH_TARGET_FALLBACK_CHARS,
} from '../constants/routing-lab-corpus-dimensions.constants';
import {
  ROUTING_LAB_DOMAIN_TOPIC_FALLBACK_SENTENCE,
  ROUTING_LAB_DOMAIN_TOPIC_SENTENCES,
} from '../constants/routing-lab-domain-topics.constants';

/**
 * Deterministically expands one domain's seed sentence out to a length
 * bucket's target character count. No randomness: the same (domain, bucket)
 * pair always produces the same prompt, so a case that fails is reproducible
 * from its id alone rather than from a stored fixture blob.
 */
export function buildRoutingLabPrompt(
  domain: DomainTag,
  lengthBucket: RoutingLabPromptLengthBucket,
): string {
  const seed =
    recordGet(ROUTING_LAB_DOMAIN_TOPIC_SENTENCES as Readonly<Record<string, string>>, domain) ??
    ROUTING_LAB_DOMAIN_TOPIC_FALLBACK_SENTENCE;
  const targetChars =
    recordGet(
      ROUTING_LAB_LENGTH_BUCKET_TARGET_CHARS as Readonly<Record<string, number>>,
      lengthBucket,
    ) ?? ROUTING_LAB_LENGTH_TARGET_FALLBACK_CHARS;

  let prompt = seed;
  let iteration = 1;
  while (prompt.length < targetChars) {
    prompt += ` Additional context ${String(iteration)}: honor prior conventions and the user's stated constraints before answering.`;
    iteration += 1;
  }

  return prompt.slice(0, targetChars);
}
