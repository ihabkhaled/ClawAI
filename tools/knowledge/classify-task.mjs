// Deterministic task classifier. Maps a free-text task to a curated task pack
// (rules/skills/reviewers/validation/pitfalls). Pure keyword matching — no AI,
// fully reproducible. Packs mirror .ai/packs/ and context/task-router.md.

const PACKS = [
  {
    pack: 'billing-payments',
    keywords: [
      'billing',
      'payment',
      'subscription',
      'refund',
      'invoice',
      'reconciliation',
      'price version',
      'checkout',
      'paymob',
      'paypal',
    ],
    summary:
      'subscription, payment gateway, refund, invoice, pricing, or billing operations change',
    affectedServices: ['claw-auth-service', 'claw-payment-service'],
    reviewers: [
      'api-contract-reviewer',
      'security-reviewer',
      'database-reviewer',
      'reliability-engineer',
    ],
    validation: [
      'cd apps/claw-auth-service && npm run typecheck && npm run lint && npm test',
      'cd apps/claw-payment-service && npm run typecheck && npm run lint && npm test',
      'cd apps/claw-frontend && npm run typecheck && npm run lint && npm test',
    ],
    pitfalls: [
      'Read rules/28-billing-integrity-and-api-contracts.md before changing billing state',
      'Prices, refunds, and invoice snapshots are immutable; money uses integer units',
      'Scheduled jobs require owner-token locks and resumable idempotent work',
      'Frontend repository tests assert the exact serialized request body',
    ],
  },
  {
    pack: 'authentication-security',
    keywords: [
      'auth',
      'login',
      'logout',
      'jwt',
      'token',
      'refresh',
      'session',
      'password',
      'argon2',
      'rbac',
      'permission',
    ],
    summary: 'auth-service change touching identity, sessions, or permissions',
    reviewers: ['security-reviewer', 'authentication-reviewer', 'authorization-idor-reviewer'],
    validation: ['cd apps/claw-auth-service && npm run typecheck && npm run lint && npm test'],
    pitfalls: [
      'Refresh-token rotation must invalidate the old token',
      'Never log tokens/passwords',
      'Ownership checks live in the service, not the controller',
    ],
  },
  {
    pack: 'rabbitmq-event',
    keywords: [
      'event',
      'rabbitmq',
      'publish',
      'consume',
      'subscribe',
      'queue',
      'dlq',
      'exchange',
      'message.',
    ],
    summary: 'RabbitMQ event contract or producer/consumer change',
    reviewers: ['rabbitmq-event-reviewer', 'reliability-engineer'],
    validation: ['cd packages/shared-types && npm run typecheck', 'npm run affected:test'],
    pitfalls: [
      'Add the pattern to packages/shared-types EventPattern first',
      'Every producer needs a documented consumer',
      'Handlers must not swallow errors silently',
    ],
  },
  {
    pack: 'database-migration',
    keywords: [
      'prisma',
      'schema',
      'migration',
      'model',
      'column',
      'table',
      'mongoose',
      'backfill',
      'database',
    ],
    summary: 'Prisma/Mongoose schema or migration change',
    reviewers: ['database-reviewer', 'migration-reviewer'],
    validation: [
      'cd apps/<service> && npx prisma migrate dev --name <name>',
      'npm run affected:test',
    ],
    pitfalls: [
      'Migrations must be additive/reversible',
      'Each service owns its DB — no cross-DB queries',
      'Repository files never throw',
    ],
  },
  {
    pack: 'chat-streaming',
    keywords: ['stream', 'sse', 'streaming', 'chat', 'token delta', 'reasoning', 'progress'],
    summary: 'chat-service SSE / streaming change',
    reviewers: ['backend-code-reviewer', 'reliability-engineer', 'observability-reviewer'],
    validation: ['cd apps/claw-chat-service && npm run typecheck && npm run lint && npm test'],
    pitfalls: [
      'SSE routes need @SkipLogging + proxy_buffering off in nginx',
      'Store an error ASSISTANT message on failure or polling spins forever',
      'Never pass JWT in URL query params',
    ],
  },
  {
    pack: 'ai-provider-connector',
    keywords: [
      'connector',
      'provider',
      'openai',
      'anthropic',
      'gemini',
      'bedrock',
      'deepseek',
      'grok',
      'adapter',
      'model sync',
    ],
    summary: 'connector-service provider adapter change',
    reviewers: ['backend-code-reviewer', 'security-reviewer', 'api-contract-reviewer'],
    validation: ['cd apps/claw-connector-service && npm run typecheck && npm run lint && npm test'],
    pitfalls: [
      'Wrap the vendor SDK in an adapter — no raw SDK imports in services',
      'API keys are AES-256-GCM encrypted at rest',
      'Never expose encryptedConfig in responses',
    ],
  },
  {
    pack: 'model-routing',
    keywords: ['routing', 'router', 'route mode', 'auto mode', 'privacy', 'heuristic', 'policy'],
    summary: 'routing-service decision/policy change',
    reviewers: ['backend-code-reviewer'],
    validation: ['cd apps/claw-routing-service && npm run typecheck && npm run lint && npm test'],
    pitfalls: [
      'Privacy keywords must force local routing',
      'ROUTER-role models never appear in the chat selector',
    ],
  },
  {
    pack: 'frontend-feature',
    keywords: [
      'component',
      'page',
      'hook',
      'ui',
      'react',
      'tsx',
      'button',
      'form',
      'dialog',
      'modal',
      'frontend',
      'tailwind',
      'shadcn',
    ],
    summary: 'Next.js frontend feature/component change',
    reviewers: ['frontend-architect', 'accessibility-reviewer', 'i18n-reviewer'],
    validation: ['cd apps/claw-frontend && npm run typecheck && npm run lint && npm test'],
    pitfalls: [
      'TSX = render only; no hooks/consts/inline types/sub-components',
      'All text via t() in all 13 locales',
      'Use shadcn/ui — no raw select/input/textarea',
    ],
  },
  {
    pack: 'workspace-connector',
    keywords: [
      'workspace',
      'github',
      'gitlab',
      'jira',
      'slack',
      'oauth',
      'webhook',
      'sync',
      'confluence',
      'drive',
    ],
    summary: 'workspace-service connector change',
    reviewers: ['backend-code-reviewer', 'security-reviewer', 'reliability-engineer'],
    validation: ['cd apps/claw-workspace-service && npm run typecheck && npm run lint && npm test'],
    pitfalls: [
      'OAuth secrets never leave the backend',
      'Sync jobs must be idempotent + rate-limited',
    ],
  },
  {
    pack: 'infrastructure',
    keywords: [
      'docker',
      'compose',
      'nginx',
      'env',
      'port',
      'volume',
      'gpu',
      'ci',
      'workflow',
      'vercel',
    ],
    summary: 'infrastructure / config change',
    reviewers: ['infrastructure-reviewer', 'release-gatekeeper'],
    validation: ['npm run knowledge:verify', 'npm run affected:build'],
    pitfalls: [
      'New service/DB → ALL split compose files in the same commit',
      'New env var → .env.example + installers + docs',
      'New service → nginx + health + shared-constants',
    ],
  },
  {
    pack: 'documentation',
    keywords: ['doc', 'docs', 'readme', 'guide', 'adr', 'markdown', 'context', 'rule', 'skill'],
    summary: 'documentation / governance change',
    reviewers: ['documentation-curator', 'knowledge-system-maintainer', 'ai-context-reviewer'],
    validation: ['npm run docs:check', 'npm run knowledge:verify'],
    pitfalls: [
      'i18n.types.ts + locales are one atomic change',
      'Generated .ai files are never hand-edited',
    ],
  },
];

const DEFAULT = {
  pack: 'backend-feature',
  summary: 'general backend feature — scope with --service',
  reviewers: ['backend-code-reviewer', 'test-engineer'],
  validation: [
    'npm run affected:list',
    'cd apps/<service> && npm run typecheck && npm run lint && npm test',
  ],
  pitfalls: [
    'Controller → Service → Repository layering',
    'No inline types/enums/consts in logic files',
    'Every new function needs a test',
  ],
};

export function classifyTask(task, args = {}) {
  const lower = ` ${task.toLowerCase()} `;
  let best = null;
  let bestScore = 0;
  for (const p of PACKS) {
    let score = 0;
    for (const kw of p.keywords) if (lower.includes(kw)) score += 1;
    if (args.event && p.pack === 'rabbitmq-event') score += 3;
    if (args.route && p.pack === 'frontend-feature') score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best ?? DEFAULT;
}

export const TASK_PACKS = PACKS;
