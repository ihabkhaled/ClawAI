import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Placeholder for an open conversation: alternating assistant (left) / user
// (right) message bubbles, so the thread view doesn't flash an empty pane
// before the first page of messages arrives.
export function ThreadMessagesSkeleton({
  bubbles = 4,
  className,
}: { bubbles?: number; className?: string } = {}): React.ReactElement {
  const rows = Array.from({ length: Math.max(1, bubbles) }, (_v, i) => i);
  return (
    <div className={cn('space-y-4 p-4', className)} role="status" aria-busy="true">
      {rows.map((i) => {
        const isUser = i % 2 === 1;
        return (
          <div key={i} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'space-y-2 rounded-2xl p-3',
                isUser ? 'w-2/3 bg-primary/10' : 'w-4/5 bg-muted',
              )}
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
