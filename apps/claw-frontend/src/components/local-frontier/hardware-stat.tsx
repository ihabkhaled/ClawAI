'use client';

import type { LucideIcon } from 'lucide-react';

interface HardwareStatProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

export function HardwareStat({ icon: Icon, label, value }: HardwareStatProps): React.ReactElement {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-background/50 p-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="truncate text-sm font-medium text-foreground" title={value}>
          {value}
        </span>
      </div>
    </div>
  );
}
