import { useCallback, useMemo, useState } from 'react';

import { DEFAULT_RESEARCH_OPTIONS } from '@/constants/research.constants';
import { ResearchMode } from '@/enums/research-mode.enum';
import { useComposerAttachments } from '@/hooks/files/use-composer-attachments';
import { useResearchProviders } from '@/hooks/research/use-research-providers';
import type { UseOrchestrationComposerReturn } from '@/types/hook.types';
import type { OrchestrationResearchPayload, ResearchOptions } from '@/types/research.types';

/**
 * Attachment state for an orchestration lab page.
 *
 * Compare has had attachments since it shipped; the other nine pages could not
 * express them at all — their backend DTOs had no `fileIds` field and their
 * pages had no picker. The result was that whether you could hand the model a
 * document depended on which lab you happened to open.
 *
 * This owns the selected list so a page does not have to, and pairs it with
 * `useComposerAttachments` so paste and drag-drop go through the same upload
 * pipeline — antivirus, magic-byte check, chunking — as the paperclip.
 *
 * `clear()` is called after a successful send, matching Compare: a lab run is
 * one question, and leaving the attachments selected silently re-sends them
 * with the next one.
 *
 * It also owns web research for the labs. The backend path has been complete
 * for a long time — every lab DTO spreads `researchFields`, every lab manager
 * calls `enrichForOrchestration` — and it never once ran, because no lab page
 * put `researchMode` on a payload. The default is AUTO, the same default the
 * chat composer uses, so a lab question about today's news stops being
 * answered from training data.
 *
 * The research selection deliberately survives `clear()`: it is a preference
 * for the session, not part of the question, and resetting it after every run
 * would silently turn research back to AUTO under a user who chose NONE.
 */
export function useOrchestrationComposer(disabled = false): UseOrchestrationComposerReturn {
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [research, setResearch] = useState<ResearchOptions>(DEFAULT_RESEARCH_OPTIONS);
  const providerQuery = useResearchProviders();
  const { ingestFiles, isUploading, pendingCount } = useComposerAttachments({
    selectedFileIds,
    onChange: setSelectedFileIds,
    disabled,
  });

  // NONE is expressed by omitting the fields, not by sending the string. The
  // backend resolves an absent mode to NONE anyway, and an absent field keeps
  // the DTO — and the plan gate that reads it — exactly as it was before.
  const researchPayload = useMemo<OrchestrationResearchPayload>(() => {
    if (research.mode === ResearchMode.NONE) {
      return {};
    }
    return {
      researchMode: research.mode,
      ...(research.providerId === undefined ? {} : { researchProviderId: research.providerId }),
    };
  }, [research]);

  const clear = useCallback((): void => {
    setSelectedFileIds([]);
  }, []);

  return {
    selectedFileIds,
    setSelectedFileIds,
    ingestFiles,
    isUploading,
    pendingCount,
    research,
    setResearch,
    researchProviders: providerQuery.providers,
    isResearchProvidersLoading: providerQuery.isLoading,
    researchPayload,
    clear,
  };
}
