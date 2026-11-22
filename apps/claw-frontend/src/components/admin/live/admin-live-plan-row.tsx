import { AdminLiveNumberField } from '@/components/admin/live/admin-live-number-field';
import { LivePlanField } from '@/enums/live.enum';
import type { AdminLivePlanRowProps } from '@/types/live-admin.types';

/** One plan's free minutes per month and paid price per minute. */
export function AdminLivePlanRow({
  row,
  label,
  invalidField,
  t,
  onChange,
}: AdminLivePlanRowProps): React.ReactElement {
  const prefix = `plans.${row.plan}.`;
  return (
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
      <p className="text-foreground text-sm font-medium">
        {t('live.admin.plan')}: {label}
      </p>
      <AdminLiveNumberField
        id={`admin-live-plan-${row.plan || 'default'}-free`}
        label={t('live.admin.freeMinutes')}
        value={row.freeMinutes}
        invalid={invalidField === `${prefix}${LivePlanField.FREE_MINUTES}`}
        onChange={(value) => onChange(row.plan, LivePlanField.FREE_MINUTES, value)}
      />
      <AdminLiveNumberField
        id={`admin-live-plan-${row.plan || 'default'}-paid`}
        label={t('live.admin.paidPerMinute')}
        value={row.paidUsdPerMinute}
        invalid={invalidField === `${prefix}${LivePlanField.PAID_USD_PER_MINUTE}`}
        onChange={(value) => onChange(row.plan, LivePlanField.PAID_USD_PER_MINUTE, value)}
      />
    </div>
  );
}
