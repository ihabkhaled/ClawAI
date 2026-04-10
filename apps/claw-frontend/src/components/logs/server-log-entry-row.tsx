import { useToggle } from '@/hooks/common/use-toggle';
import { Badge } from '@/components/ui/badge';
import { LOG_LEVEL_COLORS } from '@/constants';
import type { LogLevel } from '@/enums';
import type { ServerLogEntry } from '@/types';

type ServerLogEntryRowProps = {
  entry: ServerLogEntry;
};

export function ServerLogEntryRow({ entry }: ServerLogEntryRowProps): React.ReactElement {
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
            {entry.statusCode ? (
              <Badge variant="outline" className="text-xs">
                {entry.statusCode}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{new Date(entry.createdAt).toLocaleString()}</span>
            <span className="font-mono">{entry.serviceName}</span>
            {entry.controller ? <span>{entry.controller}</span> : null}
            {entry.action ? <span>{entry.action}</span> : null}
            {entry.method && entry.route ? (
              <span className="font-mono">
                {entry.method} {entry.route}
              </span>
            ) : null}
            {entry.latencyMs ? <span>{entry.latencyMs}ms</span> : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {entry.requestId ? (
              <span className="font-mono">req: {entry.requestId.slice(0, 8)}</span>
            ) : null}
            {entry.traceId ? (
              <span className="font-mono">trace: {entry.traceId.slice(0, 8)}</span>
            ) : null}
            {entry.userId ? (
              <span className="font-mono">user: {entry.userId.slice(0, 8)}</span>
            ) : null}
            {entry.errorCode ? (
              <span className="text-destructive">{entry.errorCode}</span>
            ) : null}
          </div>
          {entry.errorMessage ? (
            <p className="mt-1 text-xs text-destructive">{entry.errorMessage}</p>
          ) : null}
          <div className="mt-2">
            {isExpanded ? (
              <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-xs">
                {JSON.stringify(
                  {
                    provider: entry.provider || undefined,
                    model: entry.model || undefined,
                    connectorId: entry.connectorId || undefined,
                    threadId: entry.threadId || undefined,
                    metadata: entry.metadata,
                  },
                  null,
                  2,
                )}
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
        </div>
      </div>
    </div>
  );
}
