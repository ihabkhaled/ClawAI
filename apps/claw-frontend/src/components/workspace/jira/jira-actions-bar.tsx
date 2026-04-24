import { ListChecks, MessageSquare, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AiActionKind } from '@/enums/ai-action-kind.enum';
import type { JiraActionsBarProps } from '@/types/component.types';

export function JiraActionsBar({
  onAction,
  isDraftPending,
  t,
}: JiraActionsBarProps): React.ReactElement {
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
        {t('jira.actions.summarize')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.DRAFT)}
        disabled={isDraftPending}
      >
        <MessageSquare className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('jira.actions.write_comment')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.EXTRACT)}
        disabled={isDraftPending}
      >
        <ListChecks className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('jira.actions.extract_tasks')}
      </Button>
    </div>
  );
}
