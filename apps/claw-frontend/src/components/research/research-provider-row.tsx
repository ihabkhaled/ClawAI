'use client';

import { ShieldCheck, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { ResearchProviderRowProps } from '@/types';

export function ResearchProviderRow({
  provider,
  onTest,
  onDelete,
  isTestPending,
  isDeletePending,
}: ResearchProviderRowProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <tr className="touch:block touch:rounded-lg touch:border border-t">
      <td
        data-label={t('research.providers.col.name')}
        className="touch:before:text-muted-foreground touch:flex touch:items-center touch:justify-between touch:gap-3 touch:before:text-xs touch:before:font-normal touch:before:content-[attr(data-label)] px-3 py-2 text-sm font-medium"
      >
        {provider.name}
      </td>
      <td
        data-label={t('research.providers.col.kind')}
        className="touch:before:text-muted-foreground touch:flex touch:items-center touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        <Badge variant="outline">{provider.kind}</Badge>
      </td>
      <td
        data-label={t('research.providers.col.baseUrl')}
        className="text-muted-foreground touch:grid touch:grid-cols-[auto_minmax(0,1fr)] touch:gap-3 touch:text-end touch:before:text-start touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm break-all"
      >
        {provider.baseUrl}
      </td>
      <td
        data-label={t('research.providers.col.status')}
        className="touch:before:text-muted-foreground touch:flex touch:items-center touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        <Badge variant={provider.enabled ? 'default' : 'secondary'}>{provider.status}</Badge>
      </td>
      <td
        data-label={t('research.providers.col.secret')}
        className="text-muted-foreground touch:flex touch:items-center touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {provider.hasSecret ? t('research.providers.secretStored') : '—'}
      </td>
      <td
        data-label={t('research.providers.col.actions')}
        className="touch:block touch:border-t px-3 py-2 text-right"
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isTestPending}
            onClick={() => onTest(provider.id)}
          >
            <ShieldCheck className="size-4" />
            {t('research.providers.test')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeletePending}
            onClick={() => onDelete(provider.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
