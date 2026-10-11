import { MARKETING_SCENES_CONTENT_BY_LOCALE } from '@/constants/marketing-scenes-content.constants';
import { MARKETING_SCENES } from '@/constants/marketing-scenes.constants';
import type { Locale } from '@/enums/locale.enum';
import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import type {
  MarketingSceneAsset,
  MarketingSceneCopy,
  MarketingScenesLocaleContent,
} from '@/types/marketing-scenes.types';

const KNOWN_SCENE_IDS: ReadonlySet<string> = new Set(Object.values(MarketingSceneId));

function isMarketingSceneId(value: string): value is MarketingSceneId {
  return KNOWN_SCENE_IDS.has(value);
}

/** The gallery content for a locale; falls back to English if a runtime locale is unknown. */
export function getMarketingScenesContent(locale: Locale): MarketingScenesLocaleContent {
  return (
    MARKETING_SCENES_CONTENT_BY_LOCALE[locale] ?? MARKETING_SCENES_CONTENT_BY_LOCALE[DEFAULT_LOCALE]
  );
}

/** File and size of a scene, or `undefined` when the id is not in the registry. */
export function getMarketingScene(sceneId: string): MarketingSceneAsset | undefined {
  return isMarketingSceneId(sceneId) ? MARKETING_SCENES[sceneId] : undefined;
}

/** Alt text and caption of a scene in a locale, or `undefined` when the id is unknown. */
export function getMarketingSceneCopy(
  locale: Locale,
  sceneId: string,
): MarketingSceneCopy | undefined {
  return isMarketingSceneId(sceneId)
    ? getMarketingScenesContent(locale).scenes[sceneId]
    : undefined;
}
