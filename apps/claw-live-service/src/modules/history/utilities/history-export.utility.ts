import { LiveFeedEventKind } from '../../../generated/prisma';
import type { ExportDocument, HistoryEventView } from '../types/history.types';

function clock(ms: number): string {
  return new Date(ms).toISOString().slice(11, 19);
}

function range(event: HistoryEventView): string {
  return event.endAt !== null && event.endAt > event.startAt
    ? `${clock(event.startAt)}-${clock(event.endAt)}`
    : clock(event.startAt);
}

function header(doc: ExportDocument): string[] {
  const times = doc.events.map((event) => event.startAt);
  const span =
    times.length > 0
      ? `${new Date(Math.min(...times)).toISOString()} - ${new Date(Math.max(...times)).toISOString()}`
      : 'no cards recorded';
  const url = doc.sourceUrl ? ` (${doc.sourceUrl})` : '';
  return [
    `Source: ${doc.sourceKind}${url}`,
    `Viewing started: ${doc.startedAt.toISOString()}`,
    `Language: ${doc.language}`,
    `Time range: ${span}`,
  ];
}

function isHighlight(event: HistoryEventView): boolean {
  return event.kind === LiveFeedEventKind.HIGHLIGHT;
}

export function buildMarkdownExport(doc: ExportDocument): string {
  const lines = [
    `# ${doc.title ?? 'Live session'}`,
    '',
    ...header(doc).map((line) => `- ${line}`),
    '',
  ];
  for (const event of doc.events) {
    if (event.kind === LiveFeedEventKind.GAP) {
      lines.push(`> ${clock(event.startAt)} - not analyzed: playback jumped to the live edge`, '');
      continue;
    }
    const heading = isHighlight(event) ? `Highlight: ${event.title}` : event.title;
    lines.push(`## ${range(event)} ${heading}`, '', event.body, '');
  }
  if (doc.truncated) lines.push('_The export was cut at the maximum number of cards._', '');
  return lines.join('\n');
}

export function buildTextExport(doc: ExportDocument): string {
  const lines = [doc.title ?? 'Live session', '', ...header(doc), ''];
  for (const event of doc.events) {
    if (event.kind === LiveFeedEventKind.GAP) {
      lines.push(`[${clock(event.startAt)}] Not analyzed: playback jumped to the live edge`, '');
      continue;
    }
    const label = isHighlight(event) ? 'Highlight' : 'Card';
    lines.push(`[${range(event)}] ${label}: ${event.title}`, event.body, '');
  }
  if (doc.truncated) lines.push('The export was cut at the maximum number of cards.');
  return lines.join('\n');
}

/** A filename safe in a header: ascii letters, digits and dashes only. */
export function exportFileName(sessionId: string, extension: string): string {
  return `live-${sessionId.replaceAll(/[^a-zA-Z0-9-]/g, '')}.${extension}`;
}
