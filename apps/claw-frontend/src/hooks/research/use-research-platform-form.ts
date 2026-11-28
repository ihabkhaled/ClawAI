import { useState } from 'react';

import { RESEARCH_PLATFORM_SUBMIT_LABEL_KEYS } from '@/constants/research-platform.constants';
import type { UseResearchPlatformFormReturn } from '@/types/research-platform.types';
import {
  buildResearchPlatformRequest,
  researchPlatformSaveErrorKey,
  researchPlatformValidationErrorKey,
  toResearchPlatformUpdate,
} from '@/utilities/research-platform.utility';

import { useResearchPlatformFormState } from './use-research-platform-form-state';
import { useCreateResearchPlatform, useUpdateResearchPlatform } from './use-research-platforms';

/**
 * The add / edit dialog: validates the typed fields, then creates or patches. A failure keeps the
 * dialog open with a translated reason (never the server's text); success closes it.
 */
export function useResearchPlatformForm(): UseResearchPlatformFormReturn {
  const state = useResearchPlatformFormState();
  const create = useCreateResearchPlatform();
  const update = useUpdateResearchPlatform();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    const request = buildResearchPlatformRequest(state.form);
    const invalid = researchPlatformValidationErrorKey(request);
    setErrorKey(invalid);
    if (invalid !== null) {
      return;
    }
    try {
      if (state.editing === null) {
        await create.mutateAsync(request);
      } else {
        await update.mutateAsync({ id: state.editing.id, body: toResearchPlatformUpdate(request) });
      }
      state.close();
    } catch (error) {
      console.error('Research platform save failed', error);
      setErrorKey(researchPlatformSaveErrorKey(error));
    }
  };

  const reset = (): void => setErrorKey(null);
  const isSaving = create.isPending || update.isPending;
  const labels = RESEARCH_PLATFORM_SUBMIT_LABEL_KEYS[state.editing === null ? 'create' : 'edit'];

  return {
    ...state,
    openCreate: () => {
      reset();
      state.openCreate();
    },
    openEdit: (platform) => {
      reset();
      state.openEdit(platform);
    },
    onOpenChange: (open) => (open ? undefined : state.close()),
    errorKey,
    isSaving,
    submitLabelKey: isSaving ? labels.saving : labels.idle,
    submit,
  };
}
