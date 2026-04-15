import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TerminalCommandStatus } from '@/enums';
import { useAgentPage } from '@/hooks/agent/use-agent-page';

const mockUseAgentSessions = vi.fn();
const mockUseAgentCommands = vi.fn();
const mockUseApproveCommand = vi.fn();
const mockUseRejectCommand = vi.fn();

vi.mock('@/hooks/agent/use-agent-sessions', () => ({
  useAgentSessions: (...args: unknown[]) => mockUseAgentSessions(...args),
}));

vi.mock('@/hooks/agent/use-agent-commands', () => ({
  useAgentCommands: (...args: unknown[]) => mockUseAgentCommands(...args),
}));

vi.mock('@/hooks/agent/use-agent-command-mutations', () => ({
  useApproveCommand: () => mockUseApproveCommand(),
  useRejectCommand: () => mockUseRejectCommand(),
}));

describe('useAgentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAgentSessions.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseAgentCommands.mockReturnValue({
      data: { data: [{ id: 'cmd-1', command: 'git status' }] },
      isLoading: false,
    });
    mockUseApproveCommand.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
    mockUseRejectCommand.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
  });

  it('requests only pending-approval commands for the dashboard list', () => {
    renderHook(() => useAgentPage());

    expect(mockUseAgentCommands).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: TerminalCommandStatus.PENDING_APPROVAL,
    });
  });

  it('reports command actions as pending when either mutation is active', () => {
    mockUseRejectCommand.mockReturnValue({
      isPending: true,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => useAgentPage());

    expect(result.current.isCommandActionPending).toBe(true);
  });
});
