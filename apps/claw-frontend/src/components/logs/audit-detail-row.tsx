import { Button } from '@/components/ui/button';
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
      <span className="text-muted-foreground block max-w-[300px] truncate font-mono text-xs">
        {detailsStr}
      </span>
    );
  }

  return (
    <div className="max-w-[300px]">
      {isExpanded ? (
        <pre className="text-muted-foreground font-mono text-xs break-all whitespace-pre-wrap">
          {detailsStr}
        </pre>
      ) : (
        <span className="text-muted-foreground block truncate font-mono text-xs">
          {detailsStr.slice(0, 80)}...
        </span>
      )}
      <Button
        variant="unstyled"
        size="unstyled"
        type="button"
        className="text-primary mt-1 text-xs underline"
        onClick={toggle}
      >
        {isExpanded ? 'Collapse' : 'Expand'}
      </Button>
    </div>
  );
}
