import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_STAT_GRADIENT_STYLES } from '@/constants/dashboard.constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DashboardStatCardProps } from '@/types';

export function DashboardStatCard({
  card,
  isLoading,
}: DashboardStatCardProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = DASHBOARD_STAT_GRADIENT_STYLES[card.gradient];
  const Icon = card.icon;

  return (
    <Card
      variant="interactive"
      className="group relative overflow-hidden"
    >
      {/* Gradient overlay — radial blob anchored to the top-right corner. The
          `group-hover:opacity-100` lift gives the card a tactile reveal as
          the user hovers, complementing the Card variant="interactive" lift. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-normal ease-quint-out group-hover:opacity-100',
          styles.overlay,
        )}
      />

      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 p-4 pb-2 sm:p-6 sm:pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
          {t(card.label)}
        </CardTitle>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-normal ease-quint-out group-hover:scale-110',
            styles.iconBg,
          )}
        >
          <Icon className={cn('h-4 w-4', styles.iconText)} />
        </span>
      </CardHeader>
      <CardContent className="relative p-4 pt-0 sm:p-6 sm:pt-0">
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold tracking-tight sm:text-3xl">{card.value}</div>
        )}
      </CardContent>
    </Card>
  );
}
