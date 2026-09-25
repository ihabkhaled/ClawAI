import type { LucideIcon } from 'lucide-react';
import { Eye, Film, ImageIcon, Mic } from 'lucide-react';

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
};

/** A distinct glyph per badge, so the row is never read by colour alone. */
export const MODEL_CAPABILITY_BADGE_ICONS: Readonly<Record<ModelCapabilityBadge, LucideIcon>> = {
  [ModelCapabilityBadge.Vision]: Eye,
  [ModelCapabilityBadge.AudioInput]: Mic,
  [ModelCapabilityBadge.VideoInput]: Film,
  [ModelCapabilityBadge.ImageOutput]: ImageIcon,
};

export const MODEL_CAPABILITY_BADGE_LIST_LABEL_KEY = 'mediaUi.capability.listLabel';
