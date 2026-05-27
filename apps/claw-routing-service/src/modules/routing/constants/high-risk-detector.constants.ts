// HighRiskDetector — Phase 7 of the semantic router flagship.
// Word-list used to auto-trigger the judge when
// ROUTING_JUDGE_HIGH_RISK_ENABLED=true and the message contains any
// keyword from a regulated / high-stakes domain.
//
// Conservative on purpose: false positives cost a judge round-trip
// (~5-10s extra), false negatives let an unreviewed response leave the
// system. We err toward over-triggering.

export const HIGH_RISK_DOMAIN_KEYWORDS = [
  // Legal
  'lawsuit',
  'litigation',
  'subpoena',
  'cease and desist',
  'breach of contract',
  'patent infringement',
  'copyright',
  'trademark',
  'gdpr',
  'hipaa',
  'compliance',
  'regulatory',
  'legal advice',
  'legal opinion',
  'liability',
  'indemnify',
  'indemnification',
  'arbitration',
  'tort',
  'plaintiff',
  'defendant',
  // Medical
  'diagnose',
  'diagnosis',
  'prescribe',
  'prescription',
  'medication',
  'dosage',
  'mg/kg',
  'mg per kg',
  'symptoms',
  'medical advice',
  'clinical',
  'treatment plan',
  'contraindication',
  'side effect',
  'allergy',
  'icd-10',
  'icd 10',
  'mri',
  'biopsy',
  'oncology',
  // Finance
  'tax filing',
  'tax return',
  'irs',
  'audit',
  'sec filing',
  'sec disclosure',
  '10-k',
  '10-q',
  'investment advice',
  'portfolio rebalance',
  'short sell',
  'derivative',
  'hedge fund',
  'margin call',
  'liquidation',
  'insider trading',
  'kyc',
  'aml',
  'anti-money laundering',
  // Security / infra critical
  'drop database',
  'drop table',
  'truncate table',
  'rm -rf',
  'production deploy',
  'prod deploy',
  'prod migration',
  'production migration',
  'rotate secret',
  'rotate credential',
  'master key',
  'root password',
  'sudo rm',
  'force push',
  'reset --hard',
];

// Risk levels straight from SemanticIntentAnalysis. When the analyzer is
// enabled and reports one of these, the judge auto-fires regardless of
// keyword match.
export const HIGH_RISK_ANALYZER_LEVELS = new Set<string>(['HIGH', 'CRITICAL']);

// Pre-compiled regex per keyword. Word-boundary so "drop" alone doesn't
// match "dropdown" but "drop database" matches as a phrase. Built once
// at module load; the detector utility reads from this list.
const escapeRegexForKeyword = (input: string): string =>
  input.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

export const HIGH_RISK_KEYWORD_PATTERNS: ReadonlyArray<{ keyword: string; pattern: RegExp }> =
  HIGH_RISK_DOMAIN_KEYWORDS.map((k) => ({
    keyword: k,
    pattern: new RegExp(String.raw`\b${escapeRegexForKeyword(k)}\b`, 'i'),
  }));
