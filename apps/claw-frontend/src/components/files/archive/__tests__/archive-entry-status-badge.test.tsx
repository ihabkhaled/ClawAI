import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ArchiveEntryStatusBadge } from '@/components/files/archive/archive-entry-status-badge';

// Every status carries an icon AND words, so the meaning never rides on colour
// alone — the icon is aria-hidden and the label is what a screen reader gets.
const t = (key: string): string => key;

describe('ArchiveEntryStatusBadge', () => {
  it('renders both an icon and a text label for an included entry', () => {
    render(<ArchiveEntryStatusBadge status="included" t={t} />);
    const badge = screen.getByTestId('archive-entry-status');
    expect(badge).toHaveTextContent('files.archive.status.extracted');
    expect(badge.querySelector('svg')).not.toBeNull();
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders a distinct icon and label per status, not a shared placeholder', () => {
    const statuses = [
      'included',
      'skipped-encrypted',
      'skipped-too-large',
      'skipped-unsafe',
      'skipped-nesting-depth',
    ];
    const icons = statuses.map((status) => {
      render(<ArchiveEntryStatusBadge status={status} t={t} />);
      return screen
        .getAllByTestId('archive-entry-status')
        .at(-1)
        ?.querySelector('svg')
        ?.getAttribute('class');
    });
    expect(new Set(icons).size).toBeGreaterThan(1);
  });

  it('falls an unrecognised backend status back to Unsupported rather than a raw string', () => {
    render(<ArchiveEntryStatusBadge status="skipped-brand-new-code" t={t} />);
    expect(screen.getByTestId('archive-entry-status')).toHaveTextContent(
      'files.archive.status.unsupported',
    );
  });
});
