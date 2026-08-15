import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterChainEntryList } from '@/components/admin/smart-router/smart-router-chain-entry-list';
import {
  RouterChainEntryRole,
  RouterConfigurationBillingModel,
  RouterProvider,
} from '@/enums/router-configuration.enum';
import type { RouterChainEntry } from '@/types/smart-router-admin.types';

const t = (key: string): string => key;

function makeEntry(id: string, order: number, modelAlias: string): RouterChainEntry {
  return {
    id,
    order,
    enabled: true,
    role: RouterChainEntryRole.PRIMARY,
    deploymentId: null,
    modelAlias,
    provider: RouterProvider.ANTHROPIC,
    attemptTimeoutMs: 1600,
    retries: 0,
    triggers: [],
    skipWhenProviderCircuitOpen: true,
    minConfidence: null,
    maxCostMicroUsd: null,
    billingModel: RouterConfigurationBillingModel.UNKNOWN,
    lastValidatedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('SmartRouterChainEntryList', () => {
  it('renders one row per entry', () => {
    const entries = [makeEntry('a', 1, 'model-a'), makeEntry('b', 2, 'model-b')];
    render(
      <SmartRouterChainEntryList
        entries={entries}
        isEditable
        isUpdatePending={false}
        onReorder={vi.fn()}
        onRemove={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('model-a')).toBeInTheDocument();
    expect(screen.getByText('model-b')).toBeInTheDocument();
  });

  it('moving the second entry up calls onReorder with the first entry order', () => {
    const entries = [makeEntry('a', 1, 'model-a'), makeEntry('b', 2, 'model-b')];
    const onReorder = vi.fn();
    render(
      <SmartRouterChainEntryList
        entries={entries}
        isEditable
        isUpdatePending={false}
        onReorder={onReorder}
        onRemove={vi.fn()}
        t={t}
      />,
    );
    const upButtons = screen.getAllByLabelText('common.previous');
    upButtons[1]?.click();
    expect(onReorder).toHaveBeenCalledWith('b', 1);
  });

  it('removing an entry calls onRemove with its id', () => {
    const entries = [makeEntry('a', 1, 'model-a')];
    const onRemove = vi.fn();
    render(
      <SmartRouterChainEntryList
        entries={entries}
        isEditable
        isUpdatePending={false}
        onReorder={vi.fn()}
        onRemove={onRemove}
        t={t}
      />,
    );
    screen.getByLabelText('common.delete').click();
    expect(onRemove).toHaveBeenCalledWith('a');
  });
});
