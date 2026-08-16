import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadQualityPanel } from '@/components/chat/thread-quality-panel';

const t = (key: string): string => key;

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  t,
  judgeEnabled: true,
  onJudgeEnabledChange: vi.fn(),
  judgeModel: null,
  onJudgeModelChange: vi.fn(),
  judgeModelOptions: [],
  judgeModelOptionsLoading: false,
  criticEnabled: false,
  onCriticEnabledChange: vi.fn(),
  criticModel: null,
  onCriticModelChange: vi.fn(),
  criticEnablementDisabled: false,
  qualityThreshold: 0.7,
  onQualityThresholdChange: vi.fn(),
  maxReRouteAttempts: 2,
  onMaxReRouteAttemptsChange: vi.fn(),
  onSave: vi.fn(),
  isPending: false,
  canSave: true,
  allowJudgeMode: true,
  allowCriticReview: true,
};

describe('ThreadQualityPanel', () => {
  it('groups judge, critic, threshold, reroute, and persistence controls', () => {
    render(<ThreadQualityPanel {...baseProps} />);

    expect(screen.getAllByText('chat.judgeReferee')).toHaveLength(2);
    expect(screen.getByText('compare.critic.enabled')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /chat.qualityThreshold/ })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /chat.maxReRouteAttempts/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    expect(baseProps.onSave).toHaveBeenCalledOnce();
  });
});
