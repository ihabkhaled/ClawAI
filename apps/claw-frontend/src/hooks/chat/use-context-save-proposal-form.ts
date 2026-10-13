'use client';

import { useMemo, useState } from 'react';

import type {
  ContextSaveMemoryType,
  ContextSaveProposal,
  ContextSaveProposalDraft,
  UseContextSaveProposalFormReturn,
} from '@/types';
import {
  buildProposalDraft,
  draftToConfirmRequest,
  hasProposalErrors,
  proposalRevision,
  validateProposalDraft,
} from '@/utilities/context-save-proposal.utility';

/**
 * The editable state of the "Remember this" dialog. Starts from the model's
 * proposal, whole; `request` is the exact body the server receives and is null
 * while the form cannot be saved, which is what disables the Save button.
 *
 * The form is keyed on the proposal's revision: when the server hands back a
 * different proposal (a confirm saved one half, so the proposal shrank to the
 * other), the draft starts again from it. Otherwise a retry would re-send the
 * half that is already saved and create it twice.
 */
export function useContextSaveProposalForm(
  proposal: ContextSaveProposal,
): UseContextSaveProposalFormReturn {
  const revision = proposalRevision(proposal);
  const [draft, setDraft] = useState<ContextSaveProposalDraft>(() => buildProposalDraft(proposal));
  const [seededRevision, setSeededRevision] = useState(revision);
  if (seededRevision !== revision) {
    // Adjusting state while rendering is React's way to reset on a changed input.
    setSeededRevision(revision);
    setDraft(buildProposalDraft(proposal));
  }
  const errors = useMemo(() => validateProposalDraft(draft), [draft]);
  const request = useMemo(() => draftToConfirmRequest(draft), [draft]);

  const patch = (change: Partial<ContextSaveProposalDraft>): void =>
    setDraft((current) => ({ ...current, ...change }));

  return {
    draft,
    errors,
    canSave: !hasProposalErrors(errors) && request !== null,
    request,
    setIncludeMemory: (includeMemory: boolean) => patch({ includeMemory }),
    setMemoryType: (memoryType: ContextSaveMemoryType) => patch({ memoryType }),
    setMemoryText: (memoryText: string) => patch({ memoryText }),
    setIncludePack: (includePack: boolean) => patch({ includePack }),
    setPackContent: (packContent: string) => patch({ packContent }),
    setPackChoice: (packChoice: string) => patch({ packChoice }),
    setNewPackName: (newPackName: string) => patch({ newPackName }),
  };
}
