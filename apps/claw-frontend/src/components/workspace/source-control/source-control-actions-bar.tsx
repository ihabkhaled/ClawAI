import { ListChecks, Search, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AiActionKind } from '@/enums/ai-action-kind.enum';
import type { SourceControlActionsBarProps } from '@/types/component.types';

export function SourceControlActionsBar({
  onAction,
  isDraftPending,
  t,
}: SourceControlActionsBarProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.JUDGE)}
        disabled={isDraftPending}
      >
        <Search className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('source_control.actions.review')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.SUMMARIZE)}
        disabled={isDraftPending}
      >
        <Sparkles className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('source_control.actions.summarize')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.EXTRACT)}
        disabled={isDraftPending}
      >
        <ListChecks className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('source_control.actions.extract_tasks')}
      </Button>
    </div>
  );
}
