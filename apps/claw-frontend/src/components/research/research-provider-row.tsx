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
    <tr className="border-t max-md:block max-md:rounded-lg max-md:border">
      <td
        data-label={t('research.providers.col.name')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm font-medium max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:font-normal max-md:before:content-[attr(data-label)]"
      >
        {provider.name}
      </td>
      <td
        data-label={t('research.providers.col.kind')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        <Badge variant="outline">{provider.kind}</Badge>
      </td>
      <td
        data-label={t('research.providers.col.baseUrl')}
        className="text-muted-foreground px-3 py-2 text-sm break-all max-md:grid max-md:grid-cols-[auto_minmax(0,1fr)] max-md:gap-3 max-md:text-end max-md:before:text-start max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {provider.baseUrl}
      </td>
      <td
        data-label={t('research.providers.col.status')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        <Badge variant={provider.enabled ? 'default' : 'secondary'}>{provider.status}</Badge>
      </td>
      <td
        data-label={t('research.providers.col.secret')}
        className="text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {provider.hasSecret ? t('research.providers.secretStored') : '—'}
      </td>
      <td
        data-label={t('research.providers.col.actions')}
        className="px-3 py-2 text-right max-md:block max-md:border-t"
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
