import {
  MS_PER_SECOND,
  REPORT_CLOCK_PART,
  REPORT_DEFAULT_SECTION_LABELS,
  REPORT_MOMENT_EVERY_SECONDS,
  REPORT_SECTION_LABELS,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from '../constants/processing.constants';
import type {
  ReportContent,
  ReportMoment,
  ReportSectionLabels,
  ReportWindow,
  TranscriptLine,
} from '../types/processing.types';
import { sanitizeStreamText } from './stream-prompt.utility';

/** `m:ss` under an hour, `h:mm:ss` above. */
export function formatVideoClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const rest = String(seconds % SECONDS_PER_MINUTE).padStart(2, '0');
  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, '0')}:${rest}`
    : `${String(minutes)}:${rest}`;
}

/** `0:44`, `12:05` or `1:02:03` to seconds; anything else is null. */
export function parseVideoClock(value: string): number | null {
  const parts = value.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((part) => REPORT_CLOCK_PART.test(part))) return null;
  const [seconds = 0, minutes = 0, hours = 0] = [...parts].reverse().map(Number);
  const valid =
    seconds < SECONDS_PER_MINUTE && (parts.length === 2 || minutes < SECONDS_PER_MINUTE);
  return valid ? hours * SECONDS_PER_HOUR + minutes * SECONDS_PER_MINUTE + seconds : null;
}

/** Seconds of a media time from the video start. */
export function videoSeconds(at: number, originMs: number): number {
  return Math.max(0, Math.floor((at - originMs) / MS_PER_SECOND));
}

/** The transcript cut into consecutive parts of `windowMs` of video time (empty parts skipped). */
export function reportWindows(
  lines: readonly TranscriptLine[],
  originMs: number,
  windowMs: number,
): ReportWindow[] {
  const windowSeconds = Math.floor(windowMs / MS_PER_SECOND);
  const byIndex = new Map<number, TranscriptLine[]>();
  for (const line of lines) {
    const index = Math.floor(videoSeconds(line.startAt, originMs) / windowSeconds);
    byIndex.set(index, [...(byIndex.get(index) ?? []), line]);
  }
  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, part]) => ({
      fromSeconds: index * windowSeconds,
      // A part ends where its speech ends, so no moment is placed after the end of the video.
      toSeconds: Math.min(
        (index + 1) * windowSeconds,
        Math.max(...part.map((line) => videoSeconds(line.endAt, originMs))),
      ),
      lines: part,
    }));
}

/** `[start-end] text` lines in video time: a 30 s summary piece is one line, so the span matters. */
export function formatReportTranscript(lines: readonly TranscriptLine[], originMs: number): string {
  return lines
    .map(
      (line) =>
        `[${formatVideoClock(videoSeconds(line.startAt, originMs))}-${formatVideoClock(videoSeconds(line.endAt, originMs))}] ${sanitizeStreamText(line.text)}`,
    )
    .join('\n');
}

/** Reply moments with a readable time inside the part, in time order, one per second at most. */
export function momentsInWindow(
  moments: readonly { at: string; text: string }[],
  window: { fromSeconds: number; toSeconds: number },
): ReportMoment[] {
  const seen = new Set<number>();
  return moments
    .flatMap((moment) => {
      const atSeconds = parseVideoClock(moment.at);
      const inside =
        atSeconds !== null && atSeconds >= window.fromSeconds && atSeconds <= window.toSeconds;
      return inside ? [{ atSeconds, text: moment.text.trim() }] : [];
    })
    .sort((a, b) => a.atSeconds - b.atSeconds)
    .filter((moment) => !seen.has(moment.atSeconds) && seen.add(moment.atSeconds) !== undefined);
}

function sectionLabels(language: string | null): ReportSectionLabels {
  const base = (language ?? '').toLowerCase().split('-')[0] ?? '';
  const labels = new Map(Object.entries(REPORT_SECTION_LABELS));
  return labels.get(base) ?? REPORT_DEFAULT_SECTION_LABELS;
}

function timedLines(items: readonly ReportMoment[], separator: string): string[] {
  return items.map((item) => `${formatVideoClock(item.atSeconds)}${separator}${item.text}`);
}

/** The plain-text body of the report: summary, chapters, moment by moment, key quotes. */
export function renderReportBody(content: ReportContent, language: string | null): string {
  const labels = sectionLabels(language);
  const sections = [[labels.summary, content.summary]];
  if (content.chapters.length > 0) {
    sections.push([labels.chapters, timedLines(content.chapters, ' ').join('\n')]);
  }
  sections.push([labels.moments, timedLines(content.moments, ' — ').join('\n')]);
  if (content.quotes.length > 0) {
    const quoted = content.quotes.map((quote) => ({ ...quote, text: `“${quote.text}”` }));
    sections.push([labels.quotes, timedLines(quoted, ' ').join('\n')]);
  }
  return sections.map(([title, body]) => `${title ?? ''}\n${body ?? ''}`).join('\n\n');
}

/** One moment per REPORT_MOMENT_EVERY_SECONDS of the part, at least one. */
export function momentsWanted(window: { fromSeconds: number; toSeconds: number }): number {
  return Math.max(
    1,
    Math.ceil((window.toSeconds - window.fromSeconds) / REPORT_MOMENT_EVERY_SECONDS),
  );
}
