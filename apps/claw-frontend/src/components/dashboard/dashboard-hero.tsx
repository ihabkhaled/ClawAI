import { Sparkles } from 'lucide-react';

import { DASHBOARD_OPERATIONAL_STATE_STYLES } from '@/constants/dashboard-status-styles.constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DashboardHeroProps } from '@/types';

export function DashboardHero({
  greetingKey,
  greetingName,
  operationalState,
}: DashboardHeroProps): React.ReactElement {
  const { t } = useTranslation();
  const status = DASHBOARD_OPERATIONAL_STATE_STYLES[operationalState];

  // Trim and conditionally render the name so anonymous sessions or empty
  // usernames don't render "Good morning, !" with a stray comma.
  const name = greetingName.trim();
  const headline = name.length > 0 ? `${t(greetingKey)}, ${name}` : t(greetingKey);

  return (
    <section
      className={cn(
        'relative mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-soft sm:p-8',
        // Brand gradient wash — radial blob in the top-right that fades into
        // the card surface. Same primary→purple ramp as --gradient-brand.
        "before:absolute before:inset-0 before:pointer-events-none before:bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_55%)]",
      )}
      aria-label={t(greetingKey)}
    >
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium uppercase tracking-wider">ClawAI</span>
          </div>
          <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl">{headline}</h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            {t('dashboard.heroSubtitle')}
          </p>
        </div>

        <div
          role="status"
          aria-live="polite"
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-full border px-3 text-xs font-medium sm:self-center sm:text-sm',
            status.pill,
          )}
        >
          <span className="relative inline-flex h-2.5 w-2.5">
            <span
              aria-hidden="true"
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                status.dot,
              )}
            />
            <span
              aria-hidden="true"
              className={cn('relative inline-flex h-2.5 w-2.5 animate-pulse rounded-full', status.dot)}
            />
          </span>
          {t(status.labelKey)}
        </div>
      </div>
    </section>
  );
}
