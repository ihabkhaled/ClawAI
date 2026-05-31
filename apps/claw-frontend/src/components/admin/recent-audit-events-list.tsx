import { Badge } from '@/components/ui/badge';
import { SEVERITY_COLORS } from '@/constants';
import type { AuditSeverity } from '@/enums';
import type { RecentAuditEventsListProps } from '@/types';

// Inner list-only render — kept separate so the parent
// RecentAuditEvents component can use a single ternary chain for
// loading/error/empty states without nesting (ESLint
// no-nested-ternary). Pure render, no state, no hooks.
export function RecentAuditEventsList({
  events,
}: RecentAuditEventsListProps): React.ReactElement {
  return (
    <ul className="divide-y divide-border">
      {events.map((event) => (
        <li key={event._id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <Badge variant="outline" className="w-fit shrink-0">
              {event.action}
            </Badge>
            <span className="truncate text-sm text-muted-foreground">
              {event.entityType ?? '-'}
              {event.entityId ? (
                <span className="ms-1 font-mono text-xs">{event.entityId.slice(0, 8)}</span>
              ) : null}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge
              variant="outline"
              className={SEVERITY_COLORS[event.severity as AuditSeverity] ?? ''}
            >
              {event.severity}
            </Badge>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {new Date(event.createdAt).toLocaleString()}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
