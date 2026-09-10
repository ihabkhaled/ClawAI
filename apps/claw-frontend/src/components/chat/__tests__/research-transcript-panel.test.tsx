import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ResearchTranscriptPanel } from '@/components/chat/research-transcript-panel';
import type { ResearchTranscript } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>): string => {
      if (params === undefined) {
        return key;
      }
      const suffix = Object.entries(params)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(',');
      return `${key}(${suffix})`;
    },
  }),
}));

const populatedTranscript: ResearchTranscript = {
  searchRequestCount: 2,
  fetchRequestCount: 2,
  pagesRead: 1,
  linksFound: 2,
  sources: [
    {
      title: 'Anthropic launches new model',
      url: 'https://example.com/news/1',
      snippet: 'Anthropic announced its new model with improved reasoning.',
      score: 0.92,
      latencyMs: 410,
      extracted: 'Full article text goes here.',
    },
    {
      title: '',
      url: 'https://example.com/news/2',
      snippet: 'Second source snippet.',
    },
  ],
};

const emptyTranscript: ResearchTranscript = { sources: [] };

describe('ResearchTranscriptPanel', () => {
  it('renders nothing when there are no sources', () => {
    const { container } = render(<ResearchTranscriptPanel transcript={emptyTranscript} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a collapsed summary reporting PAGES READ, not links found', () => {
    render(<ResearchTranscriptPanel transcript={populatedTranscript} />);

    const toggle = screen.getByRole('button', { name: /research\.transcript\.pagesRead/ });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('research.transcript.searchRequests(count=2)')).toBeInTheDocument();
    expect(screen.getByText('research.transcript.fetchRequests(count=2)')).toBeInTheDocument();
    // Two links were found and one page was read. The badge used to report a
    // single number over the deduped MIX of both.
    expect(screen.getByText('research.transcript.linksFound(count=2)')).toBeInTheDocument();

    // Source list is hidden when collapsed.
    expect(screen.queryByText('Anthropic launches new model')).not.toBeInTheDocument();
  });

  it('toggles the source list open when clicked', () => {
    render(<ResearchTranscriptPanel transcript={populatedTranscript} />);

    const toggle = screen.getByRole('button', { name: /research\.transcript\.pagesRead/ });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Anthropic launches new model')).toBeInTheDocument();
    expect(
      screen.getByText('Anthropic announced its new model with improved reasoning.'),
    ).toBeInTheDocument();
    // Falls back to url when title is empty (appears in both the title span
    // and the link; we just assert that at least one occurrence exists).
    expect(screen.getAllByText('https://example.com/news/2').length).toBeGreaterThan(0);
  });

  it('renders score and latency when provided', () => {
    render(<ResearchTranscriptPanel transcript={populatedTranscript} />);
    fireEvent.click(screen.getByRole('button', { name: /research\.transcript\.pagesRead/ }));

    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('410ms')).toBeInTheDocument();
  });

  it('falls back to a neutral count on a message written before the counts existed', () => {
    // We genuinely do not know how many of these were read. Inventing the
    // stronger claim retroactively is the defect this replaces.
    const legacy: ResearchTranscript = {
      sources: populatedTranscript.sources,
    };
    render(<ResearchTranscriptPanel transcript={legacy} />);

    expect(
      screen.getByRole('button', { name: /research\.transcript\.sourcesCount/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/research\.transcript\.pagesRead/)).not.toBeInTheDocument();
  });

  it('hides the request badges entirely on a legacy message rather than showing zeros', () => {
    // They were hardcoded zeros, so the panel rendered "0 searches / 0 fetches"
    // directly under a source count. A missing badge is honest; a zero is not.
    const legacy: ResearchTranscript = { sources: populatedTranscript.sources };
    render(<ResearchTranscriptPanel transcript={legacy} />);

    expect(screen.queryByText(/research\.transcript\.searchRequests/)).not.toBeInTheDocument();
    expect(screen.queryByText(/research\.transcript\.fetchRequests/)).not.toBeInTheDocument();
  });

  it('reports zero pages read when nothing was actually opened', () => {
    // The exact reported contradiction: four links discovered, none read.
    const nothingRead: ResearchTranscript = {
      ...populatedTranscript,
      pagesRead: 0,
      linksFound: 4,
    };
    render(<ResearchTranscriptPanel transcript={nothingRead} />);

    expect(
      screen.getByRole('button', { name: /research\.transcript\.pagesRead\(count=0\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('research.transcript.linksFound(count=4)')).toBeInTheDocument();
  });
});
