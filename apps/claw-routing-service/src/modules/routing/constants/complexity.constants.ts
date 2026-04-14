// ─── Word-count thresholds ────────────────────────────────────────────────────
// Score = min(wordCount / COMPLEXITY_WORD_COUNT_SCALE, 1.0)
export const COMPLEXITY_WORD_COUNT_SCALE = 400;

// ─── Score thresholds for class boundaries ───────────────────────────────────
export const COMPLEXITY_THRESHOLD_SIMPLE = 0.04; // < ~16 words, no boosters
export const COMPLEXITY_THRESHOLD_MEDIUM = 0.2; // < ~80 words, no boosters
export const COMPLEXITY_THRESHOLD_COMPLEX = 0.6; // < ~240 words, or boosted

// ─── Score boosts ────────────────────────────────────────────────────────────
export const COMPLEXITY_MULTI_STEP_BOOST = 0.2;
export const COMPLEXITY_EXPERT_DOMAIN_BOOST = 0.15;
export const COMPLEXITY_CONTEXT_REFERENCE_BOOST = 0.1;

// ─── Multi-step pattern indicators ───────────────────────────────────────────
export const COMPLEXITY_MULTI_STEP_PATTERNS: string[] = [
  'step 1',
  'step 2',
  'step 3',
  'first, then',
  'first and then',
  'and then',
  'after that',
  'followed by',
  'in addition to',
  'furthermore',
  'additionally',
  'also make sure',
  'multiple steps',
  'several steps',
  'following steps',
  'can you also',
  'as well as',
  'once you finish',
  'when done',
  'afterwards',
];

// ─── Expert-domain indicators ─────────────────────────────────────────────────
export const COMPLEXITY_EXPERT_INDICATORS: string[] = [
  'architecture',
  'design pattern',
  'system design',
  'trade-offs',
  'trade offs',
  'performance optimization',
  'security audit',
  'code review',
  'refactor',
  'microservice',
  'distributed system',
  'algorithm complexity',
  'time complexity',
  'space complexity',
  'big o',
  'scalability',
  'high availability',
  'fault tolerance',
  'load balancing',
  'caching strategy',
  'database schema',
  'data model',
  'api design',
  'concurrency',
  'race condition',
  'deadlock',
  'consensus',
  'event sourcing',
  'cqrs',
  'domain driven',
  'hexagonal architecture',
  'dependency injection',
];

// ─── Context-reference indicators (implies prior context needed) ──────────────
export const COMPLEXITY_CONTEXT_REFERENCE_PATTERNS: string[] = [
  'as mentioned',
  'as discussed',
  'based on the above',
  'given the above',
  'from the context',
  'using the code above',
  'in the snippet above',
  'the previous',
  'what we discussed',
  'that we built',
  'our existing',
  'the function above',
  'in the class above',
  'continuing from',
];
