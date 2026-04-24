import { GitPullRequest } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { PR_STATE_COLORS } from '@/constants/source-control.constants';
import { cn } from '@/lib/utils';
import type { PullRequestRowProps } from '@/types/component.types';
import { getPrStateLabel } from '@/utilities/source-control.utility';

export function PullRequestRow({
  pr,
  metadata,
  onClick,
  t,
}: PullRequestRowProps): React.ReactElement {
  const stateLabel = getPrStateLabel(metadata.state, t);
  const stateClass =
    PR_STATE_COLORS[metadata.state] ?? 'bg-green-500/15 text-green-600 border-green-500/30';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-accent',
        metadata.isDraft && 'opacity-70',
      )}
    >
      <GitPullRequest
        className={cn(
          'mt-0.5 size-4 shrink-0',
          metadata.state === 'open' ? 'text-green-600' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {metadata.number !== null ? `#${String(metadata.number)} ` : ''}
            {pr.title}
          </span>
          <Badge variant="outline" className={`shrink-0 text-xs ${stateClass}`}>
            {stateLabel}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {t('source_control.pr.source_branch')}: {metadata.sourceBranch}
          </span>
          {metadata.sourceBranch.length > 0 && metadata.targetBranch.length > 0 && <span>→</span>}
          <span>{metadata.targetBranch}</span>
          {metadata.author.length > 0 && <span>· {metadata.author}</span>}
          {metadata.isDraft && (
            <Badge variant="secondary" className="text-xs">
              {t('source_control.pr.draft')}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
