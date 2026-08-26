import { LifeBuoy } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DeploymentTroubleshootingCardProps } from '@/types/deployment-page.types';
import {
  resolveTroubleshootingSituation,
  troubleshootingSteps,
} from '@/utilities/deployment-troubleshooting.utility';

/**
 * What to do next, in order, for the situation the deployment is actually in.
 * Rendered only when something is wrong — a healthy pipeline needs no advice.
 */
export function DeploymentTroubleshootingCard({
  t,
  status,
  progress,
}: DeploymentTroubleshootingCardProps): React.ReactElement | null {
  const run = progress.progress?.run ?? null;
  const situation = resolveTroubleshootingSituation(
    status,
    run?.status ?? null,
    run?.conclusion ?? null,
  );
  if (situation === null) {
    return null;
  }

  return (
    <Card className="border-warning/30">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <LifeBuoy className="text-warning h-4 w-4" aria-hidden="true" />
          {t(`adminDeployment.troubleshooting.${situation}.title`)}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          {t(`adminDeployment.troubleshooting.${situation}.description`)}
        </p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {troubleshootingSteps(situation).map((step, index) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {index + 1}
              </span>
              <span className="pt-0.5">{t(`adminDeployment.troubleshootingStep.${step}`)}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
