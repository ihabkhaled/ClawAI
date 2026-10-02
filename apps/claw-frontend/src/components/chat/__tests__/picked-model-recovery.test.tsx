import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PickedModelFallbackNotice } from '@/components/chat/picked-model-fallback-notice';
import { PickedModelRecovery } from '@/components/chat/picked-model-recovery';
import { RoutingMode } from '@/enums';

vi.mock('@/hooks/chat/use-model-selector', () => ({
  useModelSelector: () => ({
    groups: [
      {
        key: 'g',
        label: 'g',
        options: [
          { value: 'ANTHROPIC::claude-opus-5', label: 'Claude Opus 5' },
          { value: 'GROQ::llama-4', label: 'Llama 4' },
          { value: 'GEMINI::gemini-flash', label: 'Gemini Flash' },
          { value: 'OPENAI::gpt-5', label: 'GPT 5' },
          { value: 'OLLAMA::glm', label: 'GLM' },
        ],
      },
    ],
    groupedModels: [],
    isLoading: false,
    t: (key: string) => key,
  }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values === undefined ? key : `${key}:${Object.values(values).join('|')}`,
  }),
}));
// The picker itself is covered elsewhere; here it is a button that stands for
// "open the picker and choose GPT 5".
vi.mock('@/components/chat/model-picker', () => ({
  ModelPicker: (props: { placeholder: string; onChange: (value: string | null) => void }) => (
    <button type="button" onClick={() => props.onChange('OPENAI::gpt-5')}>
      {props.placeholder}
    </button>
  ),
}));

describe('PickedModelRecovery', () => {
  const onPick = vi.fn();

  beforeEach(() => onPick.mockReset());

  it('shows the three suggested models and retries with the one clicked', () => {
    render(
      <PickedModelRecovery
        suggested={[
          { provider: 'GROQ', model: 'llama-4' },
          { provider: 'GEMINI', model: 'gemini-flash' },
          { provider: 'OLLAMA', model: 'glm' },
        ]}
        failedProvider="ANTHROPIC"
        failedModel="claude-opus-5"
        onPick={onPick}
      />,
    );

    const buttons = screen.getAllByTestId('picked-model-suggestion');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveTextContent('pickedModel.tryModel:Llama 4');

    fireEvent.click(buttons[1] as HTMLElement);
    expect(onPick).toHaveBeenCalledWith({
      routingMode: RoutingMode.MANUAL_MODEL,
      provider: 'GEMINI',
      model: 'gemini-flash',
    });
  });

  it('picks suggestions from the model list when the backend sent none, never the failed one', () => {
    render(
      <PickedModelRecovery
        suggested={[]}
        failedProvider="ANTHROPIC"
        failedModel="claude-opus-5"
        onPick={onPick}
      />,
    );

    const labels = screen.getAllByTestId('picked-model-suggestion').map((el) => el.textContent);
    expect(labels).toEqual([
      'pickedModel.tryModel:Llama 4',
      'pickedModel.tryModel:Gemini Flash',
      'pickedModel.tryModel:GPT 5',
    ]);
  });

  it('opens the model picker and retries with the model chosen there', () => {
    render(
      <PickedModelRecovery
        suggested={[]}
        failedProvider={null}
        failedModel={null}
        onPick={onPick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'pickedModel.chooseAnother' }));
    expect(onPick).toHaveBeenCalledWith({
      routingMode: RoutingMode.MANUAL_MODEL,
      provider: 'OPENAI',
      model: 'gpt-5',
    });
  });
});

describe('PickedModelFallbackNotice', () => {
  const t = (key: string, values?: Record<string, string | number>): string =>
    values === undefined ? key : `${key}:${Object.values(values).join('|')}`;

  it('names the model that failed and the one that answered', () => {
    render(
      <PickedModelFallbackNotice
        info={{ originalProvider: 'ANTHROPIC', originalModel: 'claude-opus-5', costlier: false }}
        answeredModel="llama-4"
        t={t}
      />,
    );
    expect(screen.getByTestId('picked-model-fallback-notice')).toHaveTextContent(
      'pickedModel.fallbackNotice:claude-opus-5|llama-4',
    );
    expect(screen.queryByText(/costlierNote/u)).toBeNull();
  });

  it('says so when the substitute can cost more', () => {
    render(
      <PickedModelFallbackNotice
        info={{ originalProvider: 'GROQ', originalModel: 'llama-4', costlier: true }}
        answeredModel="gpt-5"
        t={t}
      />,
    );
    expect(screen.getByText(/pickedModel\.costlierNote/u)).toBeInTheDocument();
  });
});
