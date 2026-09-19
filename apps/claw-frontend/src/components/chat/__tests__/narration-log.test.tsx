import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NarrationLog } from '@/components/chat/narration-log';
import { NarrationKind } from '@/enums/narration-kind.enum';
import type { NarrationEntry } from '@/types/narration.types';
import { getStoredNarration } from '@/utilities/narration.utility';

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key} ${JSON.stringify(params)}`;

const entry = (kind: NarrationKind, extra: Partial<NarrationEntry> = {}): NarrationEntry => ({
  id: `${kind}-${String(Math.random())}`,
  kind,
  at: '2026-09-19T10:00:00.000Z',
  ...extra,
});

describe('NarrationLog', () => {
  // The planner speaks in its own words; everything else is rendered from the
  // kind, so it reads in the user's language.
  it("shows the AI's own sentence verbatim and the rest through i18n", () => {
    render(
      <NarrationLog
        entries={[
          entry(NarrationKind.PLANNED, { text: "You shared a site, so I'll read it first." }),
          entry(NarrationKind.CRAWL_DONE, { params: { count: 14 } }),
          entry(NarrationKind.BACK_TO_AI),
        ]}
        isLive={false}
        t={t}
      />,
    );

    expect(screen.getByText("You shared a site, so I'll read it first.")).toBeInTheDocument();
    expect(screen.getByText('narration.crawlDone {"count":14}')).toBeInTheDocument();
    expect(screen.getByText('narration.backToAi')).toBeInTheDocument();
  });

  // The planner's thinking is stored with the answer, so the AI's own words
  // survive a refresh - not only a line saying it was thinking.
  it("shows the planner's thinking in the AI's voice", () => {
    render(
      <NarrationLog
        entries={[
          entry(NarrationKind.AI_THOUGHT, {
            text: 'They want the pricing explained, so the site comes first.',
          }),
        ]}
        isLive={false}
        t={t}
      />,
    );

    const line = screen.getByText('They want the pricing explained, so the site comes first.');
    expect(line).toHaveClass('italic');
  });

  // Open while the turn runs; collapsed once the answer is there, so the log
  // never stands between the reader and the reply.
  it('is open while live and collapsed once the answer is stored', () => {
    const { rerender } = render(
      <NarrationLog entries={[entry(NarrationKind.BACK_TO_AI)]} isLive t={t} />,
    );
    expect(screen.getByTestId('narration-log')).toHaveAttribute('open');

    rerender(<NarrationLog entries={[entry(NarrationKind.BACK_TO_AI)]} isLive={false} t={t} />);
    expect(screen.getByTestId('narration-log')).not.toHaveAttribute('open');
  });

  it('renders nothing for an answer that had no work log', () => {
    const { container } = render(<NarrationLog entries={[]} isLive={false} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('getStoredNarration', () => {
  it('reads the log stored on an answer', () => {
    const stored = [entry(NarrationKind.AI_THINKING, { params: { model: 'glm-5.2' } })];
    expect(getStoredNarration({ narration: stored })).toEqual(stored);
  });

  // Metadata is untyped JSON, and answers stored before this existed have none.
  it('tolerates missing or malformed metadata', () => {
    expect(getStoredNarration(null)).toEqual([]);
    expect(getStoredNarration({})).toEqual([]);
    expect(getStoredNarration({ narration: 'nope' })).toEqual([]);
    expect(getStoredNarration({ narration: [{ id: 'x', kind: 'unknown' }] })).toEqual([]);
  });
});
