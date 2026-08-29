import { fireEvent, render, screen } from '@testing-library/react';
import { createRef, forwardRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VirtualizedMessages } from '@/components/chat/virtualized-messages';
import { ChatLimitAction } from '@/enums/chat-limit-action.enum';
import { ChatLimitKind } from '@/enums/chat-limit-kind.enum';
import type { VirtuosoHandle } from '@/lib/virtuoso';
import type { MessageRenderItem, VirtualizedMessagesProps } from '@/types';
import type { TranslateFunction } from '@/types/i18n.types';

// Capture every prop Virtuoso receives so the test can assert wiring.
type VirtuosoProps = {
  followOutput?: (atBottom: boolean) => 'auto' | 'smooth' | false;
  atBottomStateChange?: (atBottom: boolean) => void;
  atBottomThreshold?: number;
  data?: unknown[];
  initialTopMostItemIndex?: number;
  firstItemIndex?: number;
  alignToBottom?: boolean;
  startReached?: () => void;
};

let capturedVirtuosoProps: VirtuosoProps | undefined;

vi.mock('@/lib/virtuoso', () => {
  const Virtuoso = forwardRef<unknown, VirtuosoProps>((props, _ref) => {
    capturedVirtuosoProps = props;
    return <div data-testid="virtuoso-mock" />;
  });
  Virtuoso.displayName = 'VirtuosoMock';
  return { Virtuoso };
});

vi.mock('@/components/common/loading-spinner', () => ({
  LoadingSpinner: ({ label }: { label: string }) => <div>{label}</div>,
}));

// The refusal card translates its own copy, and this file renders the list
// outside any provider.
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));

const t: TranslateFunction = (key: string): string => key;

function makeRenderItem(id: string): MessageRenderItem {
  return {
    kind: 'single',
    message: {
      id,
      threadId: 'thread-1',
      role: 'ASSISTANT' as never,
      content: `content-${id}`,
      createdAt: new Date().toISOString(),
    } as never,
  };
}

function makeProps(overrides: Partial<VirtualizedMessagesProps> = {}): VirtualizedMessagesProps {
  const virtuosoRef = createRef<VirtuosoHandle>();
  const renderItems = [makeRenderItem('m1'), makeRenderItem('m2'), makeRenderItem('m3')];
  const renderNull = (): React.ReactElement | null => null;
  const defaults: VirtualizedMessagesProps = {
    isLoading: false,
    isEmpty: false,
    limitNotice: null,
    loadingLabel: 'chat.loadingMessages',
    emptyLabel: 'chat.noMessagesYet',
    persistentError: null,
    virtuosoRef,
    handleJumpToMessage: vi.fn(),
    renderItems,
    itemContent: () => <div data-testid="row" />,
    headerContent: renderNull,
    footerContent: renderNull,
    handleFollowOutput: (atBottom) => (atBottom ? 'smooth' : false),
    onAtBottomStateChange: vi.fn(),
    handleStartReached: vi.fn(),
    firstItemIndex: 0,
    initialTopMostItemIndex: renderItems.length - 1,
    increaseViewportBy: { top: 1200, bottom: 200 },
    showJumpToLatest: false,
    onJumpToLatest: vi.fn(),
    t,
  };
  return { ...defaults, ...overrides };
}

beforeEach(() => {
  capturedVirtuosoProps = undefined;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('VirtualizedMessages (pure render)', () => {
  it('forwards every Virtuoso prop from the controller bag verbatim', () => {
    const props = makeProps();
    render(<VirtualizedMessages {...props} />);
    expect(capturedVirtuosoProps).toBeDefined();
    expect(capturedVirtuosoProps?.followOutput).toBe(props.handleFollowOutput);
    expect(capturedVirtuosoProps?.atBottomStateChange).toBe(props.onAtBottomStateChange);
    expect(capturedVirtuosoProps?.startReached).toBe(props.handleStartReached);
    expect(capturedVirtuosoProps?.initialTopMostItemIndex).toBe(props.initialTopMostItemIndex);
    expect(capturedVirtuosoProps?.firstItemIndex).toBe(props.firstItemIndex);
    expect(capturedVirtuosoProps?.alignToBottom).toBe(true);
  });

  it('renders the loading spinner and skips Virtuoso when isLoading is true', () => {
    render(<VirtualizedMessages {...makeProps({ isLoading: true })} />);
    expect(screen.getByText('chat.loadingMessages')).toBeInTheDocument();
    expect(screen.queryByTestId('virtuoso-mock')).toBeNull();
  });

  it('renders the empty label when isEmpty is true', () => {
    render(<VirtualizedMessages {...makeProps({ isEmpty: true })} />);
    expect(screen.getByText('chat.noMessagesYet')).toBeInTheDocument();
    expect(screen.queryByTestId('virtuoso-mock')).toBeNull();
  });

  it('shows the refusal instead of the empty label when the first send was blocked', () => {
    // The footer normally carries this, but a thread with no messages never
    // renders a list — so on the very first message, the most likely moment to
    // hit a wall, the refusal had nowhere to go and survived only as a toast
    // that then faded, leaving a composer that looked like it did nothing.
    render(
      <VirtualizedMessages
        {...makeProps({
          isEmpty: true,
          limitNotice: {
            kind: ChatLimitKind.DailyTokens,
            titleKey: 'chat.limits.dailyTokensTitle',
            bodyKey: 'chat.limits.dailyTokensBody',
            action: ChatLimitAction.Upgrade,
            showCreditDisclaimer: false,
          },
        })}
      />,
    );

    expect(screen.getByText('chat.limits.dailyTokensTitle')).toBeInTheDocument();
    expect(screen.queryByText('chat.noMessagesYet')).toBeNull();
  });

  it('hides JumpToLatestButton when showJumpToLatest is false', () => {
    render(<VirtualizedMessages {...makeProps({ showJumpToLatest: false })} />);
    expect(screen.queryByRole('button', { name: 'chat.jumpToLatest' })).toBeNull();
  });

  it('shows JumpToLatestButton and invokes onJumpToLatest when clicked', () => {
    const onJumpToLatest = vi.fn();
    render(<VirtualizedMessages {...makeProps({ showJumpToLatest: true, onJumpToLatest })} />);
    const button = screen.getByRole('button', { name: 'chat.jumpToLatest' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onJumpToLatest).toHaveBeenCalledTimes(1);
  });
});
