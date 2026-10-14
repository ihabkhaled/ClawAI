import {
  THREAD_SOURCE_MARKER_EXTRA_SPACES,
  THREAD_SOURCE_MARKER_GROUP,
  THREAD_SOURCE_MARKER_ID,
  THREAD_SOURCE_MARKER_RUN_CHARACTER,
  THREAD_SOURCE_MARKER_SEPARATOR,
} from '@/constants/thread-source-marker.constants';

/** A bracket run made only of 16-hex ids (one, a comma list or a nested list) becomes a space. */
function markerRunOrKept(run: string): string {
  const tokens = run.split(THREAD_SOURCE_MARKER_SEPARATOR).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => THREAD_SOURCE_MARKER_ID.test(token))
    ? ' '
    : run;
}

function stripMarkersInRun(run: string): string {
  const whole = markerRunOrKept(run);
  return whole === run ? run.replaceAll(THREAD_SOURCE_MARKER_GROUP, markerRunOrKept) : whole;
}

/**
 * Removes internal source markers such as `[2f25f199712eec3d]`, `[[id]]`, `[id1, id2]` and
 * `[[id1], [id2]]` from a published body. The reader only has numbered sources, so a hex marker
 * never resolves and would otherwise show as raw text. Numbered citations such as `[1]` and
 * ordinary bracketed text are kept.
 *
 * A linear scan, not one regex over the body: an unclosed `[` cannot make the cost grow with
 * the square of the length (ReDoS).
 */
export function stripUnresolvedSourceMarkers(text: string): string {
  let output = '';
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('[', index);
    if (open < 0) {
      output += text.slice(index);
      break;
    }
    output += text.slice(index, open);
    let runEnd = open + 1;
    while (runEnd < text.length && THREAD_SOURCE_MARKER_RUN_CHARACTER.test(text.charAt(runEnd))) {
      runEnd += 1;
    }
    const closeInRun = text.slice(open + 1, runEnd).lastIndexOf(']');
    if (closeInRun < 0) {
      output += text.slice(open, runEnd);
      index = runEnd;
    } else {
      const close = open + 1 + closeInRun;
      output += stripMarkersInRun(text.slice(open, close + 1));
      index = close + 1;
    }
  }
  return output.replaceAll(THREAD_SOURCE_MARKER_EXTRA_SPACES, ' ');
}
