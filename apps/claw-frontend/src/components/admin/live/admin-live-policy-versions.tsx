import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AdminLiveSectionProps } from '@/types/live-admin.types';
import { formatLiveDate } from '@/utilities/live-request.utility';

/** Every policy version, newest first; rolling back creates a new version (confirmed first). */
export function AdminLivePolicyVersions({ controller }: AdminLiveSectionProps): React.ReactElement {
  const { t, locale } = controller;
  const versions = controller.policy?.versions ?? [];
  return (
    <section aria-labelledby="admin-live-versions" className="flex flex-col gap-3">
      <h2 id="admin-live-versions" className="text-foreground text-base font-semibold">
        {t('live.admin.versionsTitle')}
      </h2>
      <ul className="flex flex-col gap-2" data-testid="admin-live-versions">
        {versions.map((entry) => (
          <li
            key={entry.version}
            className="border-border bg-card flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-foreground flex items-center gap-2 text-sm font-medium">
                {t('live.admin.versionLabel', { version: entry.version })}
                {entry.active ? (
                  <Badge variant="success">{t('live.admin.activeVersion')}</Badge>
                ) : null}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatLiveDate(entry.createdAt, locale)}
                {entry.note ? ` · ${entry.note}` : ''}
              </p>
            </div>
            {entry.active ? null : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => controller.askRollback(entry.version)}
              >
                {t('live.admin.rollback')}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={controller.rollbackVersion !== null}
        onOpenChange={(open) => (open ? undefined : controller.askRollback(null))}
        title={t('live.admin.rollbackTitle')}
        description={t('live.admin.rollbackDescription')}
        confirmLabel={t('live.admin.rollback')}
        cancelLabel={t('live.admin.cancel')}
        onConfirm={controller.confirmRollback}
        destructive={false}
        isConfirming={controller.isRollingBack}
      />
    </section>
  );
}
