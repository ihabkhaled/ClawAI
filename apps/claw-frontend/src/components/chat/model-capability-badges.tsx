import {
  MODEL_CAPABILITY_BADGE_ICONS,
  MODEL_CAPABILITY_BADGE_LABEL_KEYS,
  MODEL_CAPABILITY_BADGE_LIST_LABEL_KEY,
} from '@/constants/model-capability-badge.constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { ModelCapabilityBadgesProps } from '@/types';

/**
 * Small capability glyphs on a model-picker row: Vision, Audio input, Video,
 * Image output. Icon-sized so a list of ~180 models stays readable; each glyph
 * is distinct (never colour alone), carries a localized `title` for the hover
 * tooltip, and a visually-hidden label for screen readers.
 *
 * The badges come from the row's OWN catalog flags only (see
 * `getConnectorModelCapabilityBadges`) — never from the provider.
 */
export function ModelCapabilityBadges({
  capabilities,
}: ModelCapabilityBadgesProps): React.ReactElement | null {
  const { t } = useTranslation();

  if (capabilities.length === 0) {
    return null;
  }

  return (
    <span
      className="text-muted-foreground flex shrink-0 items-center gap-0.5"
      role="list"
      aria-label={t(MODEL_CAPABILITY_BADGE_LIST_LABEL_KEY)}
      data-testid="model-capability-badges"
    >
      {capabilities.map((capability) => {
        const Icon = MODEL_CAPABILITY_BADGE_ICONS[capability];
        const label = t(MODEL_CAPABILITY_BADGE_LABEL_KEYS[capability]);
        return (
          <span
            key={capability}
            role="listitem"
            title={label}
            className="border-border bg-muted inline-flex h-4 w-4 items-center justify-center rounded border"
            data-testid={`model-capability-badge-${capability}`}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </span>
        );
      })}
    </span>
  );
}
