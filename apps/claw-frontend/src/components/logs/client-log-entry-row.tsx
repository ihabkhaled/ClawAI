import { useToggle } from '@/hooks/common/use-toggle';
import { Badge } from '@/components/ui/badge';
import { LOG_LEVEL_COLORS } from '@/constants';
import type { LogLevel } from '@/enums';
import type { ClientLogEntry } from '@/types';

type ClientLogEntryRowProps = {
  entry: ClientLogEntry;
};

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
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{new Date(entry.createdAt).toLocaleString()}</span>
            <span className="font-mono">{entry.component}</span>
            <span>{entry.action}</span>
            {entry.route ? <span className="font-mono">{entry.route}</span> : null}
            {entry.userId ? <span className="font-mono">{entry.userId}</span> : null}
          </div>
          {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
            <div className="mt-2">
              {isExpanded ? (
                <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-xs">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              ) : null}
              <button
                type="button"
                className="mt-1 text-xs text-primary underline"
                onClick={toggle}
              >
                {isExpanded ? 'Hide details' : 'Show details'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
