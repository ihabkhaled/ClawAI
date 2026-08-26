import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NlDraftDialog } from '@/components/workspace-chains/nl-draft-dialog';
import type { ChainDsl } from '@/types';

const t = (key: string): string => key;

function makeDsl(overrides: Partial<ChainDsl> = {}): ChainDsl {
  return {
    steps: [{ id: 's1', connectorId: 'jira-1', actionType: 'CREATE_TICKET', payload: {} }],
    ...overrides,
  };
}

describe('NlDraftDialog', () => {
  it('disables Draft until a prompt is entered, and calls onDraft with the trimmed prompt', async () => {
    const onDraft = vi.fn();
    const user = userEvent.setup();
    render(
      <NlDraftDialog
        open
        onClose={vi.fn()}
        onDraft={onDraft}
        isDraftPending={false}
        draftError={null}
        draft={null}
        onSave={vi.fn()}
        isSavePending={false}
        saveError={null}
        t={t}
      />,
    );

    const draftButton = screen.getByRole('button', { name: 'workspaceChains.nlDraft.draft' });
    expect(draftButton).toBeDisabled();

    await user.type(
      screen.getByLabelText('workspaceChains.nlDraft.promptLabel'),
      '  file a jira ticket  ',
    );
    await user.click(screen.getByRole('button', { name: 'workspaceChains.nlDraft.draft' }));

    expect(onDraft).toHaveBeenCalledWith('file a jira ticket');
  });

  it('shows the drafting label and disables the button while pending', () => {
    render(
      <NlDraftDialog
        open
        onClose={vi.fn()}
        onDraft={vi.fn()}
        isDraftPending
        draftError={null}
        draft={null}
        onSave={vi.fn()}
        isSavePending={false}
        saveError={null}
        t={t}
      />,
    );
    expect(screen.getByRole('button', { name: 'workspaceChains.nlDraft.drafting' })).toBeDisabled();
  });

  it('renders the draft error message when present', () => {
    render(
      <NlDraftDialog
        open
        onClose={vi.fn()}
        onDraft={vi.fn()}
        isDraftPending={false}
        draftError="Something went wrong"
        draft={null}
        onSave={vi.fn()}
        isSavePending={false}
        saveError={null}
        t={t}
      />,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows the no-match message when the draft has zero steps, with no Save button', () => {
    render(
      <NlDraftDialog
        open
        onClose={vi.fn()}
        onDraft={vi.fn()}
        isDraftPending={false}
        draftError={null}
        draft={makeDsl({ steps: [] })}
        onSave={vi.fn()}
        isSavePending={false}
        saveError={null}
        t={t}
      />,
    );
    expect(screen.getByText('workspaceChains.nlDraft.noMatch')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'workspaceChains.nlDraft.save' }),
    ).not.toBeInTheDocument();
  });

  it('previews draft steps and disables Save until a name is entered', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <NlDraftDialog
        open
        onClose={vi.fn()}
        onDraft={vi.fn()}
        isDraftPending={false}
        draftError={null}
        draft={makeDsl()}
        onSave={onSave}
        isSavePending={false}
        saveError={null}
        t={t}
      />,
    );

    expect(screen.getByText('CREATE_TICKET')).toBeInTheDocument();
    expect(screen.getByText('jira-1')).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: 'workspaceChains.nlDraft.save' });
    expect(saveButton).toBeDisabled();

    await user.type(
      screen.getByLabelText(/workspaceChains.nlDraft.nameLabel/),
      '  My automation  ',
    );
    await user.click(screen.getByRole('button', { name: 'workspaceChains.nlDraft.save' }));

    expect(onSave).toHaveBeenCalledWith('My automation');
  });

  it('shows the saving label and disables Save while pending', () => {
    render(
      <NlDraftDialog
        open
        onClose={vi.fn()}
        onDraft={vi.fn()}
        isDraftPending={false}
        draftError={null}
        draft={makeDsl()}
        onSave={vi.fn()}
        isSavePending
        saveError={null}
        t={t}
      />,
    );
    expect(screen.getByRole('button', { name: 'workspaceChains.nlDraft.saving' })).toBeDisabled();
  });

  it('renders the save error message when present', () => {
    render(
      <NlDraftDialog
        open
        onClose={vi.fn()}
        onDraft={vi.fn()}
        isDraftPending={false}
        draftError={null}
        draft={makeDsl()}
        onSave={vi.fn()}
        isSavePending={false}
        saveError="Save failed"
        t={t}
      />,
    );
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <NlDraftDialog
        open
        onClose={onClose}
        onDraft={vi.fn()}
        isDraftPending={false}
        draftError={null}
        draft={null}
        onSave={vi.fn()}
        isSavePending={false}
        saveError={null}
        t={t}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
