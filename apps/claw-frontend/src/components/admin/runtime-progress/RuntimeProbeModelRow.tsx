import { Box } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RuntimeProbeModelRowProps } from '@/types';

// One row inside the collapsible models list on the probe card. Shows the
// model id, optional family/quantization metadata, and a "loaded" pill for
// the runtime's currently-active model.
export function RuntimeProbeModelRow({
  model,
  isActive,
}: RuntimeProbeModelRowProps): React.ReactElement {
  return (
    <li className="border-border/40 bg-background/40 flex items-center justify-between gap-2 rounded border px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Box className="text-muted-foreground h-3.5 w-3.5 flex-none" aria-hidden="true" />
        <span className="text-foreground truncate font-mono text-xs" title={model.id}>
          {model.id}
        </span>
      </div>
      <div className="flex flex-none items-center gap-1.5">
        {model.family !== undefined && model.family.length > 0 ? (
          <span className="touch:text-xs text-muted-foreground text-[10px]">{model.family}</span>
        ) : null}
        {model.quantization !== undefined && model.quantization.length > 0 ? (
          <span className="touch:text-xs text-muted-foreground text-[10px]">
            {model.quantization}
          </span>
        ) : null}
        <Badge
          variant="outline"
          className={cn(
            'touch:text-xs text-[10px]',
            isActive
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-border text-muted-foreground',
          )}
        >
          {isActive ? 'loaded' : 'idle'}
        </Badge>
      </div>
    </li>
  );
}
