/** The public landing page for ClawAI Threads. `/threads` itself is the signed-in owner portal. */
export const THREADS_MARKETING_PATH = '/features/threads';

/** Where a signed-in owner creates and reviews Threads. */
export const THREADS_PORTAL_PATH = '/threads';

/** The public hub of published Threads. */
export const THREADS_DISCOVER_PATH = '/threads/discover';

/**
 * Anchor ids for the in-page section nav. Stable by contract: they end up in deep links,
 * in the product tours and in anything anyone bookmarks.
 */
export const THREADS_MARKETING_SECTION_IDS = {
  announcement: 'announcement',
  what: 'what-is-a-thread',
  steps: 'how-it-works',
  trust: 'safeguards',
  outputs: 'what-you-get',
  useCases: 'use-cases',
  plans: 'plans',
  faq: 'questions',
} as const;

/**
 * A real screenshot of the product for each step, in step order. These are captured from the
 * running app, not drawn; `docs/features/clawai-threads/marketing-screenshots.md` says how to
 * retake them when the interface changes.
 */
export const THREADS_MARKETING_STEP_IMAGES: ReadonlyArray<{
  src: string;
  width: number;
  height: number;
}> = [
  { src: '/marketing/threads/step-1-chat-menu.png', width: 1280, height: 720 },
  { src: '/marketing/threads/step-2-create-dialog.png', width: 1280, height: 960 },
  { src: '/marketing/threads/step-3-model-picker.png', width: 1280, height: 960 },
  { src: '/marketing/threads/step-4-spend-cap.png', width: 672, height: 430 },
  { src: '/marketing/threads/step-5-live-stages.png', width: 1280, height: 720 },
  { src: '/marketing/threads/step-6-published.png', width: 1280, height: 720 },
];
