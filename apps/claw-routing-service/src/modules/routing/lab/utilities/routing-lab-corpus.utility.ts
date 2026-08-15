import { RoutingLabCaseCategory, RoutingLabConfigurationVariant } from '../../../../common/enums';
import { recordGet } from '../../../../common/utilities';
import type { RoutingLabCase } from '../types/routing-lab-corpus.types';
import {
  ROUTING_LAB_DOMAINS,
  ROUTING_LAB_ELIGIBLE_DEPLOYMENT_IDS_BY_PRIVACY_CLASS,
  ROUTING_LAB_EXPECTED_CORPUS_SIZE,
  ROUTING_LAB_LENGTH_BUCKETS,
  ROUTING_LAB_PRIVACY_CLASSES,
} from '../constants/routing-lab-corpus-dimensions.constants';
import { ROUTING_LAB_EDGE_CASES } from '../constants/routing-lab-edge-cases.constants';
import { ROUTING_LAB_FAULT_COMPOUND_CASES } from '../constants/routing-lab-fault-compound-cases.constants';
import { buildRoutingLabFaultSingleCases } from './routing-lab-fault-single-cases.utility';
import { buildRoutingLabPrompt } from './routing-lab-prompt.utility';

/**
 * The 4 privacy classes x 21 domains x 3 length buckets baseline: realistic,
 * unfaulted traffic. Adding one domain to `DomainTag` or one bucket to
 * `RoutingLabPromptLengthBucket` grows this automatically — nobody has to
 * remember to add cases by hand.
 */
function buildRoutingLabBaselineCases(): readonly RoutingLabCase[] {
  const cases: RoutingLabCase[] = [];
  let sequence = 0;

  for (const privacyClass of ROUTING_LAB_PRIVACY_CLASSES) {
    for (const domain of ROUTING_LAB_DOMAINS) {
      for (const lengthBucket of ROUTING_LAB_LENGTH_BUCKETS) {
        sequence += 1;
        cases.push({
          id: `case-baseline-${String(sequence).padStart(3, '0')}`,
          category: RoutingLabCaseCategory.BASELINE,
          description: `${privacyClass} / ${domain} / ${lengthBucket} traffic, no injected fault.`,
          configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
          privacyClass,
          domain,
          lengthBucket,
          prompt: buildRoutingLabPrompt(domain, lengthBucket),
          eligibleDeploymentIds:
            recordGet(
              ROUTING_LAB_ELIGIBLE_DEPLOYMENT_IDS_BY_PRIVACY_CLASS as Readonly<
                Record<string, readonly string[]>
              >,
              privacyClass,
            ) ?? [],
          faultPlan: {},
        });
      }
    }
  }

  return cases;
}

function assertWellFormedCorpus(corpus: readonly RoutingLabCase[]): void {
  if (corpus.length !== ROUTING_LAB_EXPECTED_CORPUS_SIZE) {
    throw new Error(
      `buildRoutingLabCorpus: expected ${String(ROUTING_LAB_EXPECTED_CORPUS_SIZE)} cases, built ${String(corpus.length)}`,
    );
  }

  const seenIds = new Set<string>();
  for (const labCase of corpus) {
    if (seenIds.has(labCase.id)) {
      throw new Error(`buildRoutingLabCorpus: duplicate case id "${labCase.id}"`);
    }
    seenIds.add(labCase.id);
  }
}

/**
 * Builds the full routing lab corpus: baseline combinatorial traffic, one
 * case per `RouterErrorCode`, a curated set of multi-attempt behaviours, and
 * structural/config edge cases — see the constant and utility each category
 * is built from for its own rationale.
 *
 * Throws rather than silently returning a short or colliding corpus: a
 * manifest built on fewer cases than it claims would under-report coverage
 * without ever failing a test.
 */
export function buildRoutingLabCorpus(): readonly RoutingLabCase[] {
  const corpus: readonly RoutingLabCase[] = [
    ...buildRoutingLabBaselineCases(),
    ...buildRoutingLabFaultSingleCases(),
    ...ROUTING_LAB_FAULT_COMPOUND_CASES,
    ...ROUTING_LAB_EDGE_CASES,
  ];

  assertWellFormedCorpus(corpus);

  return corpus;
}
