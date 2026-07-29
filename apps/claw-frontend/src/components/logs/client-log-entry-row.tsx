import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LOG_LEVEL_COLORS } from '@/constants';
import type { LogLevel } from '@/enums';
import { useToggle } from '@/hooks/common/use-toggle';
import type { ClientLogEntryRowProps } from '@/types';

export function ClientLogEntryRow({ entry }: ClientLogEntryRowProps): React.ReactElement {
  const { isOpen: isExpanded, toggle } = useToggle();
  const levelColor = LOG_LEVEL_COLORS[entry.level as LogLevel] ?? '';

  return (
    <div className="border-b px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className={levelColor}>
          {entry.level}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{entry.message}</span>
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-3 text-xs">
            <span>{new Date(entry.createdAt).toLocaleString()}</span>
            <span className="font-mono">{entry.component}</span>
            <span>{entry.action}</span>
            {entry.route ? <span className="font-mono">{entry.route}</span> : null}
            {entry.userId ? <span className="font-mono">{entry.userId}</span> : null}
          </div>
          {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
            <div className="mt-2">
              {isExpanded ? (
                <pre className="bg-muted rounded p-2 font-mono text-xs break-all whitespace-pre-wrap">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              ) : null}
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                className="text-primary mt-1 text-xs underline"
                onClick={toggle}
              >
                {isExpanded ? 'Hide details' : 'Show details'}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
