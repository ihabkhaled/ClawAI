import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ModelPickerProps } from '@/types';

import { ThreadModelPicker } from '../thread-model-picker';

let capturedProps: ModelPickerProps | null = null;

vi.mock('@/components/billing/credit-dual-consumption-notice', () => ({
  CreditDualConsumptionNotice: () => <span data-testid="credit-notice" />,
}));
vi.mock('@/components/chat/model-picker', () => ({
  ModelPicker: (props: ModelPickerProps) => {
    capturedProps = props;
    return <div data-testid="model-picker" />;
  },
}));
vi.mock('@/hooks/chat/use-model-selector', () => ({
  useModelSelector: () => ({
    t: (key: string) => key,
    isLoading: false,
    groupedModels: [
      {
        provider: 'ANTHROPIC',
        label: 'Anthropic',
        models: [{ provider: 'ANTHROPIC', model: 'claude-x', displayName: 'Claude X' }],
      },
    ],
    groups: [
      { key: 'ANTHROPIC', label: 'Anthropic', options: [] },
      { key: 'local-ollama', label: 'Local', options: [] },
      { key: 'IMAGE_OPENAI', label: 'Images', options: [] },
    ],
  }),
}));

describe('ThreadModelPicker', () => {
  it('uses the chat picker with providers, but leaves out on-device and image groups', () => {
    render(
      <ThreadModelPicker
        id="role"
        label="Judge"
        value={{ provider: 'ANTHROPIC', model: 'claude-x', displayName: 'Claude X' }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('model-picker')).toBeInTheDocument();
    expect(capturedProps?.groups.map((group) => group.key)).toEqual(['ANTHROPIC']);
    expect(capturedProps?.autoOption).toBeUndefined();
  });

  it('hands back the full model, not just its key, when one is picked', () => {
    const onChange = vi.fn();
    render(
      <ThreadModelPicker
        id="role"
        label="Judge"
        value={{ provider: 'ANTHROPIC', model: 'claude-x', displayName: 'Claude X' }}
        onChange={onChange}
      />,
    );

    capturedProps?.onChange('ANTHROPIC::claude-x');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'ANTHROPIC', model: 'claude-x' }),
    );
  });
});
