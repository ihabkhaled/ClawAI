import { DeploymentRunStatus } from '@claw/shared-types';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DeploymentRunStepRowProps } from '@/types/deployment-page.types';
import {
  runConclusionVariant,
  runStateKey,
  runStepIcon,
  runToneClass,
} from '@/utilities/deployment-run.utility';

export function DeploymentRunStepRow({ t, step }: DeploymentRunStepRowProps): React.ReactElement {
  const variant = runConclusionVariant(step.status, step.conclusion);
  const isRunning = step.status === DeploymentRunStatus.IN_PROGRESS;
  const Icon = runStepIcon(step.status, variant);

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2',
        isRunning && 'border-info/40 bg-info-surface border',
      )}
      aria-current={isRunning ? 'step' : undefined}
    >
      <Icon
        className={cn('h-4 w-4 shrink-0', runToneClass(variant), isRunning && 'animate-spin')}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate text-sm">{step.name}</span>
      <Badge variant={variant} className="shrink-0 text-xs">
        {t(runStateKey(step.status, step.conclusion))}
      </Badge>
    </li>
  );
}
