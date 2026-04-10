import { useToggle } from '@/hooks/common/use-toggle';
import type { AuditDetailRowProps } from '@/types';

export function AuditDetailRow({ row }: AuditDetailRowProps): React.ReactElement {
  const { isOpen: isExpanded, toggle } = useToggle();

  if (!row.details) {
    return <span className="text-muted-foreground">-</span>;
  }

  const detailsStr = JSON.stringify(row.details, null, 2);
  const isLong = detailsStr.length > 80;

  if (!isLong) {
    return (
      <span className="block max-w-[300px] truncate font-mono text-xs text-muted-foreground">
        {detailsStr}
      </span>
    );
  }

  return (
    <div className="max-w-[300px]">
      {isExpanded ? (
        <pre className="whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">
          {detailsStr}
        </pre>
      ) : (
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {detailsStr.slice(0, 80)}...
        </span>
      )}
      <button
        type="button"
        className="mt-1 text-xs text-primary underline"
        onClick={toggle}
      >
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
  );
}
