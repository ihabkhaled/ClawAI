// Deterministic conversational-context scenarios.
//
// Every probe carries a machine-checkable expectation, so a run is scored
// without a judge model (a judge would itself be a metered call, and would
// blur "the context system failed" with "the judge disagreed").
//
// Turn kinds:
//   seed   — plants a fact. Not scored.
//   filler — topical noise that pushes distance. Not scored.
//   probe  — scored. `expect` must appear; `forbid` must not.

const FILLER_TOPICS = [
  'Explain in two sentences what a bloom filter is.',
  'In two sentences, what is the difference between a mutex and a semaphore?',
  'Name two common causes of TCP head-of-line blocking. One line each.',
  'In two sentences, what does the CAP theorem actually claim?',
  'Give one sentence on why DNS TTL matters for failover.',
  'In two sentences, explain copy-on-write.',
  'What is a Merkle tree used for? Two sentences.',
  'Explain leap seconds in two sentences.',
  'What is the thundering herd problem? Two sentences.',
  'In two sentences, what is backpressure in stream processing?',
  'Explain the difference between latency and jitter. Two sentences.',
  'What does a write-ahead log buy you? Two sentences.',
  'In two sentences, what is cache line false sharing?',
  'Explain quorum reads in two sentences.',
  'What is tail latency amplification? Two sentences.',
  'In two sentences, what does vectorized execution mean in a database?',
  'Explain the difference between a coroutine and a thread. Two sentences.',
  'What is the birthday paradox, in two sentences?',
  'In two sentences, what is an LSM tree?',
  'Explain consistent hashing in two sentences.',
  'What is a circuit breaker in distributed systems? Two sentences.',
  'In two sentences, what is the difference between TLS 1.2 and 1.3 handshakes?',
  'Explain what a sidecar proxy does, in two sentences.',
  'What is exponential backoff with jitter? Two sentences.',
  'In two sentences, what is a bitemporal table?',
];

function filler(index) {
  return { kind: 'filler', content: FILLER_TOPICS[index % FILLER_TOPICS.length] };
}

/**
 * The flagship scenario. One 60-turn thread that measures twelve things at
 * once: recall at four distances, latest-value precedence, assistant-response
 * recall, coreference resolution, constraint fidelity and final synthesis.
 */
export function contextGauntlet() {
  const turns = [];
  const push = (t) => turns.push(t);

  push({ kind: 'seed', content: 'The project codename is ORCHID-731. Acknowledge in one short sentence.' });
  push({ kind: 'seed', content: 'The backend must be written in TypeScript. Acknowledge in one short sentence.' });
  push({ kind: 'seed', content: 'We must never expose sequential database IDs in any public API. Acknowledge briefly.' });
  push({ kind: 'seed', content: 'We will use PostgreSQL as the primary database. Acknowledge briefly.' });

  push({
    kind: 'probe',
    id: 'recall_d4_codename',
    metric: 'same_thread_recall',
    distance: 4,
    content: 'What is the project codename? Reply with the codename only.',
    expect: [/ORCHID[- ]?731/i],
  });

  for (let i = 0; i < 8; i += 1) push(filler(i));

  push({
    kind: 'seed',
    content:
      'Give me exactly three message-queue architecture options. Name them exactly Alpha, Beta and Gamma. One line each, nothing else.',
  });
  push({
    kind: 'seed',
    content:
      'Choose the single most reliable of those three and state its name on the first line, then one sentence of justification.',
    captureAs: 'chosenQueue',
    capturePattern: /\b(Alpha|Beta|Gamma)\b/i,
  });

  for (let i = 8; i < 18; i += 1) push(filler(i));

  push({
    kind: 'probe',
    id: 'recall_d24_codename',
    metric: 'same_thread_recall',
    distance: 24,
    content: 'What is the project codename? Reply with the codename only.',
    expect: [/ORCHID[- ]?731/i],
  });
  push({
    kind: 'probe',
    id: 'recall_d22_language',
    metric: 'constraint_fidelity',
    distance: 22,
    content: 'Which programming language did we agree the backend must be written in? One word.',
    expect: [/typescript/i],
  });

  push({ kind: 'seed', content: 'Replace PostgreSQL with CockroachDB as the primary database. Acknowledge briefly.' });

  for (let i = 18; i < 30; i += 1) push(filler(i));

  push({
    kind: 'probe',
    id: 'latest_value_db',
    metric: 'latest_value_precedence',
    distance: 13,
    content: 'Which database are we using as the primary database? Reply with the product name only.',
    expect: [/cockroach/i],
    forbid: [/postgres/i],
  });
  push({
    kind: 'probe',
    id: 'assistant_recall_queue',
    metric: 'assistant_response_recall',
    distance: 26,
    content:
      'Earlier you chose one of the three queue options as the most reliable. Which one did you choose? Reply with just its name.',
    expectCaptured: 'chosenQueue',
  });
  push({
    kind: 'probe',
    id: 'coref_implement_it',
    metric: 'coreference_resolution',
    distance: 28,
    content: 'Implement it. Start your reply by naming exactly what you are implementing.',
    expectCaptured: 'chosenQueue',
  });

  push({ kind: 'seed', content: 'The retry policy must retry exactly seven times. Acknowledge briefly.' });

  for (let i = 30; i < 40; i += 1) push(filler(i));

  push({
    kind: 'probe',
    id: 'recall_d11_retries',
    metric: 'constraint_fidelity',
    distance: 11,
    content: 'How many times does our retry policy retry? Reply with the number only.',
    expect: [/\b(7|seven)\b/i],
  });
  push({
    kind: 'probe',
    id: 'recall_d45_ids',
    metric: 'constraint_fidelity',
    distance: 45,
    content: 'What did we agree about exposing database IDs in public APIs? One sentence.',
    expect: [/sequential|non-?sequential|opaque|uuid/i],
  });
  push({
    kind: 'probe',
    id: 'recall_d56_codename',
    metric: 'same_thread_recall',
    distance: 56,
    content: 'What is the project codename? Reply with the codename only.',
    expect: [/ORCHID[- ]?731/i],
  });
  push({
    kind: 'probe',
    id: 'final_synthesis',
    metric: 'final_synthesis',
    distance: 57,
    content:
      'List every decision and constraint we agreed on in this conversation as a bullet list. Include the codename, the language, the database, the queue option, the retry count and the ID rule.',
    expect: [/ORCHID[- ]?731/i, /typescript/i, /cockroach/i, /\b(7|seven)\b/i, /sequential|opaque|uuid/i],
    forbid: [/postgres/i],
    partial: true,
  });

  return { id: 'context-gauntlet', turns };
}

/** Four topics in sequence, then a return to the first. Measures contamination. */
export function topicReturn() {
  const turns = [];
  const topics = [
    { key: 'A', seed: 'Topic A: my sailing boat is named HALYARD and its hull is 11 metres.', probeWord: /halyard/i, ask: 'What is the name of my sailing boat? Name only.' },
    { key: 'B', seed: 'Topic B: my espresso machine is a LEVERETTA with a 58mm portafilter.' },
    { key: 'C', seed: 'Topic C: my dog is a border collie named PIXEL, seven years old.' },
    { key: 'D', seed: 'Topic D: my car is a diesel estate called TARMAC with 190000 km.' },
  ];
  for (const [ti, topic] of topics.entries()) {
    turns.push({ kind: 'seed', content: `${topic.seed} Acknowledge briefly.` });
    for (let i = 0; i < 6; i += 1) turns.push(filler(ti * 6 + i));
  }
  turns.push({
    kind: 'probe',
    id: 'topic_return_A',
    metric: 'topic_return_accuracy',
    distance: 27,
    content: 'What is the name of my sailing boat, and how long is its hull? Answer in one line.',
    expect: [/halyard/i, /11\s?m|eleven/i],
    forbid: [/leveretta/i, /pixel/i, /tarmac/i],
    partial: true,
  });
  return { id: 'topic-return', turns };
}

/** Short, cheap scenario used for breadth across every model. */
export function shortRecall() {
  const turns = [
    { kind: 'seed', content: 'My access code for this session is VERDIGRIS-4417. Acknowledge in one short sentence.' },
  ];
  for (let i = 0; i < 8; i += 1) turns.push(filler(i + 3));
  turns.push({
    kind: 'probe',
    id: 'short_recall_d9',
    metric: 'same_thread_recall',
    distance: 9,
    content: 'What is my access code for this session? Reply with the code only.',
    expect: [/VERDIGRIS[- ]?4417/i],
  });
  return { id: 'short-recall', turns };
}

/** Cross-thread: thread A plants, thread B asks. Scored as leak-or-recall by contract. */
export const crossThread = {
  seedTurns: [
    { kind: 'seed', content: 'For project MERIDIAN-88 we decided to standardise on pnpm for every Node project. Acknowledge briefly.' },
    { kind: 'seed', content: 'Also for MERIDIAN-88: all timestamps are stored in UTC only. Acknowledge briefly.' },
  ],
  probeTurns: [
    {
      kind: 'probe',
      id: 'cross_thread_recall',
      metric: 'cross_thread_recall',
      distance: 0,
      content: 'Continue the MERIDIAN-88 project we discussed earlier. What package manager did we standardise on? One word.',
      expect: [/pnpm/i],
    },
  ],
  leakProbeTurns: [
    {
      kind: 'probe',
      id: 'cross_thread_leak',
      metric: 'wrong_thread_retrieval',
      distance: 0,
      content: 'What is the access code VERDIGRIS? If you have not been told one in this conversation, say NONE.',
      expect: [/none/i],
      forbid: [/4417/],
    },
  ],
};

export function scoreProbe(turn, answer, captured) {
  const text = String(answer ?? '');
  const expected = turn.expectCaptured
    ? [new RegExp(`\\b${captured[turn.expectCaptured] ?? '__UNCAPTURED__'}\\b`, 'i')]
    : (turn.expect ?? []);
  const hits = expected.filter((re) => re.test(text)).length;
  const forbidden = (turn.forbid ?? []).filter((re) => re.test(text));
  const total = expected.length;
  const pass = turn.partial
    ? hits === total && forbidden.length === 0
    : hits === total && forbidden.length === 0;
  return {
    probeId: turn.id,
    metric: turn.metric,
    distance: turn.distance,
    pass,
    hits,
    total,
    hitRatio: total === 0 ? 0 : hits / total,
    violations: forbidden.map((re) => re.source),
    answer: text.slice(0, 400),
  };
}
