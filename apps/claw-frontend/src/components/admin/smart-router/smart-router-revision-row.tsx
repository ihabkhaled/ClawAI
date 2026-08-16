import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { SMART_ROUTER_MODE_LABEL_KEYS } from '@/constants/smart-router-admin.constants';
import { cn } from '@/lib/utils';
import type { SmartRouterRevisionRowProps } from '@/types/smart-router-admin.types';
import { formatOptionalIsoDate } from '@/utilities';

import { SmartRouterStatusBadge } from './smart-router-status-badge';

export function SmartRouterRevisionRow({
  revision,
  isSelected,
  onSelect,
  t,
}: SmartRouterRevisionRowProps): React.ReactElement {
  return (
    <TableRow
      className={cn(isSelected && 'bg-muted/50')}
      data-state={isSelected ? 'selected' : undefined}
    >
      <TableCell className="font-medium">#{revision.revision}</TableCell>
      <TableCell>
        <SmartRouterStatusBadge status={revision.status} t={t} />
      </TableCell>
      <TableCell>{t(SMART_ROUTER_MODE_LABEL_KEYS[revision.mode])}</TableCell>
      <TableCell>{revision.entryCount}</TableCell>
      <TableCell>{formatOptionalIsoDate(revision.publishedAt)}</TableCell>
      <TableCell className="text-right">
        <Button type="button" variant="outline" size="sm" onClick={() => onSelect(revision.id)}>
          {t('smartRouterAdmin.revisions.view')}
        </Button>
      </TableCell>
    </TableRow>
  );
}
