'use client';

import { Plug } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import type { MessagePluginRefsProps } from '@/types/plugin-call.types';

/**
 * The plugins a sent message mentioned, above its bubble. Drawn from the refs stored with the
 * message, never from matching `@Name` in the text, so a reloaded thread shows what was really sent.
 */
export function MessagePluginRefs({ refs }: MessagePluginRefsProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (refs.length === 0) {
    return null;
  }
  return (
    <ul aria-label={t('pluginChat.mention.chipsLabel')} className="flex flex-wrap gap-1">
      {refs.map((ref) => (
        <li
          key={ref.installId}
          className="bg-muted/60 text-muted-foreground flex max-w-full min-w-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
        >
          <Plug className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{ref.label}</span>
        </li>
      ))}
    </ul>
  );
}
