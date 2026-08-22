import type { RuntimeProbeEventRowProps } from '@/types';

// Single row of the recent events table on a probe card. Renders the absolute
// timestamp, the event type/status string, the model id if present, and the
// duration in ms.
export function RuntimeProbeEventRow({ event }: RuntimeProbeEventRowProps): React.ReactElement {
  const isoTime = new Date(event.atMs).toISOString().slice(11, 19);
  return (
    <tr className="border-border/30 border-b last:border-b-0">
      <td className="touch:text-xs text-muted-foreground px-2 py-1 font-mono text-[11px]">
        {isoTime}
      </td>
      <td className="text-foreground px-2 py-1 text-xs">{event.type}</td>
      <td className="touch:text-xs text-muted-foreground px-2 py-1 font-mono text-[11px]">
        {event.modelId ?? '—'}
      </td>
      <td className="touch:text-xs text-muted-foreground px-2 py-1 text-right font-mono text-[11px]">
        {event.durationMs !== undefined ? `${event.durationMs}ms` : '—'}
      </td>
    </tr>
  );
}
