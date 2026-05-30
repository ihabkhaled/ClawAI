import { useCallback, useState } from 'react';

import { useCanManageWorkspaceConfig } from '@/hooks/auth/use-can-manage-workspace-config';
import type {
  EmailTemplateDraft,
  UseEmailTemplatesPageResult,
} from '@/types/email-template-page.types';
import type { EmailTemplate } from '@/types/email-template.types';

import {
  useCreateEmailTemplate,
  useDeleteEmailTemplate,
  useEmailTemplatesQuery,
  useUpdateEmailTemplate,
} from './use-email-templates';

const EMPTY_DRAFT: EmailTemplateDraft = {
  id: null,
  name: '',
  subject: '',
  body: '',
  isDefault: false,
};

export function useEmailTemplatesPage(): UseEmailTemplatesPageResult {
  const canManage = useCanManageWorkspaceConfig();
  const query = useEmailTemplatesQuery();
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();
  const deleteMutation = useDeleteEmailTemplate();

  const [draft, setDraft] = useState<EmailTemplateDraft | null>(null);

  const startCreate = useCallback((): void => setDraft({ ...EMPTY_DRAFT }), []);

  const startEdit = useCallback(
    (tpl: EmailTemplate): void =>
      setDraft({
        id: tpl.id,
        name: tpl.name,
        subject: tpl.subject,
        body: tpl.body,
        isDefault: tpl.isDefault,
      }),
    [],
  );

  const closeDraft = useCallback((): void => setDraft(null), []);

  const updateDraftField = useCallback(
    <K extends keyof EmailTemplateDraft>(field: K, value: EmailTemplateDraft[K]): void => {
      setDraft((prev) => (prev === null ? prev : { ...prev, [field]: value }));
    },
    [],
  );

  const saveDraft = useCallback(async (): Promise<void> => {
    if (draft === null) {
      return;
    }
    if (draft.id === null) {
      await createMutation.mutateAsync({
        name: draft.name,
        subject: draft.subject,
        body: draft.body,
        isDefault: draft.isDefault,
      });
    } else {
      await updateMutation.mutateAsync({
        id: draft.id,
        payload: {
          name: draft.name,
          subject: draft.subject,
          body: draft.body,
          isDefault: draft.isDefault,
        },
      });
    }
    setDraft(null);
  }, [draft, createMutation, updateMutation]);

  const deleteTemplate = useCallback(
    async (id: string): Promise<void> => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    draft,
    startCreate,
    startEdit,
    closeDraft,
    updateDraftField,
    saveDraft,
    deleteTemplate,

    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    saveError: createMutation.error ?? updateMutation.error,
    canManage,
  };
}
