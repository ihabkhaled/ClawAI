import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownRenderer } from '@/lib/markdown/markdown-renderer';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

// Regression: chat message bubbles are width-constrained so a wide code
// block cannot stretch the whole conversation column (see
// components/chat's min-width containment). That containment only holds if
// every block-level markdown element also allows its own text to wrap --
// otherwise a long unbroken token (a URL, an identifier, a hyphen-free CJK
// run) inside a heading, paragraph, list item or blockquote pushes the
// bubble wider instead of wrapping, which is exactly what already-fixed
// inline `code` and links (`a`) needed `break-words` for. These assertions
// pin the same containment on the remaining block-level renderers so a
// regression here shows up as a failing test instead of a wide chat bubble.
describe('MarkdownRenderer block-level containment', () => {
  it('lets long paragraph text wrap inside its container', () => {
    render(<MarkdownRenderer content="Regularparagraphtext" />);
    expect(screen.getByText('Regularparagraphtext')).toHaveClass('break-words');
  });

  it('lets long heading text wrap instead of widening the bubble', () => {
    render(<MarkdownRenderer content="# HeadingText" />);
    expect(screen.getByRole('heading', { level: 1, name: 'HeadingText' })).toHaveClass(
      'break-words',
    );
  });

  it('contains long list item text', () => {
    render(<MarkdownRenderer content="- ListItemText" />);
    expect(screen.getByRole('list')).toHaveClass('break-words');
  });

  it('contains long blockquote text', () => {
    render(<MarkdownRenderer content="> QuotedText" />);
    expect(screen.getByText('QuotedText').closest('blockquote')).toHaveClass('break-words');
  });

  it('still wraps fenced code blocks inside a horizontally scrollable pre, not the page', () => {
    render(<MarkdownRenderer content={'```\nconst veryLongUnbreakableIdentifier = 1;\n```'} />);
    const pre = document.querySelector('pre');
    expect(pre).toHaveClass('overflow-x-auto');
  });
});
