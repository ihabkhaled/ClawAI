import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImageLoadingState } from '@/components/chat/image-loading-state';

describe('ImageLoadingState', () => {
  it('announces the runtime stage politely to screen readers', () => {
    render(
      <ImageLoadingState
        status="Generating image"
        prompt="a lighthouse"
        stageText="Running the image workflow · Step 4 of 20"
      />,
    );

    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('Running the image workflow · Step 4 of 20');
  });

  it('keeps the live region mounted (empty) before any stage arrives', () => {
    render(<ImageLoadingState status="Queued" prompt="a lighthouse" />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('ImageLoadingState — Cancel', () => {
  it('renders no Cancel button without a handler', () => {
    render(<ImageLoadingState status="Queued" prompt="a lighthouse" />);
    expect(screen.queryByTestId('image-generation-cancel')).toBeNull();
  });

  it('renders a labelled Cancel button that calls the handler', () => {
    const onCancel = vi.fn();
    render(
      <ImageLoadingState
        status="Generating image"
        prompt="a lighthouse"
        onCancel={onCancel}
        cancelLabel="Cancel"
        cancelAriaLabel="Cancel image generation"
      />,
    );
    const button = screen.getByRole('button', { name: 'Cancel image generation' });
    expect(button).toHaveTextContent('Cancel');
    fireEvent.click(button);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('is disabled and busy while the cancel is in flight', () => {
    render(
      <ImageLoadingState
        status="Generating image"
        prompt="a lighthouse"
        onCancel={vi.fn()}
        cancelLabel="Cancelling…"
        cancelAriaLabel="Cancel image generation"
        isCancelling
      />,
    );
    const button = screen.getByRole('button', { name: 'Cancel image generation' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
