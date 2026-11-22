import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModelVisibilityDialog } from '@/components/admin/connectors/model-visibility-dialog';
import { ConnectorModelExposure } from '@/enums/connector-model-exposure.enum';
import { ConnectorModelKind } from '@/enums/connector-model-kind.enum';
import {
  ConnectorModelEventType,
  ModelVisibilityGate,
  ModelVisibilityGateStatus,
} from '@/enums/model-visibility.enum';
import type {
  ModelVisibilityReport,
  UseModelVisibilityResult,
} from '@/types/model-visibility.types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}:${JSON.stringify(params)}`;

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t, locale: 'en', dir: 'ltr' }),
}));

const { mockHook } = vi.hoisted(() => ({
  mockHook: vi.fn<() => UseModelVisibilityResult>(),
}));

vi.mock('@/hooks/admin/use-model-visibility', () => ({
  useModelVisibility: () => mockHook(),
}));

const decisionReport: ModelVisibilityReport = {
  provider: 'GEMINI',
  modelKey: 'models/gemini-decision-1',
  visibleInPicker: false,
  firstFailingGate: ModelVisibilityGate.KIND_CHAT,
  model: {
    connectorId: 'c1',
    connectorName: 'Gemini',
    displayName: 'Gemini Decision 1',
    kind: ConnectorModelKind.TOOL,
    kindReason: 'Google lists only: createDecision',
    exposure: ConnectorModelExposure.EXPOSED,
    lifecycle: 'ACTIVE',
  },
  gates: [
    {
      gate: ModelVisibilityGate.EXPOSED,
      status: ModelVisibilityGateStatus.PASS,
      detail: 'EXPOSED',
    },
    {
      gate: ModelVisibilityGate.KIND_CHAT,
      status: ModelVisibilityGateStatus.FAIL,
      detail: 'kind is TOOL, not CHAT: not offered in chat (Google lists only: createDecision)',
    },
    {
      gate: ModelVisibilityGate.IN_ROUTING_REGISTRY,
      status: ModelVisibilityGateStatus.UNKNOWN,
      detail: 'routing-service did not answer',
    },
  ],
  recentEvents: [
    {
      type: ConnectorModelEventType.KIND_CHANGED,
      beforeKind: ConnectorModelKind.CHAT,
      afterKind: ConnectorModelKind.TOOL,
      beforeExposure: ConnectorModelExposure.EXPOSED,
      afterExposure: ConnectorModelExposure.UNEXPOSED,
      reason: 'Google lists only: createDecision',
      createdAt: '2026-11-22T19:14:00.000Z',
    },
  ],
};

const base: UseModelVisibilityResult = {
  report: null,
  isLoading: false,
  isError: false,
  locale: 'en',
  onOpenChange: vi.fn(),
};

beforeEach(() => {
  mockHook.mockReturnValue(base);
});

describe('ModelVisibilityDialog', () => {
  it('names the first failed gate and lists every gate with its verdict and evidence', () => {
    mockHook.mockReturnValue({ ...base, report: decisionReport });

    render(
      <ModelVisibilityDialog
        provider="GEMINI"
        modelKey="models/gemini-decision-1"
        onClose={vi.fn()}
        t={t}
      />,
    );

    expect(
      screen.getByText(
        'adminConnectors.visibility.hiddenSummary:{"gate":"adminConnectors.visibility.gateKindChat"}',
      ),
    ).toBeInTheDocument();
    const gates = screen.getByTestId('model-visibility-gates');
    const kindRow = gates.querySelector('[data-gate="KIND_CHAT"]');
    expect(kindRow).toHaveAttribute('data-status', 'FAIL');
    expect(within(gates).getByText(/Google lists only: createDecision/)).toBeInTheDocument();
    expect(gates.querySelector('[data-gate="IN_ROUTING_REGISTRY"]')).toHaveAttribute(
      'data-status',
      'UNKNOWN',
    );
  });

  it('shows the sync trail with before and after kinds', () => {
    mockHook.mockReturnValue({ ...base, report: decisionReport });

    render(<ModelVisibilityDialog provider="GEMINI" modelKey="m" onClose={vi.fn()} t={t} />);

    const history = screen.getByTestId('model-visibility-history');
    expect(
      within(history).getByText(
        'adminConnectors.visibility.eventKindChanged:{"before":"CHAT","after":"TOOL"}',
      ),
    ).toBeInTheDocument();
  });

  it('says the model is visible when every gate passed', () => {
    mockHook.mockReturnValue({
      ...base,
      report: {
        ...decisionReport,
        visibleInPicker: true,
        firstFailingGate: null,
        recentEvents: [],
      },
    });

    render(<ModelVisibilityDialog provider="GEMINI" modelKey="m" onClose={vi.fn()} t={t} />);

    expect(screen.getByText('adminConnectors.visibility.visibleSummary')).toBeInTheDocument();
    expect(screen.getByText('adminConnectors.visibility.historyEmpty')).toBeInTheDocument();
  });

  it('shows the loading and error states', () => {
    mockHook.mockReturnValue({ ...base, isLoading: true });
    const { rerender } = render(
      <ModelVisibilityDialog provider="GEMINI" modelKey="m" onClose={vi.fn()} t={t} />,
    );
    expect(screen.getByText('adminConnectors.visibility.loading')).toBeInTheDocument();

    mockHook.mockReturnValue({ ...base, isError: true });
    rerender(<ModelVisibilityDialog provider="GEMINI" modelKey="m" onClose={vi.fn()} t={t} />);
    expect(screen.getByRole('alert')).toHaveTextContent('adminConnectors.visibility.loadError');
  });
});
