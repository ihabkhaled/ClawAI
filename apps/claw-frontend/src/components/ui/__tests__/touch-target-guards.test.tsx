import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// The 2026-08-22 mobile regression came from guards written as `max-md:`, which
// is a width test. A phone in landscape reports 915×412, clears 768px, and gets
// desktop sizing. Every guard below has to be pointer-based (`touch:`) or the
// same class of defect comes straight back.
describe('touch target guards', () => {
  it.each(['default', 'sm', 'icon', 'icon-sm', 'icon-xs'] as const)(
    'gives the %s button a 44px hit area on a coarse pointer',
    (size) => {
      render(<Button size={size}>Go</Button>);

      const button = screen.getByRole('button', { name: 'Go' });
      expect(button.className).toContain('touch:min-h-11');
      expect(button.className).toContain('touch:min-w-11');
    },
  );

  it('never reintroduces a width-only mobile guard on the button', () => {
    render(<Button>Go</Button>);

    expect(screen.getByRole('button', { name: 'Go' }).className).not.toContain('max-md:');
  });

  it('lets a long button label wrap instead of overflowing a narrow viewport', () => {
    render(<Button>Talk to us about a private deployment</Button>);

    const button = screen.getByRole('button', { name: 'Talk to us about a private deployment' });
    expect(button.className).toContain('touch:whitespace-normal');
    expect(button.className).toContain('max-w-full');
  });

  it('grows the checkbox itself to 44px rather than overlaying a pseudo element', () => {
    render(<Checkbox aria-label="Enable" />);

    const checkbox = screen.getByRole('checkbox', { name: 'Enable' });
    expect(checkbox.className).toContain('touch:h-11');
    expect(checkbox.className).toContain('touch:w-11');
  });

  it('keeps the checkbox visual box at 16px through a before layer', () => {
    render(<Checkbox aria-label="Enable" />);

    const checkbox = screen.getByRole('checkbox', { name: 'Enable' });
    expect(checkbox.className).toContain('touch:before:h-4');
    expect(checkbox.className).toContain('touch:before:w-4');
  });

  it('keeps form controls at a 16px computed size on a coarse pointer', () => {
    render(
      <>
        <Input aria-label="Search" />
        <Textarea aria-label="Message" />
      </>,
    );

    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveClass('touch:text-[16px]');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveClass('touch:text-[16px]');
  });
});
