import { useCallback, useState } from 'react';

import { useCanManageWorkspaceConfig } from '@/hooks/auth/use-can-manage-workspace-config';
import type {
  EmailSignatureDraft,
  UseEmailSignaturesPageResult,
} from '@/types/email-signature-page.types';
import type { EmailSignature } from '@/types/email-signature.types';

import {
  useCreateEmailSignature,
  useDeleteEmailSignature,
  useEmailSignaturesQuery,
  useUpdateEmailSignature,
} from './use-email-signatures';

const EMPTY_DRAFT: EmailSignatureDraft = {
  id: null,
  name: '',
  body: '',
  isDefault: false,
};

export function useEmailSignaturesPage(): UseEmailSignaturesPageResult {
  const canManage = useCanManageWorkspaceConfig();
  const query = useEmailSignaturesQuery();
  const createMutation = useCreateEmailSignature();
  const updateMutation = useUpdateEmailSignature();
  const deleteMutation = useDeleteEmailSignature();

  const [draft, setDraft] = useState<EmailSignatureDraft | null>(null);

  const startCreate = useCallback((): void => setDraft({ ...EMPTY_DRAFT }), []);

  const startEdit = useCallback(
    (sig: EmailSignature): void =>
      setDraft({ id: sig.id, name: sig.name, body: sig.body, isDefault: sig.isDefault }),
    [],
  );

  const closeDraft = useCallback((): void => setDraft(null), []);

  const updateDraftField = useCallback(
    <K extends keyof EmailSignatureDraft>(field: K, value: EmailSignatureDraft[K]): void => {
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
        body: draft.body,
        isDefault: draft.isDefault,
      });
    } else {
      await updateMutation.mutateAsync({
        id: draft.id,
        payload: { name: draft.name, body: draft.body, isDefault: draft.isDefault },
      });
    }
    setDraft(null);
  }, [draft, createMutation, updateMutation]);

  const deleteSignature = useCallback(
    async (id: string): Promise<void> => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  return {
    signatures: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    draft,
    startCreate,
    startEdit,
    closeDraft,
    updateDraftField,
    saveDraft,
    deleteSignature,

    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    saveError: createMutation.error ?? updateMutation.error,
    canManage,
  };
}
