import type { LucideIcon } from 'lucide-react';
import { Clapperboard, Eye, Film, ImageIcon, Mic, Volume2 } from 'lucide-react';

import { ModelCapabilityBadge } from '@/enums/model-capability-badge.enum';

/**
 * Localized tooltip / screen-reader text per badge. `Record<enum, …>` makes it
 * exhaustive: a new badge without copy fails typecheck.
 */
export const MODEL_CAPABILITY_BADGE_LABEL_KEYS: Readonly<Record<ModelCapabilityBadge, string>> = {
  [ModelCapabilityBadge.Vision]: 'mediaUi.capability.vision',
  [ModelCapabilityBadge.AudioInput]: 'mediaUi.capability.audioInput',
  [ModelCapabilityBadge.VideoInput]: 'mediaUi.capability.videoInput',
  [ModelCapabilityBadge.ImageOutput]: 'mediaUi.capability.imageOutput',
  [ModelCapabilityBadge.VideoOutput]: 'mediaUi.capability.videoOutput',
  [ModelCapabilityBadge.AudioOutput]: 'mediaUi.capability.audioOutput',
};

/** A distinct glyph per badge, so the row is never read by colour alone. */
export const MODEL_CAPABILITY_BADGE_ICONS: Readonly<Record<ModelCapabilityBadge, LucideIcon>> = {
  [ModelCapabilityBadge.Vision]: Eye,
  [ModelCapabilityBadge.AudioInput]: Mic,
  [ModelCapabilityBadge.VideoInput]: Film,
  [ModelCapabilityBadge.ImageOutput]: ImageIcon,
  [ModelCapabilityBadge.VideoOutput]: Clapperboard,
  [ModelCapabilityBadge.AudioOutput]: Volume2,
};

export const MODEL_CAPABILITY_BADGE_LIST_LABEL_KEY = 'mediaUi.capability.listLabel';

/** The picker-row kind word (translation key) for each media-output badge. */
export const MODEL_MEDIA_KIND_LABEL_KEYS: ReadonlyMap<ModelCapabilityBadge, string> = new Map([
  [ModelCapabilityBadge.ImageOutput, 'mediaUi.modelKind.image'],
  [ModelCapabilityBadge.VideoOutput, 'mediaUi.modelKind.video'],
  [ModelCapabilityBadge.AudioOutput, 'mediaUi.modelKind.audio'],
]);
