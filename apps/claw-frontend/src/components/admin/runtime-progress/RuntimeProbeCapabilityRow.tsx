import { Check, X } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RuntimeProbeCapabilityRowProps } from '@/types';

// One row in the capabilities checklist. Renders an Icon (check or cross)
// plus the translated label. Kept colour-light so a long list of capabilities
// reads as a clean checklist, not a wall of green/red.
export function RuntimeProbeCapabilityRow({
  labelKey,
  enabled,
}: RuntimeProbeCapabilityRowProps): React.ReactElement {
  const { t } = useTranslation();
  const isOn = enabled === true;
  return (
    <li className="flex items-center gap-2 text-xs">
      {isOn ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
      ) : (
        <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      )}
      <span className={cn('text-foreground', isOn ? '' : 'text-muted-foreground line-through')}>
        {t(labelKey)}
      </span>
    </li>
  );
}
