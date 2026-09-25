import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImageCancelledState } from '@/components/chat/image-cancelled-state';

describe('ImageCancelledState', () => {
  it('states the cancellation and still offers Retry', () => {
    const onRetry = vi.fn();
    render(
      <ImageCancelledState label="Generation cancelled" retryLabel="Retry" onRetry={onRetry} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Generation cancelled');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
