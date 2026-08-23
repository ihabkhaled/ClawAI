import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AgentActivityEntry } from '@/components/agent/activity-entry';
import {
  CapabilityBlastRadius,
  CapabilityClass,
  CapabilityInvocationStatus,
  CapabilityOperation,
  CapabilityReversibility,
  RiskLabel,
} from '@/enums';
import type { CapabilityInvocation } from '@/types/capability.types';

const invocation: CapabilityInvocation = {
  id: 'invocation-1',
  userId: 'user-1',
  deviceId: 'device-1',
  recipeRunId: null,
  parentInvocationId: null,
  capabilityClass: CapabilityClass.BROWSER,
  capabilityOperation: CapabilityOperation.NAVIGATE,
  targetDescriptor: { url: `https://example.com/${'long'.repeat(30)}` },
  payload: {},
  requiredScopes: [],
  blastRadius: CapabilityBlastRadius.SINGLE_RESOURCE,
  reversibility: CapabilityReversibility.REVERSIBLE,
  status: CapabilityInvocationStatus.EXECUTED,
  riskScore: 10,
  riskLabel: RiskLabel.LOW,
  matchedPolicyId: null,
  matchedPolicyName: null,
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: null,
  expiresAt: '2026-08-20T01:00:00.000Z',
  startedExecutingAt: null,
  completedAt: null,
  executionResult: null,
  executionError: null,
  undoPlan: null,
  rolledBackAt: null,
  rollbackResult: null,
  rollbackError: null,
  metadata: null,
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

describe('AgentActivityEntry mobile layout', () => {
  it('wraps summary controls and contains long target descriptors', () => {
    render(<AgentActivityEntry invocation={invocation} t={(key) => key} />);

    expect(screen.getByRole('button')).toHaveClass('flex-wrap', 'sm:flex-nowrap');
    expect(screen.getByText(/example\.com/)).toHaveClass(
      'min-w-0',
      'touch:basis-full',
      'touch:break-all',
    );
  });
});
