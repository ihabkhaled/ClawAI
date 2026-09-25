import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelCapabilityBadges } from '@/components/chat/model-capability-badges';
import { ModelCapabilityBadge } from '@/enums/model-capability-badge.enum';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ModelCapabilityBadges', () => {
  it('renders one labelled glyph per capability, with a tooltip and screen-reader text', () => {
    render(
      <ModelCapabilityBadges
        capabilities={[ModelCapabilityBadge.Vision, ModelCapabilityBadge.VideoInput]}
      />,
    );

    const list = screen.getByRole('list', { name: 'mediaUi.capability.listLabel' });
    expect(list).toBeInTheDocument();
    const vision = screen.getByTestId(`model-capability-badge-${ModelCapabilityBadge.Vision}`);
    expect(vision).toHaveAttribute('title', 'mediaUi.capability.vision');
    // Not colour-only: the words are in the accessibility tree.
    expect(vision).toHaveTextContent('mediaUi.capability.vision');
    expect(
      screen.getByTestId(`model-capability-badge-${ModelCapabilityBadge.VideoInput}`),
    ).toHaveAttribute('title', 'mediaUi.capability.videoInput');
    expect(
      screen.queryByTestId(`model-capability-badge-${ModelCapabilityBadge.AudioInput}`),
    ).not.toBeInTheDocument();
  });

  it('renders nothing for a model with no capability flags', () => {
    const { container } = render(<ModelCapabilityBadges capabilities={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
