import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelKindCell } from '@/components/admin/connectors/model-kind-cell';
import type { ModelExposureRowView } from '@/types/model-exposure.types';

const t = (key: string): string => key;

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t, locale: 'en', dir: 'ltr' }),
}));

const viewWith = (kindView: ModelExposureRowView['kindView']): ModelExposureRowView =>
  ({ kindView }) as ModelExposureRowView;

describe('ModelKindCell', () => {
  it('shows the TOOL badge, "Not offered in chat" and the reason the sync recorded', () => {
    render(
      <ModelKindCell
        view={viewWith({
          labelKey: 'adminConnectors.visibility.kindTool',
          badgeClass: '',
          offeredInChat: false,
          reason: 'Google lists only: createDecision',
        })}
        t={t}
      />,
    );

    expect(screen.getByText('adminConnectors.visibility.kindTool')).toBeInTheDocument();
    expect(screen.getByText('adminConnectors.visibility.notInChat')).toBeInTheDocument();
    expect(screen.getByText('Google lists only: createDecision')).toBeInTheDocument();
  });

  it('falls back to the generic sentence when no reason was recorded', () => {
    render(
      <ModelKindCell
        view={viewWith({
          labelKey: 'adminConnectors.visibility.kindEmbedding',
          badgeClass: '',
          offeredInChat: false,
          reason: null,
        })}
        t={t}
      />,
    );

    expect(screen.getByText('adminConnectors.visibility.notInChatGeneric')).toBeInTheDocument();
  });

  it('shows only the badge for a chat model', () => {
    render(
      <ModelKindCell
        view={viewWith({
          labelKey: 'adminConnectors.visibility.kindChat',
          badgeClass: '',
          offeredInChat: true,
          reason: null,
        })}
        t={t}
      />,
    );

    expect(screen.getByText('adminConnectors.visibility.kindChat')).toBeInTheDocument();
    expect(screen.queryByText('adminConnectors.visibility.notInChat')).not.toBeInTheDocument();
  });
});
