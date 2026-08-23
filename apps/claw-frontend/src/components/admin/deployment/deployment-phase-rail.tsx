import { Check, CircleDotDashed } from 'lucide-react';

import { DEPLOYMENT_PHASES } from '@/constants/deployment.constants';
import { cn } from '@/lib/utils';
import type { DeploymentPhaseRailProps } from '@/types/deployment-page.types';

export function DeploymentPhaseRail({ status, t }: DeploymentPhaseRailProps): React.ReactElement {
  const activeIndex = DEPLOYMENT_PHASES.findIndex((phase) => phase === status.phase);

  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-4 xl:grid-cols-8">
      {DEPLOYMENT_PHASES.map((phase, index) => {
        const isComplete = status.state === 'completed' || index < activeIndex;
        const isActive = index === activeIndex && status.state === 'running';
        return (
          <li
            key={phase}
            className={cn(
              'border-border/70 bg-muted/20 flex min-h-20 flex-col justify-between rounded-lg border p-3',
              isActive && 'border-primary/50 bg-primary/5 shadow-sm',
              isComplete && 'border-success/30 bg-success-surface/40',
            )}
            aria-current={isActive ? 'step' : undefined}
          >
            {isComplete ? (
              <Check className="text-success h-4 w-4" aria-hidden="true" />
            ) : (
              <CircleDotDashed
                className={cn('text-muted-foreground h-4 w-4', isActive && 'text-primary')}
                aria-hidden="true"
              />
            )}
            <span className="mt-3 text-xs font-medium">{t(`adminDeployment.phase.${phase}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}
