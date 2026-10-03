import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageSaveAction } from '@/components/chat/message-save-action';
import { SaveToContextTarget } from '@/enums/save-to-context-target.enum';

const save = vi.fn();

vi.mock('@/hooks/chat/use-message-save-action', () => ({
  useMessageSaveAction: () => ({ save, isPending: false }),
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('MessageSaveAction', () => {
  beforeEach(() => save.mockReset());

  it('saves the message as a context pack from the menu', async () => {
    render(<MessageSaveAction messageId="a1" threadId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'chat.saveMessage.menuLabel' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'chat.saveMessage.pack' }));

    expect(save).toHaveBeenCalledWith(SaveToContextTarget.CONTEXT_PACK);
  });

  it('saves the message to memory from the menu', async () => {
    render(<MessageSaveAction messageId="a1" threadId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'chat.saveMessage.menuLabel' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'chat.saveMessage.memory' }));

    expect(save).toHaveBeenCalledWith(SaveToContextTarget.MEMORY);
  });
});
