import { Check } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import type { OrchestrationLabInfoProps } from '@/types';

// Rendered inside a lab page's empty state, below the generic EmptyState
// icon/title. Answers "what is this for and why would I use it" for a
// first-time visitor, since the header's one-line description alone left
// every lab reading as an unlabeled prompt box.
export function OrchestrationLabInfo({
  goal,
  benefits,
  t,
}: OrchestrationLabInfoProps): React.ReactElement {
  return (
    <Card className="mt-4 text-left">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div>
          <h4 className="text-foreground text-sm font-semibold">
            {t('orchestrationShell.goalLabel')}
          </h4>
          <p className="text-muted-foreground mt-1 text-sm">{goal}</p>
        </div>
        <div>
          <h4 className="text-foreground text-sm font-semibold">
            {t('orchestrationShell.benefitsLabel')}
          </h4>
          <ul className="mt-1 space-y-1.5">
            {benefits.map((benefit) => (
              <li key={benefit} className="text-muted-foreground flex items-start gap-2 text-sm">
                <Check className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
