import { ListChecks, MessageSquare, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AiActionKind } from '@/enums/ai-action-kind.enum';
import type { ConfluenceActionsBarProps } from '@/types/component.types';

export function ConfluenceActionsBar({
  onAction,
  isDraftPending,
  t,
}: ConfluenceActionsBarProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.SUMMARIZE)}
        disabled={isDraftPending}
      >
        <Sparkles className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('confluence.actions.summarize')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.EXTRACT)}
        disabled={isDraftPending}
      >
        <ListChecks className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('confluence.actions.extract_tasks')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.DRAFT)}
        disabled={isDraftPending}
      >
        <MessageSquare className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('confluence.actions.write_comment')}
      </Button>
    </div>
  );
}
