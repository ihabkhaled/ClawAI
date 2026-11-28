import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelScaleLine } from '@/components/models/model-scale-line';

const mockScaleText = vi.fn();

vi.mock('@/hooks/chat/use-model-scale-formatter', () => ({
  useModelScaleFormatter: () => ({
    scaleText: (...args: unknown[]) => mockScaleText(...args),
    parameterLabel: () => null,
    parametersHeading: 'Parameters',
  }),
}));

describe('ModelScaleLine', () => {
  it('writes the size of a model as one line, with the fuller text in the tooltip', () => {
    mockScaleText.mockReturnValue({
      label: '256K context · 1T params',
      title: '256K context · 1T params, 32B active per token',
    });

    render(
      <ModelScaleLine
        provider="OPENROUTER"
        modelKey="moonshotai/kimi-k2"
        contextTokens={262_144}
      />,
    );

    expect(screen.getByTestId('model-scale')).toHaveTextContent('256K context · 1T params');
    expect(screen.getByTestId('model-scale')).toHaveAttribute(
      'title',
      '256K context · 1T params, 32B active per token',
    );
    expect(mockScaleText).toHaveBeenCalledWith('OPENROUTER', 'moonshotai/kimi-k2', 262_144);
  });

  it('renders nothing for a model whose size is unknown', () => {
    mockScaleText.mockReturnValue(undefined);

    const { container } = render(
      <ModelScaleLine provider="OPENAI" modelKey="mystery" contextTokens={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
