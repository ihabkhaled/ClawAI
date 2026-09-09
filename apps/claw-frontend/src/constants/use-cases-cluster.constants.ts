import { UseCaseTask } from '@/enums/use-case-task.enum';

/**
 * The existing `/use-cases` page becomes a hub, keeping its URL (F4 of the
 * SEO content architecture doc — no redirect, no lost equity). Named
 * `use-cases-cluster` rather than `use-cases` to avoid a collision with the
 * existing `marketing-use-cases.constants.ts` (the legacy grid section's
 * descriptors, kept as-is on the hub).
 */
export const USE_CASES_HUB_PATH = '/use-cases';
export const USE_CASES_HUB_SLUG = 'use-cases';

/**
 * When the claims on these pages were last checked against
 * `packages/shared-types/src/enums/plan-feature.enum.ts`,
 * `packages/shared-types/src/enums/payg-surface.enum.ts`,
 * `packages/shared-types/src/enums/workspace-provider.enum.ts` and
 * `packages/shared-types/src/enums/routing-mode.enum.ts`. Move this ONLY
 * after re-checking all four.
 */
export const USE_CASES_REVIEW_DATE = '2026-09-09';

/**
 * Render order on the hub, and generation order for the dynamic route.
 * Leads with the two jobs that already drive the most sign-ups in the
 * legacy grid (coding, research), closes with the two most specialised.
 */
export const USE_CASES_TASK_ORDER: ReadonlyArray<UseCaseTask> = [
  UseCaseTask.CODING_AND_DEVELOPMENT,
  UseCaseTask.RESEARCH_AND_FACT_FINDING,
  UseCaseTask.WRITING_AND_EDITING,
  UseCaseTask.COMPARING_MODEL_ANSWERS,
  UseCaseTask.WORKSPACE_AUTOMATION,
  UseCaseTask.STRUCTURED_DATA_EXTRACTION,
  UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT,
];

export function getUseCaseTaskPath(task: UseCaseTask): string {
  return `${USE_CASES_HUB_PATH}/${task}`;
}

export function getUseCaseTaskSlug(task: UseCaseTask): string {
  return `${USE_CASES_HUB_SLUG}/${task}`;
}

/**
 * Related pages per task, editorial rather than computed. Cross-links to
 * `/learn/*`, `/model-fit/*`, `/model-providers/*` and `/integrations`
 * rather than re-explaining concepts already covered by those clusters.
 */
export const USE_CASES_RELATED_PATHS: Readonly<Record<UseCaseTask, ReadonlyArray<string>>> = {
  [UseCaseTask.CODING_AND_DEVELOPMENT]: [
    '/coding-agent',
    '/model-fit/coding',
    '/integrations',
    '/pricing',
  ],
  [UseCaseTask.RESEARCH_AND_FACT_FINDING]: [
    '/model-fit/research-with-sources',
    '/learn/what-is-rag',
    '/pricing',
  ],
  [UseCaseTask.WRITING_AND_EDITING]: [
    '/model-fit/writing-and-editing',
    '/learn/what-are-context-packs',
    '/pricing',
  ],
  [UseCaseTask.COMPARING_MODEL_ANSWERS]: [
    '/learn/what-is-ai-consensus',
    '/learn/what-is-best-of-n',
    '/learn/what-is-an-ai-judge',
  ],
  [UseCaseTask.WORKSPACE_AUTOMATION]: ['/integrations', '/learn/what-is-llm-orchestration'],
  [UseCaseTask.STRUCTURED_DATA_EXTRACTION]: [
    '/learn/what-are-structured-ai-outputs',
    '/learn/how-ai-tool-calling-works',
  ],
  [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]: [
    '/model-providers/local-ai',
    '/local-first-ai',
    '/model-fit/private-local-workloads',
  ],
};

export function isUseCaseTask(value: string): value is UseCaseTask {
  return (Object.values(UseCaseTask) as string[]).includes(value);
}
