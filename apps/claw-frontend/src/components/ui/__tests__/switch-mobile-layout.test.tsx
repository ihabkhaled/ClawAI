import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from '@/components/ui/switch';

describe('Switch mobile layout', () => {
  it('provides a 44px touch target around the compact visual track', () => {
    render(<Switch checked={false} onCheckedChange={vi.fn()} aria-label="Setting" />);

    expect(screen.getByRole('switch', { name: 'Setting' })).toHaveClass('h-11', 'w-11');
  });
});
