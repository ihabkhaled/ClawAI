import type { UserEntitlements } from '@claw/shared-entitlements';
import {
  Locale,
  ModelCostClass,
  Permission,
  PlanModelAccessMode,
  ThreadPublicationType,
} from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import { costClassKey } from '../../utilities/model-cost-class.utility';
import { GenerationPreflightService } from '../generation-preflight.service';
import { ModelCatalogClient } from '../model-catalog.client';

const NIM = 'NVIDIANIM';
const VIDEO_DETECTOR = 'nvidia/ai-synthetic-video-detector';
const GLM = 'z-ai/glm-5.2';
const KIMI = 'moonshotai/kimi-k3';
const KIMI_CODE = 'moonshotai/kimi-k2.7-code';
const NEMOTRON = 'nvidia/nemotron-3-super';

const backups = [
  { provider: NIM, model: VIDEO_DETECTOR },
  { provider: NIM, model: NEMOTRON },
];

const seat = (id: string, model: string) => ({
  id,
  provider: NIM,
  model,
  maxOutputTokens: 4096,
  fallbacks: backups.filter((backup) => backup.model !== model),
});

/** The production request of 2026-11-22: valid picks, a video detector among the fallbacks. */
const request: StartThreadGenerationDto = {
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'key-1',
  correlationId: 'corr-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: Locale.EN,
  topic: 'A sufficiently detailed topic for research',
  publicationType: ThreadPublicationType.ARTICLE,
  authors: [seat('author-1', GLM), seat('author-2', KIMI), seat('author-3', GLM)],
  judge: seat('judge', KIMI_CODE),
  critic: seat('critic', NEMOTRON),
};

const allowAll = (overrides: Partial<UserEntitlements> = {}): UserEntitlements => ({
  userId: 'owner-1',
  role: 'USER',
  isAdmin: false,
  permissions: [Permission.THREAD_GENERATION_USE],
  modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
  allowedModels: [],
  plan: null,
  allowedProviders: [],
  quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false, adminBypass: false },
  ...overrides,
});

function stubCatalog(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        providers: [
          {
            provider: 'nvidianim',
            models: [GLM, KIMI, KIMI_CODE, NEMOTRON, VIDEO_DETECTOR].map((modelKey) => ({
              modelKey,
            })),
          },
        ],
      }),
    }),
  );
}

function setup(entitlements: UserEntitlements, classes = new Map<string, ModelCostClass>()) {
  stubCatalog();
  return new GenerationPreflightService(
    { getEntitlements: vi.fn().mockResolvedValue(entitlements) } as never,
    new ModelCatalogClient(),
    { forPlan: vi.fn().mockResolvedValue(classes) } as never,
  );
}

const allFallbacks = (dto: StartThreadGenerationDto) =>
  [...dto.authors, dto.judge, dto.critic].flatMap((role) => role.fallbacks);

describe('GenerationPreflightService with a fallback Threads cannot use', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'j'.repeat(32));
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://threads:secret@localhost:5432/threads');
    vi.stubEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('THREAD_GENERATION_SERVICE_URL', 'https://thread-generation-service:4020');
    vi.stubEnv('CONNECTOR_SERVICE_URL', 'https://connector-service:4003');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(32));
    AppConfig.validate();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('starts with the picked models and drops NVIDIANIM/nvidia/ai-synthetic-video-detector', async () => {
    const usable = await setup(allowAll()).prepareStart('owner-1', request);

    expect(allFallbacks(usable)).not.toContainEqual({ provider: NIM, model: VIDEO_DETECTOR });
    expect(usable.authors[0]?.fallbacks).toEqual([{ provider: NIM, model: NEMOTRON }]);
    expect(usable.critic.fallbacks).toEqual([]);
    expect(usable.authors.map(({ model }) => model)).toEqual([GLM, KIMI, GLM]);
    expect(usable.judge.model).toBe(KIMI_CODE);
  });

  it('still refuses the video detector when it is a picked primary', async () => {
    const picked = { ...request, critic: seat('critic', VIDEO_DETECTOR) };

    await expect(setup(allowAll()).prepareStart('owner-1', picked)).rejects.toMatchObject({
      response: {
        code: 'THREAD_MODEL_UNKNOWN',
        roleId: 'critic',
        provider: NIM,
        model: VIDEO_DETECTOR,
      },
    });
  });

  it('drops a fallback the plan excludes or no price covers, keeps the run', async () => {
    const classes = new Map<string, ModelCostClass>(
      [GLM, KIMI, KIMI_CODE].map((model) => [costClassKey(NIM, model), ModelCostClass.CHEAP]),
    );
    const plan = allowAll({
      modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
      allowedCostClasses: [ModelCostClass.CHEAP],
    });
    const picks = {
      ...request,
      critic: { ...seat('critic', KIMI), fallbacks: [{ provider: NIM, model: NEMOTRON }] },
    };

    const usable = await setup(plan, classes).prepareStart('owner-1', picks);

    // Nemotron has no price on this cost-class plan, so it cannot run as a backup.
    expect(allFallbacks(usable)).toEqual([]);
  });
});
