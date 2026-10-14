'use client';

import { Plug, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { PluginMentionChipsProps } from '@/types/plugin-mention.types';

/**
 * The plugins this message mentions, above the textarea. Each can be dropped before sending,
 * which also removes its `@Name` from the text. Renders nothing when none are mentioned, so an
 * ordinary composer is unchanged.
 */
export function PluginMentionChips({
  refs,
  onRemove,
  disabled = false,
}: PluginMentionChipsProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (refs.length === 0) {
    return null;
  }
  return (
    <ul aria-label={t('pluginChat.mention.chipsLabel')} className="flex flex-wrap gap-1 px-1">
      {refs.map((ref) => (
        <li
          key={ref.installId}
          className="bg-muted/60 text-foreground flex max-w-full min-w-0 items-center gap-1 rounded-full border py-0.5 ps-2 pe-0.5 text-xs"
        >
          <Plug className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{ref.label}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={() => onRemove(ref.installId)}
            aria-label={t('pluginChat.mention.removeChip', { value: ref.label })}
            className="touch:h-9 touch:w-9 h-5 w-5 shrink-0 rounded-full"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
