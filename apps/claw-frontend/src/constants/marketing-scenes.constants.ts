import { FeatureCapability } from '@/enums/feature-capability.enum';
import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import { MarketingScenePage } from '@/enums/marketing-scene-page.enum';
import { UseCaseTask } from '@/enums/use-case-task.enum';
import type { MarketingSceneAsset } from '@/types/marketing-scenes.types';

const DESKTOP = { width: 1440, height: 900 } as const;
const MOBILE = { width: 390, height: 844 } as const;
const SCENE_DIRECTORY = '/marketing/app';

function desktopScene(id: MarketingSceneId): MarketingSceneAsset {
  return { src: `${SCENE_DIRECTORY}/${id}.png`, ...DESKTOP };
}

function mobileScene(id: MarketingSceneId): MarketingSceneAsset {
  return { src: `${SCENE_DIRECTORY}/${id}.png`, ...MOBILE };
}

/**
 * Scene id to file and true pixel size. The size is what keeps the page from shifting while the
 * picture loads, so it must match the PNG. Screenshots are captured from the running app, never
 * drawn.
 */
export const MARKETING_SCENES: Record<MarketingSceneId, MarketingSceneAsset> = {
  [MarketingSceneId.CHAT_CONVERSATION]: desktopScene(MarketingSceneId.CHAT_CONVERSATION),
  [MarketingSceneId.CHAT_MODEL_PICKER]: desktopScene(MarketingSceneId.CHAT_MODEL_PICKER),
  [MarketingSceneId.CHAT_RESEARCH]: desktopScene(MarketingSceneId.CHAT_RESEARCH),
  [MarketingSceneId.CHAT_CONTEXT_MENU]: desktopScene(MarketingSceneId.CHAT_CONTEXT_MENU),
  [MarketingSceneId.CHAT_SHARE_DIALOG]: desktopScene(MarketingSceneId.CHAT_SHARE_DIALOG),
  [MarketingSceneId.COMPARE_SETUP]: desktopScene(MarketingSceneId.COMPARE_SETUP),
  [MarketingSceneId.LABS_CONSENSUS]: desktopScene(MarketingSceneId.LABS_CONSENSUS),
  [MarketingSceneId.FILES]: desktopScene(MarketingSceneId.FILES),
  [MarketingSceneId.MEMORY]: desktopScene(MarketingSceneId.MEMORY),
  [MarketingSceneId.CONTEXT_PACKS]: desktopScene(MarketingSceneId.CONTEXT_PACKS),
  [MarketingSceneId.CONNECTORS]: desktopScene(MarketingSceneId.CONNECTORS),
  [MarketingSceneId.BILLING_PLANS]: desktopScene(MarketingSceneId.BILLING_PLANS),
  [MarketingSceneId.PLAN_OVERVIEW]: desktopScene(MarketingSceneId.PLAN_OVERVIEW),
  [MarketingSceneId.USAGE]: desktopScene(MarketingSceneId.USAGE),
  [MarketingSceneId.SETTINGS]: desktopScene(MarketingSceneId.SETTINGS),
  [MarketingSceneId.THREADS_LIST]: desktopScene(MarketingSceneId.THREADS_LIST),
  [MarketingSceneId.THREAD_REVIEW]: desktopScene(MarketingSceneId.THREAD_REVIEW),
  [MarketingSceneId.NOTIFICATIONS_PANEL]: desktopScene(MarketingSceneId.NOTIFICATIONS_PANEL),
  [MarketingSceneId.TOUR_CARD]: desktopScene(MarketingSceneId.TOUR_CARD),
  [MarketingSceneId.DASHBOARD]: desktopScene(MarketingSceneId.DASHBOARD),
  [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: desktopScene(
    MarketingSceneId.OBSERVABILITY_CONSUMPTION,
  ),
  [MarketingSceneId.MOBILE_CHAT]: mobileScene(MarketingSceneId.MOBILE_CHAT),
  [MarketingSceneId.MOBILE_DASHBOARD]: mobileScene(MarketingSceneId.MOBILE_DASHBOARD),
};

/** Phone screenshots are narrow; the figure caps their width so they do not stretch. */
export const MARKETING_MOBILE_SCENES: ReadonlySet<MarketingSceneId> = new Set([
  MarketingSceneId.MOBILE_CHAT,
  MarketingSceneId.MOBILE_DASHBOARD,
]);

export const MARKETING_FIGURE_SIZES = '(min-width: 1024px) 560px, (min-width: 640px) 50vw, 100vw';
export const MARKETING_MOBILE_FIGURE_SIZES = '(min-width: 640px) 280px, 70vw';
export const MARKETING_STEP_FIGURE_SIZES = '(min-width: 1024px) 720px, 100vw';

/** Every `/features/<capability>` page, and the screenshots that show that capability. */
export const FEATURE_CAPABILITY_SCENES: Record<
  FeatureCapability,
  ReadonlyArray<MarketingSceneId>
> = {
  [FeatureCapability.MULTIMODAL_AI]: [MarketingSceneId.CHAT_CONVERSATION, MarketingSceneId.FILES],
  [FeatureCapability.SMART_ATTACHMENTS]: [
    MarketingSceneId.FILES,
    MarketingSceneId.CHAT_CONVERSATION,
  ],
  [FeatureCapability.FILES_FROM_CHAT]: [MarketingSceneId.FILES, MarketingSceneId.CHAT_CONVERSATION],
  [FeatureCapability.IMAGE_GENERATION]: [
    MarketingSceneId.CHAT_CONVERSATION,
    MarketingSceneId.FILES,
  ],
  [FeatureCapability.READ_ALOUD]: [
    MarketingSceneId.CHAT_CONVERSATION,
    MarketingSceneId.MOBILE_CHAT,
  ],
  [FeatureCapability.NARRATED_RESEARCH]: [
    MarketingSceneId.CHAT_RESEARCH,
    MarketingSceneId.CHAT_CONVERSATION,
  ],
  [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]: [
    MarketingSceneId.CHAT_MODEL_PICKER,
    MarketingSceneId.CHAT_CONVERSATION,
    MarketingSceneId.COMPARE_SETUP,
  ],
  [FeatureCapability.ORCHESTRATION_LABS]: [
    MarketingSceneId.COMPARE_SETUP,
    MarketingSceneId.LABS_CONSENSUS,
  ],
  [FeatureCapability.CONVERSATION_TOOLS]: [
    MarketingSceneId.CHAT_SHARE_DIALOG,
    MarketingSceneId.CHAT_CONTEXT_MENU,
  ],
  [FeatureCapability.MEMORY_AND_CONTEXT]: [
    MarketingSceneId.MEMORY,
    MarketingSceneId.CONTEXT_PACKS,
    MarketingSceneId.CHAT_CONTEXT_MENU,
  ],
  [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]: [
    MarketingSceneId.FILES,
    MarketingSceneId.CHAT_CONVERSATION,
  ],
  [FeatureCapability.WORKSPACE_CONNECTORS]: [MarketingSceneId.CONNECTORS],
  [FeatureCapability.PAY_AS_YOU_GO_CREDIT]: [
    MarketingSceneId.BILLING_PLANS,
    MarketingSceneId.USAGE,
  ],
  [FeatureCapability.ADMINISTRATION_AND_ACCESS]: [
    MarketingSceneId.SETTINGS,
    MarketingSceneId.OBSERVABILITY_CONSUMPTION,
  ],
  [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]: [
    MarketingSceneId.OBSERVABILITY_CONSUMPTION,
    MarketingSceneId.USAGE,
    MarketingSceneId.CHAT_CONVERSATION,
  ],
  [FeatureCapability.RELIABILITY]: [
    MarketingSceneId.NOTIFICATIONS_PANEL,
    MarketingSceneId.OBSERVABILITY_CONSUMPTION,
  ],
  [FeatureCapability.SECURITY_AND_DATA_HANDLING]: [
    MarketingSceneId.SETTINGS,
    MarketingSceneId.CHAT_SHARE_DIALOG,
    MarketingSceneId.MEMORY,
  ],
};

/** Every `/use-cases/<task>` page. */
export const USE_CASE_TASK_SCENES: Record<UseCaseTask, ReadonlyArray<MarketingSceneId>> = {
  [UseCaseTask.CODING_AND_DEVELOPMENT]: [
    MarketingSceneId.CHAT_MODEL_PICKER,
    MarketingSceneId.CHAT_CONVERSATION,
  ],
  [UseCaseTask.RESEARCH_AND_FACT_FINDING]: [
    MarketingSceneId.CHAT_RESEARCH,
    MarketingSceneId.CHAT_CONVERSATION,
  ],
  [UseCaseTask.WRITING_AND_EDITING]: [
    MarketingSceneId.CHAT_CONVERSATION,
    MarketingSceneId.CHAT_CONTEXT_MENU,
  ],
  [UseCaseTask.COMPARING_MODEL_ANSWERS]: [
    MarketingSceneId.COMPARE_SETUP,
    MarketingSceneId.LABS_CONSENSUS,
  ],
  [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]: [
    MarketingSceneId.CHAT_MODEL_PICKER,
    MarketingSceneId.SETTINGS,
  ],
  [UseCaseTask.WORKSPACE_AUTOMATION]: [
    MarketingSceneId.CONNECTORS,
    MarketingSceneId.THREADS_LIST,
    MarketingSceneId.THREAD_REVIEW,
  ],
  [UseCaseTask.STRUCTURED_DATA_EXTRACTION]: [
    MarketingSceneId.FILES,
    MarketingSceneId.CHAT_CONVERSATION,
  ],
};

/**
 * The screenshots on each fixed marketing page. `/coding-agent` is absent on purpose: it is about
 * an editor extension, and none of the ClawAI web app scenes shows it. Legal pages and `/contact`
 * carry no screenshots by policy.
 */
export const MARKETING_PAGE_SCENES: Record<MarketingScenePage, ReadonlyArray<MarketingSceneId>> = {
  [MarketingScenePage.HOME]: [
    MarketingSceneId.CHAT_CONVERSATION,
    MarketingSceneId.CHAT_MODEL_PICKER,
    MarketingSceneId.COMPARE_SETUP,
    MarketingSceneId.DASHBOARD,
  ],
  [MarketingScenePage.FEATURES_HUB]: [
    MarketingSceneId.CHAT_CONVERSATION,
    MarketingSceneId.LABS_CONSENSUS,
    MarketingSceneId.MEMORY,
    MarketingSceneId.FILES,
    MarketingSceneId.CONNECTORS,
    MarketingSceneId.MOBILE_CHAT,
    MarketingSceneId.MOBILE_DASHBOARD,
  ],
  [MarketingScenePage.HOW_IT_WORKS]: [
    MarketingSceneId.TOUR_CARD,
    MarketingSceneId.DASHBOARD,
    MarketingSceneId.CHAT_MODEL_PICKER,
    MarketingSceneId.CHAT_CONVERSATION,
    MarketingSceneId.CHAT_CONTEXT_MENU,
    MarketingSceneId.PLAN_OVERVIEW,
    MarketingSceneId.USAGE,
  ],
  [MarketingScenePage.PRICING]: [
    MarketingSceneId.BILLING_PLANS,
    MarketingSceneId.PLAN_OVERVIEW,
    MarketingSceneId.USAGE,
  ],
  [MarketingScenePage.COMPARE_HUB]: [
    MarketingSceneId.COMPARE_SETUP,
    MarketingSceneId.LABS_CONSENSUS,
  ],
  [MarketingScenePage.COMPARE_RIVAL]: [MarketingSceneId.COMPARE_SETUP],
  [MarketingScenePage.INTEGRATIONS_HUB]: [MarketingSceneId.CONNECTORS],
  [MarketingScenePage.INTEGRATIONS_TOPIC]: [MarketingSceneId.CONNECTORS],
  [MarketingScenePage.MODEL_PROVIDERS_HUB]: [MarketingSceneId.CHAT_MODEL_PICKER],
  [MarketingScenePage.MODEL_PROVIDER]: [MarketingSceneId.CHAT_MODEL_PICKER],
  [MarketingScenePage.LOCAL_FIRST_AI]: [
    MarketingSceneId.CHAT_MODEL_PICKER,
    MarketingSceneId.SETTINGS,
  ],
  [MarketingScenePage.SECURITY_AND_PRIVACY]: [
    MarketingSceneId.CHAT_SHARE_DIALOG,
    MarketingSceneId.SETTINGS,
  ],
  [MarketingScenePage.USE_CASES_HUB]: [
    MarketingSceneId.CHAT_CONVERSATION,
    MarketingSceneId.CHAT_RESEARCH,
    MarketingSceneId.COMPARE_SETUP,
  ],
  [MarketingScenePage.ARCHITECTURE]: [
    MarketingSceneId.OBSERVABILITY_CONSUMPTION,
    MarketingSceneId.CONNECTORS,
  ],
  [MarketingScenePage.LEARN]: [MarketingSceneId.CHAT_CONVERSATION],
  [MarketingScenePage.PROMPTS]: [
    MarketingSceneId.CHAT_CONVERSATION,
    MarketingSceneId.CHAT_CONTEXT_MENU,
  ],
};
