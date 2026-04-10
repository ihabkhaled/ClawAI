import { HealthStatus, ServiceStatus } from '@/enums';
import { cn } from '@/lib/utils';
import type { HealthCardContentProps } from '@/types';
import { getHealthStatusColor } from '@/utilities';

export function HealthCardContent({
  isLoading,
  isError,
  health,
  t,
}: HealthCardContentProps): React.ReactElement {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('admin.checkingServices')}</p>;
  }

  if (isError || !health) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('admin.healthUnreachable')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {health.services.map((svc) => (
        <div key={svc.name} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                getHealthStatusColor(svc.status === ServiceStatus.UP ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY),
              )}
            />
            <span>{svc.name}</span>
          </div>
          <span className="text-muted-foreground">
            {svc.responseTimeMs !== null ? `${String(svc.responseTimeMs)}ms` : 'down'}
          </span>
        </div>
      ))}
    </div>
  );
}
