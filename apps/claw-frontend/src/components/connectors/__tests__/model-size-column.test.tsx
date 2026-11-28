import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelCard } from '@/components/connectors/model-card';
import { ModelTable } from '@/components/connectors/model-table';
import type { ConnectorModel } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

vi.mock('@/hooks/chat/use-model-scale-formatter', () => ({
  useModelScaleFormatter: () => ({
    scaleText: () => undefined,
    parameterLabel: (provider: string, modelKey: string) =>
      provider === 'OPENROUTER' && modelKey === 'openai/gpt-oss-120b' ? '117B' : null,
    parametersHeading: 'Parameters',
  }),
}));

function model(overrides: Partial<ConnectorModel>): ConnectorModel {
  return {
    id: 'm1',
    connectorId: 'c1',
    provider: 'OPENROUTER',
    modelKey: 'openai/gpt-oss-120b',
    displayName: 'gpt-oss-120b',
    lifecycle: 'ACTIVE',
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsAudio: false,
    maxContextTokens: 131_072,
    syncedAt: '2026-11-28T00:00:00.000Z',
    ...overrides,
  } as unknown as ConnectorModel;
}

describe('connector model list size (ADR-234)', () => {
  it('shows the parameter count beside the context in the table, and a dash for a closed model', () => {
    render(
      <ModelTable
        models={[
          model({}),
          model({ id: 'm2', provider: 'OPENAI', modelKey: 'gpt-5.4', displayName: 'GPT 5.4' }),
        ]}
      />,
    );

    expect(screen.getAllByText('Parameters').length).toBeGreaterThan(0);
    expect(screen.getAllByText('117B').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('shows the parameter count on the model card', () => {
    render(<ModelCard model={model({})} />);

    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('117B')).toBeInTheDocument();
  });

  it('shows a dash on the card of a model whose maker publishes no count', () => {
    render(<ModelCard model={model({ provider: 'OPENAI', modelKey: 'gpt-5.4' })} />);

    expect(screen.getByText('Parameters').parentElement).toHaveTextContent('-');
  });
});
