import { DomainTag } from '../../../../generated/prisma';

/** Used only if a lookup somehow misses a mapped domain. */
export const ROUTING_LAB_DOMAIN_TOPIC_FALLBACK_SENTENCE =
  'Help with a general request in this domain.';

/**
 * One realistic seed sentence per `DomainTag`, expanded by
 * `routing-lab-prompt.utility.ts` to hit a length bucket's target character
 * count. New domain -> add one line here; the corpus generator picks it up
 * automatically.
 */
export const ROUTING_LAB_DOMAIN_TOPIC_SENTENCES: Readonly<Record<DomainTag, string>> = {
  [DomainTag.GENERAL]: 'Give me a quick overview of how this workspace is organized.',
  [DomainTag.CODING]: 'Refactor this TypeScript function so it no longer mutates its input.',
  [DomainTag.MEDICAL]: 'Summarize the differential diagnosis for this patient presentation.',
  [DomainTag.LEGAL]: 'Review this clause for GDPR data-processing compliance.',
  [DomainTag.FINANCE]: "Reconcile this quarter's ledger against the trial balance.",
  [DomainTag.MARKETING]: 'Draft three subject lines for the autumn product launch email.',
  [DomainTag.EDUCATION]: 'Explain photosynthesis at a ninth-grade reading level.',
  [DomainTag.CREATIVE_WRITING]: 'Continue this short story in the same melancholic tone.',
  [DomainTag.RESEARCH]: 'Summarize the methodology section of this paper in plain language.',
  [DomainTag.MECHANICAL]: 'Diagnose why this gearbox is whining under load at 3000 RPM.',
  [DomainTag.AUTOMOTIVE]: 'Explain the symptoms of a failing catalytic converter.',
  [DomainTag.BIOLOGY]: 'Describe the role of mitochondria in cellular respiration.',
  [DomainTag.CHEMISTRY]: 'Balance this redox reaction and identify the oxidizing agent.',
  [DomainTag.PHYSICS]: 'Derive the period of a simple pendulum from first principles.',
  [DomainTag.MULTIMEDIA]: 'Suggest a color grade for this outdoor interview footage.',
  [DomainTag.BUSINESS]: 'Outline a go-to-market plan for a mid-market SaaS product.',
  [DomainTag.HR]: 'Draft a performance-improvement plan template for a manager to fill in.',
  [DomainTag.SALES]: 'Write a follow-up email after a stalled enterprise deal.',
  [DomainTag.TRANSLATION]: 'Translate this paragraph into formal Japanese.',
  [DomainTag.MENTAL_HEALTH]: 'Suggest grounding techniques for acute workplace anxiety.',
  [DomainTag.LITERATURE]: 'Compare the unreliable narrators in these two novels.',
};
