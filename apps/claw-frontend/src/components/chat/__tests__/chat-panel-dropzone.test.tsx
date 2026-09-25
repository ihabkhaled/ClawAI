import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatPanelDropzone } from '@/components/chat/chat-panel-dropzone';
import { useComposerDropTargetStore } from '@/stores/composer-drop-target.store';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

// jsdom has no DataTransfer; the drop handler reads only these three fields.
function dataTransferWith(files: File[]): { types: string[]; files: File[]; items: File[] } {
  return { types: ['Files'], files, items: [] };
}

describe('ChatPanelDropzone', () => {
  afterEach(() => {
    useComposerDropTargetStore.setState({ ingest: null });
  });

  it('hands a file dropped on the messages area to the registered composer', () => {
    const ingest = vi.fn();
    act(() => {
      useComposerDropTargetStore.getState().register(ingest);
    });
    render(
      <ChatPanelDropzone>
        <div data-testid="messages">messages</div>
      </ChatPanelDropzone>,
    );
    const file = new File(['x'], 'report.pdf', { type: 'application/pdf' });
    const messages = screen.getByTestId('messages');

    fireEvent.dragEnter(messages, { dataTransfer: dataTransferWith([file]) });
    expect(screen.getByTestId('composer-drop-overlay')).toBeInTheDocument();

    fireEvent.drop(messages, { dataTransfer: dataTransferWith([file]) });
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(ingest).toHaveBeenCalledWith([file]);
    expect(screen.queryByTestId('composer-drop-overlay')).toBeNull();
  });

  it('is inert while no composer is registered', () => {
    render(
      <ChatPanelDropzone>
        <div data-testid="messages">messages</div>
      </ChatPanelDropzone>,
    );

    fireEvent.dragEnter(screen.getByTestId('messages'), {
      dataTransfer: dataTransferWith([new File(['x'], 'a.txt')]),
    });

    expect(screen.queryByTestId('composer-drop-overlay')).toBeNull();
  });

  it('a stale composer unmounting never clears the live registration', () => {
    const ingest = vi.fn();
    act(() => {
      useComposerDropTargetStore.getState().register(ingest);
    });
    const unregister = useComposerDropTargetStore.getState().unregister;
    act(() => {
      unregister(vi.fn());
    });

    expect(useComposerDropTargetStore.getState().ingest).toBe(ingest);
  });
});
