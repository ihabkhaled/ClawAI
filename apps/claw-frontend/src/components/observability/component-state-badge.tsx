import { COMPONENT_STATE_APPEARANCE } from '@/constants/service-status.constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ComponentStateBadgeProps } from '@/types';

/** A state as text, with an icon and colour that repeat it — never colour alone. */
export function ComponentStateBadge({ state }: ComponentStateBadgeProps) {
  const { t } = useTranslation();
  const appearance = COMPONENT_STATE_APPEARANCE[state];
  const Icon = appearance.icon;

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-sm font-medium', appearance.className)}
      data-state={state}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {t(appearance.labelKey)}
    </span>
  );
}
