import { z } from 'zod';

import { MediaKind } from '../enums/media-kind.enum';

/** The catalog is a deployment property and a plan answer changes rarely: one minute, like exposure. */
export const MEDIA_CATALOG_CACHE_TTL_MS = 60_000;
export const MEDIA_CATALOG_TIMEOUT_MS = 2_500;
export const MEDIA_CATALOG_MAX_CACHE_KEYS = 500;

/** The connectors that serve each kind, best first. Local providers are never in it. */
export const MEDIA_CATALOG_CONNECTOR_ORDER: ReadonlyMap<MediaKind, readonly string[]> = new Map([
  [MediaKind.IMAGE, ['GEMINI', 'OPENAI', 'GROK']],
  [MediaKind.VIDEO, ['GEMINI', 'GROK']],
  [MediaKind.AUDIO, ['OPENAI', 'GEMINI']],
]);

/** A media provider is the connector behind a kind prefix: IMAGE_OPENAI, VIDEO_GROK, AUDIO_GEMINI. */
export const MEDIA_CATALOG_PROVIDER_PREFIX: ReadonlyMap<MediaKind, string> = new Map([
  [MediaKind.IMAGE, 'IMAGE_'],
  [MediaKind.VIDEO, 'VIDEO_'],
  [MediaKind.AUDIO, 'AUDIO_'],
]);

/** Cheapest first inside a provider; an unpriced model sorts after every priced one. */
export const MEDIA_CATALOG_COST_RANK: ReadonlyMap<string, number> = new Map([
  ['FREE', 0],
  ['CHEAP', 1],
  ['STANDARD', 2],
  ['PREMIUM', 3],
  ['ULTRA', 4],
]);

export const mediaCatalogSnapshotSchema = z.object({
  models: z.array(
    z.object({
      provider: z.string(),
      modelKey: z.string(),
      mediaKind: z.string().optional(),
      audioKind: z.string().optional(),
      exposure: z.string().optional(),
    }),
  ),
});
