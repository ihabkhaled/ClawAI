import { Brain } from 'lucide-react';

import { REASONING_VISIBILITY_LABEL_KEYS } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { VisibleReasoningPanelProps } from '@/types';

// Extracted from the legacy StreamThinkingPanel so the runtime-progress
// panel can compose it without pulling in the wider stream/* module. Same
// render contract: hides on empty reasoning, otherwise renders a native
// <details> with the visibility-aware label. Adds an optional onToggle so
// PR2 can persist the open state across runtime stages.
export function VisibleReasoningPanel({
  reasoning,
  visibility,
  className,
  onToggle,
}: VisibleReasoningPanelProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (reasoning.trim().length === 0) {
    return null;
  }
  const labelKey =
    (visibility !== undefined ? REASONING_VISIBILITY_LABEL_KEYS[visibility] : undefined) ??
    'chat.stream.reasoning.modelEmitted';

  const handleToggle = (event: React.SyntheticEvent<HTMLDetailsElement>): void => {
    if (onToggle === undefined) {
      return;
    }
    onToggle(event.currentTarget.open);
  };

  return (
    <details
      className={cn(
        'group w-full rounded-lg border border-violet-500/25 bg-violet-500/5 px-3 py-2',
        className,
      )}
      onToggle={handleToggle}
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-violet-700 dark:text-violet-300">
        <Brain className="h-3.5 w-3.5" />
        {t('chat.stream.reasoning.title')}
        <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-normal text-violet-600 dark:text-violet-400">
          {t(labelKey)}
        </span>
      </summary>
      <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
        {reasoning}
      </div>
    </details>
  );
}
