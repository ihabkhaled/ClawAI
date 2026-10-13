import { describe, expect, it } from 'vitest';

import {
  CONTEXT_SAVE_MEMORY_MAX_CHARS,
  CONTEXT_SAVE_NEW_PACK_CHOICE,
  CONTEXT_SAVE_PACK_CONTENT_MAX_CHARS,
  CONTEXT_SAVE_PACK_NAME_MAX_CHARS,
} from '@/constants/context-save.constants';
import { MessageRole } from '@/enums';
import type { ChatMessage, ContextSaveProposal } from '@/types';
import {
  buildProposalDraft,
  draftToConfirmRequest,
  hasProposalErrors,
  proposalErrorText,
  proposalRevision,
  proposalTargetOfMessage,
  validateProposalDraft,
} from '@/utilities/context-save-proposal.utility';

const OPTIONS = [
  { id: 'p1', name: 'Trips', itemCount: 3 },
  { id: 'p2', name: 'Work', itemCount: 0 },
];

const proposal = (overrides: Partial<ContextSaveProposal> = {}): ContextSaveProposal => ({
  memory: { type: 'PREFERENCE', text: 'The user likes tea.' },
  pack: {
    source: 'USER_TEXT',
    content: 'Line one\n\nLine two',
    packId: null,
    packName: null,
    newPackName: null,
  },
  options: OPTIONS,
  ...overrides,
});

const message = (metadata: Record<string, unknown> | null, role = MessageRole.ASSISTANT) =>
  ({ id: 'm-1', role, metadata }) as unknown as ChatMessage;

describe('buildProposalDraft', () => {
  it('prefills both sections from the proposal, whole and untrimmed', () => {
    const draft = buildProposalDraft(
      proposal({
        pack: {
          source: 'PREVIOUS_MESSAGE',
          content: '  padded\n\n\ttext  ',
          packId: null,
          packName: null,
          newPackName: null,
        },
      }),
    );

    expect(draft.includeMemory).toBe(true);
    expect(draft.memoryType).toBe('PREFERENCE');
    expect(draft.memoryText).toBe('The user likes tea.');
    expect(draft.includePack).toBe(true);
    expect(draft.packContent).toBe('  padded\n\n\ttext  ');
  });

  it('switches off a section the model did not propose', () => {
    const draft = buildProposalDraft(proposal({ memory: null }));

    expect(draft.includeMemory).toBe(false);
    expect(draft.memoryType).toBe('FACT');
    expect(draft.memoryText).toBe('');
  });

  it('preselects the matched existing pack', () => {
    const draft = buildProposalDraft(
      proposal({
        pack: {
          source: 'USER_TEXT',
          content: 'x',
          packId: 'p2',
          packName: 'Work',
          newPackName: null,
        },
      }),
    );

    expect(draft.packChoice).toBe('p2');
  });

  it('does not preselect a pack id that is not among the options', () => {
    const draft = buildProposalDraft(
      proposal({
        pack: {
          source: 'USER_TEXT',
          content: 'x',
          packId: 'gone',
          packName: null,
          newPackName: null,
        },
      }),
    );

    expect(draft.packChoice).toBe('');
  });

  it('preselects a new pack named by the user, and falls back to the named pack as its name', () => {
    const named = buildProposalDraft(
      proposal({
        pack: {
          source: 'USER_TEXT',
          content: 'x',
          packId: null,
          packName: null,
          newPackName: 'Paris',
        },
      }),
    );
    const unmatched = buildProposalDraft(
      proposal({
        pack: {
          source: 'USER_TEXT',
          content: 'x',
          packId: null,
          packName: 'Lisbon',
          newPackName: null,
        },
      }),
    );

    expect(named.packChoice).toBe(CONTEXT_SAVE_NEW_PACK_CHOICE);
    expect(named.newPackName).toBe('Paris');
    expect(unmatched.packChoice).toBe(CONTEXT_SAVE_NEW_PACK_CHOICE);
    expect(unmatched.newPackName).toBe('Lisbon');
  });

  it('does not reuse the name of a matched pack as the name of a new one', () => {
    const draft = buildProposalDraft(
      proposal({
        pack: {
          source: 'USER_TEXT',
          content: 'x',
          packId: 'p1',
          packName: 'Trips',
          newPackName: null,
        },
      }),
    );

    expect(draft.newPackName).toBe('');
  });

  it('chooses a new pack when the user has none to pick from, otherwise makes them choose', () => {
    expect(buildProposalDraft(proposal({ options: [] })).packChoice).toBe(
      CONTEXT_SAVE_NEW_PACK_CHOICE,
    );
    expect(buildProposalDraft(proposal()).packChoice).toBe('');
  });
});

describe('validateProposalDraft / draftToConfirmRequest', () => {
  const valid = () => ({
    ...buildProposalDraft(proposal()),
    packChoice: 'p1',
  });

  it('accepts a complete draft and builds the exact request', () => {
    const draft = valid();

    expect(hasProposalErrors(validateProposalDraft(draft))).toBe(false);
    expect(draftToConfirmRequest(draft)).toEqual({
      memory: { type: 'PREFERENCE', text: 'The user likes tea.' },
      pack: { packId: 'p1', newPackName: null, content: 'Line one\n\nLine two' },
    });
  });

  it('requires at least one section', () => {
    const draft = { ...valid(), includeMemory: false, includePack: false };

    expect(validateProposalDraft(draft).nothingSelected).toBe(true);
    expect(draftToConfirmRequest(draft)).toBeNull();
  });

  it('refuses blank text and over-long text in an included section only', () => {
    expect(validateProposalDraft({ ...valid(), memoryText: '   \n ' }).memoryText).toBe('EMPTY');
    expect(
      validateProposalDraft({
        ...valid(),
        memoryText: 'a'.repeat(CONTEXT_SAVE_MEMORY_MAX_CHARS + 1),
      }).memoryText,
    ).toBe('TOO_LONG');
    expect(
      validateProposalDraft({
        ...valid(),
        packContent: 'a'.repeat(CONTEXT_SAVE_PACK_CONTENT_MAX_CHARS + 1),
      }).packContent,
    ).toBe('TOO_LONG');
    // An off section never blocks the save, however broken its text is.
    const memoryOff = { ...valid(), includeMemory: false, memoryText: '' };
    expect(validateProposalDraft(memoryOff).memoryText).toBeNull();
    expect(draftToConfirmRequest(memoryOff)?.memory).toBeNull();
  });

  it('accepts text at exactly the limit', () => {
    const draft = { ...valid(), memoryText: 'a'.repeat(CONTEXT_SAVE_MEMORY_MAX_CHARS) };

    expect(validateProposalDraft(draft).memoryText).toBeNull();
  });

  it('needs a pack to be chosen, and a name for a new one', () => {
    expect(validateProposalDraft({ ...valid(), packChoice: '' }).packChoice).toBe('REQUIRED');

    const newPack = { ...valid(), packChoice: CONTEXT_SAVE_NEW_PACK_CHOICE, newPackName: '  ' };
    expect(validateProposalDraft(newPack).newPackName).toBe('EMPTY');
    expect(
      validateProposalDraft({
        ...newPack,
        newPackName: 'n'.repeat(CONTEXT_SAVE_PACK_NAME_MAX_CHARS + 1),
      }).newPackName,
    ).toBe('TOO_LONG');
  });

  it('sends a new pack as a trimmed name with no id', () => {
    const request = draftToConfirmRequest({
      ...valid(),
      includeMemory: false,
      packChoice: CONTEXT_SAVE_NEW_PACK_CHOICE,
      newPackName: '  Paris plan ',
    });

    expect(request).toEqual({
      memory: null,
      pack: { packId: null, newPackName: 'Paris plan', content: 'Line one\n\nLine two' },
    });
  });

  it('sends memory text exactly as typed, not trimmed', () => {
    const request = draftToConfirmRequest({
      ...valid(),
      includePack: false,
      memoryText: ' tea \n',
    });

    expect(request?.memory?.text).toBe(' tea \n');
  });
});

describe('proposalTargetOfMessage', () => {
  it('returns the proposal of an assistant answer whose save is PROPOSED', () => {
    const target = proposalTargetOfMessage(
      message({ contextSave: { status: 'PROPOSED', proposal: proposal() } }),
    );

    expect(target?.messageId).toBe('m-1');
    expect(target?.proposal.options).toHaveLength(2);
  });

  it('is null for any other status, a missing proposal, a user message, or no message', () => {
    expect(
      proposalTargetOfMessage(message({ contextSave: { status: 'SAVED', proposal: proposal() } })),
    ).toBeNull();
    expect(proposalTargetOfMessage(message({ contextSave: { status: 'PROPOSED' } }))).toBeNull();
    expect(
      proposalTargetOfMessage(
        message({ contextSave: { status: 'PROPOSED', proposal: proposal() } }, MessageRole.USER),
      ),
    ).toBeNull();
    expect(proposalTargetOfMessage(message(null))).toBeNull();
    expect(proposalTargetOfMessage(undefined)).toBeNull();
  });
});

describe('proposalRevision (ADR-168)', () => {
  it('is the same for equal proposals and differs when anything in it changes', () => {
    expect(proposalRevision(proposal())).toBe(proposalRevision(proposal()));
    expect(proposalRevision(proposal())).not.toBe(proposalRevision(proposal({ memory: null })));
    expect(proposalRevision(proposal())).not.toBe(
      proposalRevision(proposal({ memory: { type: 'FACT', text: 'The user likes tea!' } })),
    );
  });
});

describe('proposalErrorText (ADR-168)', () => {
  const t = (key: string): string => key;

  it('names the reason of a known code after the generic line', () => {
    expect(proposalErrorText('PLAN_FEATURE_DISABLED', t)).toBe(
      'chat.contextSave.proposal.partialFailed chat.contextSave.reasons.PLAN',
    );
    expect(proposalErrorText('PLAN_CONTEXT_PACK_LIMIT_EXCEEDED', t)).toContain('reasons.LIMIT');
    expect(proposalErrorText('CONTEXT_SAVE_UNAVAILABLE', t)).toContain('reasons.UNAVAILABLE');
  });

  it('is only the generic line for an unknown or missing code', () => {
    expect(proposalErrorText('SOMETHING_NEW', t)).toBe('chat.contextSave.proposal.partialFailed');
    expect(proposalErrorText(undefined, t)).toBe('chat.contextSave.proposal.partialFailed');
  });
});

describe('pack name limit (ADR-168)', () => {
  it('is measured on the trimmed name, which is what the server receives', () => {
    const draft = {
      ...buildProposalDraft(proposal()),
      includePack: true,
      packChoice: CONTEXT_SAVE_NEW_PACK_CHOICE,
      newPackName: `  ${'n'.repeat(CONTEXT_SAVE_PACK_NAME_MAX_CHARS)}  `,
    };

    expect(validateProposalDraft(draft).newPackName).toBeNull();
    expect(draftToConfirmRequest(draft)?.pack?.newPackName).toHaveLength(
      CONTEXT_SAVE_PACK_NAME_MAX_CHARS,
    );
  });
});
