import { useTranslation } from '@/lib/i18n';
import type { UsageChartProps } from '@/types';

export function UsageChart({ title, items, valueLabel, secondaryLabel }: UsageChartProps) {
  const { t } = useTranslation();
  const maxValue = Math.max(...items.map((i) => i.value), 1);
  const resolvedValueLabel = valueLabel ?? t('observability.requests');

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('observability.noData')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">{item.label}</span>
                <span className="ms-2 shrink-0 text-muted-foreground">
                  {item.value} {resolvedValueLabel}
                  {secondaryLabel && item.secondaryValue !== undefined
                    ? ` / ${item.secondaryValue.toLocaleString()} ${secondaryLabel}`
                    : null}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.max((item.value / maxValue) * 100, 2)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
