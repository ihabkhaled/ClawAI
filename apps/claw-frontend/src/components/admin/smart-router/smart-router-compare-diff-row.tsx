import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  SMART_ROUTER_DIFF_STATUS_BADGE_VARIANT,
  SMART_ROUTER_DIFF_STATUS_LABEL_KEYS,
  SMART_ROUTER_PROVIDER_LABEL_KEYS,
} from '@/constants/smart-router-admin.constants';
import type { SmartRouterCompareDiffRowProps } from '@/types/smart-router-admin.types';

export function SmartRouterCompareDiffRow({
  diffItem,
  t,
}: SmartRouterCompareDiffRowProps): React.ReactElement {
  const { order, status, before, after, changedFields } = diffItem;
  const displayed = after ?? before;

  return (
    <TableRow>
      <TableCell className="text-muted-foreground text-xs">#{order}</TableCell>
      <TableCell>
        <Badge variant={SMART_ROUTER_DIFF_STATUS_BADGE_VARIANT[status]}>
          {t(SMART_ROUTER_DIFF_STATUS_LABEL_KEYS[status])}
        </Badge>
      </TableCell>
      <TableCell>
        {displayed ? (
          <div>
            <p className="text-sm font-medium">{displayed.modelAlias}</p>
            <p className="text-muted-foreground text-xs">
              {t(SMART_ROUTER_PROVIDER_LABEL_KEYS[displayed.provider])}
            </p>
          </div>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {changedFields.length > 0
          ? `${t('smartRouterAdmin.compare.changedFieldsLabel')}: ${changedFields.join(', ')}`
          : '—'}
      </TableCell>
    </TableRow>
  );
}
