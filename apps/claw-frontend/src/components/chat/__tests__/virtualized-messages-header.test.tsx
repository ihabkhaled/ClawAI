import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VirtualizedMessagesHeader } from '@/components/chat/virtualized-messages-header';
import type { TranslateFunction } from '@/types/i18n.types';

const t: TranslateFunction = (key: string): string => key;

describe('VirtualizedMessagesHeader', () => {
  it('renders the loading-older banner when fetching previous page', () => {
    const { container } = render(
      <VirtualizedMessagesHeader isFetchingPreviousPage hasPreviousPage t={t} />,
    );
    expect(screen.getByText('chat.loadingOlderMessages')).toBeInTheDocument();
    // A Loader2 SVG should be present
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders the beginning marker when there are no more pages and not fetching', () => {
    render(
      <VirtualizedMessagesHeader
        isFetchingPreviousPage={false}
        hasPreviousPage={false}
        t={t}
      />,
    );
    expect(screen.getByText('chat.beginningOfConversation')).toBeInTheDocument();
  });

  it('renders nothing when there are more pages but not fetching', () => {
    const { container } = render(
      <VirtualizedMessagesHeader isFetchingPreviousPage={false} hasPreviousPage t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
