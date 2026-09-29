import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThreadLineageBar } from '@/components/chat/thread-lineage-bar';
import type { ThreadLineageBarProps } from '@/types';

const base: ThreadLineageBarProps = {
  visible: true,
  parent: null,
  parentDeleted: false,
  branches: [],
  branchedFromLabel: 'Branched from',
  sourceDeletedLabel: 'Branched from a chat that was deleted',
  branchesLabel: 'Branches (2)',
};

describe('ThreadLineageBar', () => {
  it('renders nothing when there is no lineage to show', () => {
    const { container } = render(<ThreadLineageBar {...base} visible={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('links back to the source conversation', () => {
    render(
      <ThreadLineageBar {...base} parent={{ id: 's', label: 'Trip plan', href: '/chat/s' }} />,
    );

    expect(screen.getByRole('navigation', { name: 'Branched from' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trip plan' })).toHaveAttribute('href', '/chat/s');
  });

  it('says the source is gone when it was deleted', () => {
    render(<ThreadLineageBar {...base} parentDeleted />);

    expect(screen.getByText('Branched from a chat that was deleted')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('lists the branches behind a menu', () => {
    render(
      <ThreadLineageBar
        {...base}
        branches={[
          { id: 'b1', label: 'Option A', href: '/chat/b1' },
          { id: 'b2', label: 'Option B', href: '/chat/b2' },
        ]}
      />,
    );

    const trigger = screen.getByRole('button', { name: /Branches \(2\)/ });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });

    expect(screen.getByRole('menuitem', { name: 'Option B' })).toHaveAttribute('href', '/chat/b2');
  });
});
