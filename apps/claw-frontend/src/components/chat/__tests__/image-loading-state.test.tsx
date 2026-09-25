import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
