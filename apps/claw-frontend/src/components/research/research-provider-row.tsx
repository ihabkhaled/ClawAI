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
    <tr className="border-t">
      <td className="px-3 py-2 text-sm font-medium">{provider.name}</td>
      <td className="px-3 py-2 text-sm">
        <Badge variant="outline">{provider.kind}</Badge>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{provider.baseUrl}</td>
      <td className="px-3 py-2 text-sm">
        <Badge variant={provider.enabled ? 'default' : 'secondary'}>{provider.status}</Badge>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {provider.hasSecret ? t('research.providers.secretStored') : '—'}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
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
