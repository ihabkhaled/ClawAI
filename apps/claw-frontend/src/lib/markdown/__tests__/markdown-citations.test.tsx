import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownRenderer } from '@/lib/markdown/markdown-renderer';
import type { MessageCitation } from '@/types';
import { citationIndexFromHref, sameCitations } from '@/utilities/message-citation.utility';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const citations: MessageCitation[] = [
  { index: 1, title: 'RATP news', url: 'https://www.ratp.example/news', snippet: 'Line 14' },
  { index: 2, title: 'Bad source', url: 'javascript:alert(1)', snippet: '' },
];

describe('inline citations', () => {
  it('turns [1] into a link to the stored source, named by title and host', () => {
    render(<MarkdownRenderer content="Line 14 was extended [1]." citations={citations} />);

    const link = screen.getByRole('link', { name: 'RATP news — ratp.example' });
    expect(link).toHaveAttribute('href', 'https://www.ratp.example/news');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('leaves a number the answer never stored as plain text — no fabricated link', () => {
    render(<MarkdownRenderer content="As shown in [7]." citations={citations} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('As shown in [7].')).toBeInTheDocument();
  });

  it('never makes a non-http source clickable', () => {
    const { container } = render(
      <MarkdownRenderer content="Claimed here [2]." citations={citations} />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('[href^="javascript"]')).toBeNull();
    expect(screen.getByLabelText(/Bad source/)).toBeInTheDocument();
  });

  it('does not rewrite [1] inside code', () => {
    render(<MarkdownRenderer content="Use `arr[1]` here." citations={citations} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('arr[1]')).toBeInTheDocument();
  });

  it('renders exactly as before when the answer has no citations', () => {
    render(<MarkdownRenderer content="Plain [1] text." />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Plain [1] text.')).toBeInTheDocument();
  });
});

describe('citation helpers', () => {
  it('reads the fragment the plugin writes, with or without the sanitizer prefix', () => {
    expect(citationIndexFromHref('#cite-3')).toBe(3);
    expect(citationIndexFromHref('#user-content-cite-3')).toBe(3);
    expect(citationIndexFromHref('https://example.com')).toBeNull();
    expect(citationIndexFromHref(undefined)).toBeNull();
  });

  it('compares citations by value so the memoised renderer does not re-parse', () => {
    expect(
      sameCitations(
        citations,
        citations.map((entry) => ({ ...entry })),
      ),
    ).toBe(true);
    expect(sameCitations(citations, citations.slice(1))).toBe(false);
    expect(sameCitations(undefined, [])).toBe(true);
  });
});
