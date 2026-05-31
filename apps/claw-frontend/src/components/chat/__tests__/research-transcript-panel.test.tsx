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

  it('renders a collapsed summary with the source count', () => {
    render(<ResearchTranscriptPanel transcript={populatedTranscript} />);

    const toggle = screen.getByRole('button', { name: /research\.transcript\.title/ });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Source list is hidden when collapsed.
    expect(screen.queryByText('Anthropic launches new model')).not.toBeInTheDocument();
  });

  it('toggles the source list open when clicked', () => {
    render(<ResearchTranscriptPanel transcript={populatedTranscript} />);

    const toggle = screen.getByRole('button', { name: /research\.transcript\.title/ });
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
    fireEvent.click(screen.getByRole('button', { name: /research\.transcript\.title/ }));

    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('410ms')).toBeInTheDocument();
  });
});
