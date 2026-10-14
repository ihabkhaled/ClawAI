/**
 * The `data:` payloads of a server-sent-events body, one string per event. Handles LF, CRLF and
 * CR line ends and multi-line data fields. Comments, ids, retry hints and event names are ignored.
 * A trailing event the server never finished (no blank line yet) is returned too, because some
 * servers close the stream right after the last event.
 */
export function parseSseEvents(body: string): string[] {
  const events: string[] = [];
  let current: string[] = [];
  const flush = (): void => {
    if (current.length > 0) events.push(current.join('\n'));
    current = [];
  };
  for (const rawLine of body.split(/\r\n|\n|\r/)) {
    if (rawLine === '') {
      flush();
    } else if (rawLine.startsWith('data:')) {
      const value = rawLine.slice(5);
      current.push(value.startsWith(' ') ? value.slice(1) : value);
    }
  }
  flush();
  return events;
}
