import { Badge } from '@/components/ui/badge';
import {
  SMART_ROUTER_STATUS_BADGE_VARIANT,
  SMART_ROUTER_STATUS_LABEL_KEYS,
} from '@/constants/smart-router-admin.constants';
import type { SmartRouterStatusBadgeProps } from '@/types/smart-router-admin.types';

export function SmartRouterStatusBadge({
  status,
  t,
}: SmartRouterStatusBadgeProps): React.ReactElement {
  return (
    <Badge variant={SMART_ROUTER_STATUS_BADGE_VARIANT[status]}>
      {t(SMART_ROUTER_STATUS_LABEL_KEYS[status])}
    </Badge>
  );
}
