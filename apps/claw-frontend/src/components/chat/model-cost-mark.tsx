import {
  MODEL_COST_CLASS_HINT_KEYS,
  MODEL_COST_CLASS_LABEL_KEYS,
  MODEL_COST_CLASS_PIPS,
  MODEL_COST_CLASS_PIP_COUNT,
  MODEL_OUTSIDE_ALLOWANCE_HINT_KEY,
} from '@/constants/model-cost-class.constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { ModelCostMarkProps } from '@/types';
import { cn } from '@/utilities';

/**
 * Cost band mark on a model-picker row: pips plus a short band word, a tooltip and a
 * screen-reader name. Band only, never a rate. Logical spacing keeps it RTL-safe and the
 * token colours follow light/dark.
 */
export function ModelCostMark({
  costClass,
  outsideAllowance,
}: ModelCostMarkProps): React.ReactElement {
  const { t } = useTranslation();
  const label = t(MODEL_COST_CLASS_LABEL_KEYS[costClass]);
  const hint = t(MODEL_COST_CLASS_HINT_KEYS[costClass]);
  const title = outsideAllowance === true ? `${hint} ${t(MODEL_OUTSIDE_ALLOWANCE_HINT_KEY)}` : hint;
  const filled = MODEL_COST_CLASS_PIPS[costClass];

  return (
    <span
      title={title}
      className="border-border bg-muted text-muted-foreground touch:text-xs inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] leading-none"
      data-testid={`model-cost-mark-${costClass}`}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-px">
        {Array.from({ length: MODEL_COST_CLASS_PIP_COUNT }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              index < filled ? 'bg-foreground' : 'bg-border',
            )}
          />
        ))}
      </span>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{title}</span>
    </span>
  );
}
