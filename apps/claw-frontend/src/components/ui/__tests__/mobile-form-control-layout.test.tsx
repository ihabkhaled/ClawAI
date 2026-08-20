import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

describe('mobile form control layout', () => {
  it('uses an explicit 16px input size to prevent iOS focus zoom', () => {
    render(<Input aria-label="Search" />);

    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveClass('max-md:text-[16px]');
  });

  it('uses an explicit 16px textarea size to prevent iOS focus zoom', () => {
    render(<Textarea aria-label="Message" />);

    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveClass('max-md:text-[16px]');
  });
});
