import { useCallback, useMemo, useState } from 'react';

import { NOOP_VALUE_CHANGE } from '@/constants/plugin-mention.constants';
import { DEFAULT_RESEARCH_OPTIONS } from '@/constants/research.constants';
import { ResearchMode } from '@/enums/research-mode.enum';
import { useComposerAttachmentSurface } from '@/hooks/chat/use-composer-attachment-surface';
import { usePluginMentionSelection } from '@/hooks/chat/use-plugin-mention-selection';
import { useComposerAttachments } from '@/hooks/files/use-composer-attachments';
import { useResearchProviders } from '@/hooks/research/use-research-providers';
import type { OrchestrationContextPackPayload } from '@/types/composer-context.types';
import type { UseOrchestrationComposerReturn } from '@/types/hook.types';
import type { UsePluginMentionSelectionParams } from '@/types/plugin-mention.types';
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
 *
 * `prompt` opts the page into the `@` plugin picker: the page hands over its prompt text
 * and setter, the chips ride in `sharedPayload` as `pluginRefs`, and a mention belongs to
 * one run, so `clear()` drops it. A page that does not pass it (Repair and Verify only
 * rewrite or grade an answer, so plugin tools have nothing to do there) gets no picker.
 */
export function useOrchestrationComposer(
  disabled = false,
  prompt?: UsePluginMentionSelectionParams,
): UseOrchestrationComposerReturn {
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [research, setResearch] = useState<ResearchOptions>(DEFAULT_RESEARCH_OPTIONS);
  // Like research, the pack choice is a session preference: it survives clear().
  const [contextPackIds, setContextPackIds] = useState<string[]>([]);
  const providerQuery = useResearchProviders();
  const mentions = usePluginMentionSelection({
    value: prompt?.value ?? '',
    onValueChange: prompt?.onValueChange ?? NOOP_VALUE_CHANGE,
  });
  const pluginMentions = prompt === undefined ? undefined : mentions;
  const pluginPayload = pluginMentions?.payload;
  const { clear: clearMentions } = mentions;
  const attachments = useComposerAttachments({
    selectedFileIds,
    onChange: setSelectedFileIds,
    disabled,
  });
  const { ingestFiles, isUploading, pendingCount, progress } = attachments;
  // The same tray + chip strip as the chat composer: per-file state, Stop
  // processing for a video, cancel for a file still uploading.
  const { attachmentTray, attachmentChips } = useComposerAttachmentSurface({
    selectedFileIds,
    onSelectedFileIdsChange: setSelectedFileIds,
    attachments,
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

  const contextPackPayload = useMemo<OrchestrationContextPackPayload>(
    () => (contextPackIds.length === 0 ? {} : { contextPackIds }),
    [contextPackIds],
  );

  // EVERY request fragment a lab shares with chat, in one spread: a lab hook writes
  // `...composer.sharedPayload` and a new shared fragment reaches all ten pages by
  // being added here, not by editing ten hooks (rules/59).
  const sharedPayload = useMemo(
    () => ({ ...researchPayload, ...contextPackPayload, ...pluginPayload }),
    [researchPayload, contextPackPayload, pluginPayload],
  );

  const clear = useCallback((): void => {
    setSelectedFileIds([]);
    clearMentions();
  }, [clearMentions]);

  return {
    selectedFileIds,
    setSelectedFileIds,
    ingestFiles,
    isUploading,
    pendingCount,
    progress,
    attachmentTray,
    attachmentChips,
    research,
    setResearch,
    researchProviders: providerQuery.providers,
    isResearchProvidersLoading: providerQuery.isLoading,
    researchPayload,
    contextPackIds,
    setContextPackIds,
    contextPackPayload,
    pluginMentions,
    sharedPayload,
    clear,
  };
}
