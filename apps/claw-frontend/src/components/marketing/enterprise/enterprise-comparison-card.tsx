'use client';

import { Check } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { EnterpriseComparisonCardProps } from '@/types/marketing-enterprise.types';

export function EnterpriseComparisonCard({
  column,
}: EnterpriseComparisonCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'border-border bg-card flex flex-col rounded-lg border p-6',
        column.isFeatured && 'border-primary ring-primary/30 shadow-sm ring-1',
      )}
    >
      <span
        className={cn(
          'mb-3 self-start rounded-full px-2.5 py-0.5 text-xs font-medium',
          column.isFeatured
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {t(column.badgeKey)}
      </span>

      <h3 className="text-foreground text-lg font-semibold">{t(column.titleKey)}</h3>
      <p className="text-muted-foreground mt-1 text-sm">{t(column.subtitleKey)}</p>

      <ul className="mt-5 flex-1 space-y-2">
        {column.pointKeys.map((key) => (
          <li key={key} className="text-muted-foreground flex gap-2 text-sm">
            <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
