import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PLUGIN_INSTALLED_SKELETON_KEYS } from '@/constants/plugin-installs.constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { AdminCurationListStateProps } from '@/types/plugin-admin-curation.types';

/** Loading, error and empty states shared by the four tabs; renders the children otherwise. */
export function AdminCurationListState({
  isLoading,
  isError,
  isEmpty,
  emptyKey,
  retry,
  t,
  children,
}: AdminCurationListStateProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4" role="status" aria-label={t('plugins.loading')}>
        {PLUGIN_INSTALLED_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="min-h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <Alert
        variant={AlertVariant.Error}
        title={t('pluginsInstall.admin.errorTitle')}
        description={t('pluginsInstall.admin.errorDescription')}
        action={
          <Button type="button" size="sm" variant="outline" onClick={retry}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }
  if (isEmpty) {
    return <p className="text-muted-foreground text-sm">{t(emptyKey)}</p>;
  }
  return <>{children}</>;
}
