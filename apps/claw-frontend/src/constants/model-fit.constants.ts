import { ModelFitTask } from '@/enums/model-fit-task.enum';

/**
 * NOT `/models/for` — the plan (§8.2 of the SEO content architecture doc)
 * named this cluster `/models/for/coding` etc. `/models` is a
 * `PRIVATE_ROUTE_PREFIXES` entry (the authenticated model catalog dashboard
 * at `src/app/(portal)/models/**`), and `PRIVATE_ROUTE_PREFIXES` matches by
 * string prefix — `/models/for/coding` starts with `/models` and would
 * collide the same way the model-providers cluster's `/models` hub would
 * have (that cluster moved to `/model-providers` for the identical reason,
 * commit efed5669f). `/models-for/*` was considered and rejected too: it
 * ALSO starts with the literal string `/models`, so it collides just as
 * hard. This cluster lives at `/model-fit` instead, which shares no prefix
 * with the private route. Deviation recorded in
 * `docs/05-frontend/seo-content-architecture.md` §4/§8.2.
 */
export const MODEL_FIT_HUB_PATH = '/model-fit';
export const MODEL_FIT_HUB_SLUG = 'model-fit';

/**
 * When the claims on these pages were last checked against
 * `constants/model-facts.constants.ts` (itself grounded in
 * `apps/claw-routing-service/src/modules/router-models/constants/model-cost-seed.constants.ts`)
 * and `packages/shared-types/src/enums/plan-feature.enum.ts` for the
 * research-metering claim on `/model-fit/research-with-sources`. Move this
 * ONLY after re-checking both.
 */
export const MODEL_FIT_REVIEW_DATE = '2026-09-09';

/**
 * Render order on the hub, and generation order for the dynamic route.
 * Matches the backlog order: coding, complex reasoning, writing and
 * editing, research with sources, private/local workloads last since it is
 * the one task defined by where the request runs rather than by its
 * cognitive shape.
 */
export const MODEL_FIT_TASK_ORDER: ReadonlyArray<ModelFitTask> = [
  ModelFitTask.CODING,
  ModelFitTask.COMPLEX_REASONING,
  ModelFitTask.WRITING_AND_EDITING,
  ModelFitTask.RESEARCH_WITH_SOURCES,
  ModelFitTask.PRIVATE_LOCAL_WORKLOADS,
];

export function getModelFitTaskPath(task: ModelFitTask): string {
  return `${MODEL_FIT_HUB_PATH}/${task}`;
}

export function getModelFitTaskSlug(task: ModelFitTask): string {
  return `${MODEL_FIT_HUB_SLUG}/${task}`;
}

/**
 * Related pages per task, editorial rather than computed. Every task links
 * to `/pricing` (the "confirm the live catalog" qualifier lives on the page
 * body too) and to `/model-providers` (browse the same models by vendor
 * instead of by task) rather than re-listing providers here.
 */
export const MODEL_FIT_RELATED_PATHS: Readonly<Record<ModelFitTask, ReadonlyArray<string>>> = {
  [ModelFitTask.CODING]: [
    '/pricing',
    '/model-providers',
    '/learn/how-to-evaluate-ai-models',
    '/learn/how-to-read-ai-benchmarks',
  ],
  [ModelFitTask.COMPLEX_REASONING]: [
    '/pricing',
    '/model-providers',
    '/learn/how-to-evaluate-ai-models',
    '/learn/how-to-read-ai-benchmarks',
  ],
  [ModelFitTask.WRITING_AND_EDITING]: [
    '/pricing',
    '/model-providers',
    '/learn/how-to-evaluate-ai-models',
    '/learn/what-is-a-context-window',
  ],
  [ModelFitTask.RESEARCH_WITH_SOURCES]: [
    '/pricing',
    '/model-providers',
    '/learn/what-is-rag',
    '/learn/how-to-evaluate-ai-models',
  ],
  [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]: [
    '/model-providers/local-ai',
    '/learn/what-is-local-ai',
    '/local-first-ai',
  ],
};

export function isModelFitTask(value: string): value is ModelFitTask {
  return (Object.values(ModelFitTask) as string[]).includes(value);
}
