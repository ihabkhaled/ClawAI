import { SHARE_PUBLICATION_BULLET_KEYS } from '@/constants/chat-share-warning.constants';
import type { TranslateFunction } from '@/types/i18n.types';

/**
 * The publication-warning bullets, translated, in a fixed order.
 *
 * Order matters: it runs from what the visitor can do, through what search
 * engines and advertising do, to the two limits owners most often assume the
 * wrong way round — that disabling a share evicts it from search caches (it does
 * not), and that later messages publish themselves (they do not).
 */
export function buildSharePublicationBullets(t: TranslateFunction): string[] {
  return SHARE_PUBLICATION_BULLET_KEYS.map((key) => t(key));
}
