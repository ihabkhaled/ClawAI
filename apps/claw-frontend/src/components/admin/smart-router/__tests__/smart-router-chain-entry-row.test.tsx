import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterChainEntryRow } from '@/components/admin/smart-router/smart-router-chain-entry-row';
import {
  RouterChainEntryRole,
  RouterConfigurationBillingModel,
  RouterProvider,
} from '@/enums/router-configuration.enum';
import type { RouterChainEntry } from '@/types/smart-router-admin.types';

const t = (key: string): string => key;

const entry: RouterChainEntry = {
  id: 'e1',
  order: 1,
  enabled: true,
  role: RouterChainEntryRole.PRIMARY,
  deploymentId: null,
  modelAlias: 'claude-sonnet-4-5',
  provider: RouterProvider.ANTHROPIC,
  attemptTimeoutMs: 1600,
  retries: 2,
  triggers: [],
  skipWhenProviderCircuitOpen: true,
  minConfidence: null,
  maxCostMicroUsd: null,
  billingModel: RouterConfigurationBillingModel.UNKNOWN,
  lastValidatedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function baseProps(overrides: Partial<React.ComponentProps<typeof SmartRouterChainEntryRow>> = {}) {
  return {
    entry,
    index: 0,
    isFirst: true,
    isLast: false,
    isEditable: true,
    isDragSupported: false,
    isDragging: false,
    isDragTarget: false,
    isUpdatePending: false,
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onRemove: vi.fn(),
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDragLeave: vi.fn(),
    onDrop: vi.fn(),
    onDragEnd: vi.fn(),
    t,
    ...overrides,
  };
}

describe('SmartRouterChainEntryRow', () => {
  it('renders the model alias and position', () => {
    render(<SmartRouterChainEntryRow {...baseProps()} />);
    expect(screen.getByText('claude-sonnet-4-5')).toBeInTheDocument();
    expect(screen.getByText(/#1/)).toBeInTheDocument();
  });

  it('shows the disabled badge when the entry is disabled', () => {
    render(<SmartRouterChainEntryRow {...baseProps({ entry: { ...entry, enabled: false } })} />);
    expect(screen.getByText('smartRouterAdmin.entryRow.disabledBadge')).toBeInTheDocument();
  });

  it('calls onRemove when the delete button is clicked, only when editable', () => {
    const onRemove = vi.fn();
    render(<SmartRouterChainEntryRow {...baseProps({ onRemove })} />);
    screen.getByLabelText('common.delete').click();
    expect(onRemove).toHaveBeenCalled();
  });

  it('hides move/remove controls when not editable', () => {
    render(<SmartRouterChainEntryRow {...baseProps({ isEditable: false })} />);
    expect(screen.queryByLabelText('common.delete')).not.toBeInTheDocument();
  });

  it('shows up/down buttons when editable and drag is not supported', () => {
    render(<SmartRouterChainEntryRow {...baseProps({ isFirst: false, isLast: false })} />);
    expect(screen.getByLabelText('common.previous')).toBeInTheDocument();
    expect(screen.getByLabelText('common.next')).toBeInTheDocument();
  });
});
