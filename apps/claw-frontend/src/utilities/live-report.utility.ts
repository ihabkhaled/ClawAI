import {
  LIVE_REPORT_CLOCK,
  LIVE_REPORT_CLOCK_LINE,
  LIVE_REPORT_MOMENT_DASH,
  LIVE_REPORT_SECTION_BREAK,
} from '@/constants/live.constants';
import type { LiveReportLine, LiveReportSection } from '@/types/live.types';

function reportLine(line: string): LiveReportLine {
  const match = LIVE_REPORT_CLOCK_LINE.exec(line.trim());
  const clock = match?.[1] ?? '';
  if (!match || !LIVE_REPORT_CLOCK.test(clock)) {
    return { clock: null, text: line.trim() };
  }
  const text = (match[2] ?? '').trim();
  return {
    clock,
    text: text.startsWith(LIVE_REPORT_MOMENT_DASH)
      ? text.slice(LIVE_REPORT_MOMENT_DASH.length)
      : text,
  };
}

/**
 * The video report body (sections split by a blank line, the first line of each is its heading)
 * as sections of timed lines. A block of one line reads as an untitled paragraph.
 */
export function parseLiveReportBody(body: string): LiveReportSection[] {
  return body
    .split(LIVE_REPORT_SECTION_BREAK)
    .map((block) => block.split('\n').filter((line) => line.trim() !== ''))
    .filter((lines) => lines.length > 0)
    .map(([title = '', ...lines]) =>
      lines.length === 0
        ? { title: '', lines: [reportLine(title)] }
        : { title: title.trim(), lines: lines.map(reportLine) },
    );
}
