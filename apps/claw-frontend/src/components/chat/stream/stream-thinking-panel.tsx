import { Brain } from 'lucide-react';

import { REASONING_VISIBILITY_LABEL_KEYS } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { StreamThinkingPanelProps } from '@/types';

// Collapsible reasoning panel. Uses native <details> so it needs no client
// state. Reasoning text is rendered as plain text (never HTML) per the
// security rule, and labelled by visibility so the user knows the source.
export function StreamThinkingPanel({
  reasoning,
  visibility,
  className,
}: StreamThinkingPanelProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (reasoning.trim().length === 0) {
    return null;
  }
  const labelKey =
    (visibility !== undefined ? REASONING_VISIBILITY_LABEL_KEYS[visibility] : undefined) ??
    'chat.stream.reasoning.modelEmitted';

  return (
    <details
      className={cn(
        'group w-full rounded-lg border border-violet-500/25 bg-violet-500/5 px-3 py-2',
        className,
      )}
    >
      <summary className="touch:text-xs flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-violet-700 dark:text-violet-300">
        <Brain className="h-3.5 w-3.5" />
        {t('chat.stream.reasoning.title')}
        <span className="touch:text-xs rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-normal text-violet-600 dark:text-violet-400">
          {t(labelKey)}
        </span>
      </summary>
      <div className="text-muted-foreground mt-2 max-h-64 overflow-y-auto text-xs break-words whitespace-pre-wrap">
        {reasoning}
      </div>
    </details>
  );
}
