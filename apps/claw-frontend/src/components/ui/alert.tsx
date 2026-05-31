import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { AlertVariant } from '@/enums/alert-variant.enum';
import { cn } from '@/lib/utils';
import type { AlertProps } from '@/types/component.types';

// Variant → root container styling. Each entry pairs a semantic background
// tint (low-opacity hsl token) with a matching border and a foreground tone
// for the title row. Body copy stays on the default `text-foreground` so it
// keeps maximum legibility on both light and dark surfaces.
const VARIANT_CLASSES: Record<AlertVariant, string> = {
  [AlertVariant.Default]:
    'border-border bg-surface-panel text-foreground',
  [AlertVariant.Info]:
    'border-info/30 bg-info/10 text-foreground [&_[data-alert-title]]:text-info',
  [AlertVariant.Success]:
    'border-success/30 bg-success/10 text-foreground [&_[data-alert-title]]:text-success',
  [AlertVariant.Warning]:
    'border-warning/30 bg-warning/10 text-foreground [&_[data-alert-title]]:text-warning',
  [AlertVariant.Error]:
    'border-destructive/30 bg-destructive/10 text-foreground [&_[data-alert-title]]:text-destructive',
};

// Default icon per variant. Callers can pass an explicit `icon` prop to
// override (e.g. a domain-specific lucide icon).
const DEFAULT_ICONS: Record<AlertVariant, LucideIcon | null> = {
  [AlertVariant.Default]: null,
  [AlertVariant.Info]: Info,
  [AlertVariant.Success]: CheckCircle2,
  [AlertVariant.Warning]: AlertTriangle,
  [AlertVariant.Error]: XCircle,
};

const VARIANT_TO_ROLE: Record<AlertVariant, 'status' | 'alert'> = {
  [AlertVariant.Default]: 'status',
  [AlertVariant.Info]: 'status',
  [AlertVariant.Success]: 'status',
  [AlertVariant.Warning]: 'alert',
  [AlertVariant.Error]: 'alert',
};

export function Alert({
  variant = AlertVariant.Default,
  icon: IconOverride,
  title,
  description,
  action,
  className,
}: AlertProps): React.ReactElement {
  const Icon = IconOverride ?? DEFAULT_ICONS[variant] ?? AlertCircle;
  const showIcon = IconOverride !== undefined || DEFAULT_ICONS[variant] !== null;

  return (
    <div
      role={VARIANT_TO_ROLE[variant]}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 text-sm',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {showIcon ? (
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        {title !== undefined && title.length > 0 ? (
          <div data-alert-title className="font-medium leading-snug">
            {title}
          </div>
        ) : null}
        {description ? (
          <div className="text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
