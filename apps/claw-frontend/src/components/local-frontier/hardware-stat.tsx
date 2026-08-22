'use client';

import type { HardwareStatProps } from '@/types/local-frontier-ui.types';

export function HardwareStat({ icon: Icon, label, value }: HardwareStatProps): React.ReactElement {
  return (
    <div className="border-border bg-background/50 flex items-start gap-2 rounded-md border p-2">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col">
        <span className="touch:text-xs text-muted-foreground text-[10px] tracking-wide uppercase">
          {label}
        </span>
        <span className="text-foreground truncate text-sm font-medium" title={value}>
          {value}
        </span>
      </div>
    </div>
  );
}
