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
    <li className="flex items-center justify-between gap-2 rounded border border-border/40 bg-background/40 px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Box className="h-3.5 w-3.5 flex-none text-muted-foreground" aria-hidden="true" />
        <span className="truncate font-mono text-xs text-foreground" title={model.id}>
          {model.id}
        </span>
      </div>
      <div className="flex flex-none items-center gap-1.5">
        {model.family !== undefined && model.family.length > 0 ? (
          <span className="text-[10px] text-muted-foreground">{model.family}</span>
        ) : null}
        {model.quantization !== undefined && model.quantization.length > 0 ? (
          <span className="text-[10px] text-muted-foreground">{model.quantization}</span>
        ) : null}
        <Badge
          variant="outline"
          className={cn(
            'text-[10px]',
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
