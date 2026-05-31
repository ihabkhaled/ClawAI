import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ResponsivePage } from '@/components/common/responsive-page';
import { ResponsiveGrid } from '@/components/common/responsive-grid';

describe('ResponsivePage', () => {
  it('renders children', () => {
    render(
      <ResponsivePage>
        <span>content</span>
      </ResponsivePage>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('applies the standard width by default', () => {
    const { container } = render(<ResponsivePage>x</ResponsivePage>);
    expect(container.firstElementChild).toHaveClass('max-w-5xl');
  });

  it('applies a full-height layout when requested', () => {
    const { container } = render(<ResponsivePage fullHeight>x</ResponsivePage>);
    expect(container.firstElementChild).toHaveClass('h-full');
  });
});

describe('ResponsiveGrid', () => {
  it('renders a grid with children', () => {
    const { container } = render(
      <ResponsiveGrid>
        <span>a</span>
        <span>b</span>
      </ResponsiveGrid>,
    );
    expect(container.firstElementChild).toHaveClass('grid');
    expect(screen.getByText('a')).toBeInTheDocument();
  });
});
