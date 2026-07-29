import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('shows the pointer cursor for every enabled shared button', () => {
    render(<Button type="button">Continue</Button>);

    expect(screen.getByRole('button', { name: 'Continue' })).toHaveClass('cursor-pointer');
  });
});
