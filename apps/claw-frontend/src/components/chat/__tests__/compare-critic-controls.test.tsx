import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompareCriticControls } from '@/components/chat/compare-critic-controls';

const t = (key: string): string => key;

const baseProps = {
  criticEnabled: false,
  onCriticEnabledChange: vi.fn(),
  criticModel: null,
  onCriticModelChange: vi.fn(),
  criticModelOptions: [
    { value: 'OPENAI:gpt-4o-mini', label: 'OPENAI · gpt-4o-mini' },
    { value: 'gemma3:4b', label: 'gemma3:4b' },
  ],
  criticModelOptionsLoading: false,
  t,
};

describe('CompareCriticControls', () => {
  it('renders the enabled label and hint', () => {
    render(<CompareCriticControls {...baseProps} />);
    expect(screen.getByText('compare.critic.enabled')).toBeInTheDocument();
    expect(screen.getByText('compare.critic.enabledHint')).toBeInTheDocument();
  });

  it('hides the model select when critic is OFF', () => {
    render(<CompareCriticControls {...baseProps} criticEnabled={false} />);
    expect(screen.queryByText('compare.critic.modelLabel')).not.toBeInTheDocument();
  });

  it('shows the model select when critic is ON', () => {
    render(<CompareCriticControls {...baseProps} criticEnabled />);
    expect(screen.getByText('compare.critic.modelLabel')).toBeInTheDocument();
  });

  it('calls onCriticEnabledChange when the switch is toggled', () => {
    const onChange = vi.fn();
    render(<CompareCriticControls {...baseProps} onCriticEnabledChange={onChange} />);
    const switchEl = screen.getByRole('switch');
    fireEvent.click(switchEl);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
