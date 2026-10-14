import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { PLUGIN_IMPORTS_QUERY_KEY } from '@/constants/plugin-import.constants';
import { PluginImportSourceMode } from '@/enums/plugin-import-source-mode.enum';
import { pluginImportsRepository } from '@/repositories/plugins/plugin-imports.repository';
import type {
  ImportedPluginView,
  PluginImportDraft,
  PluginImportForm,
  PluginImportPreviewResponse,
} from '@/types/plugin-import.types';

import { usePluginToast } from './use-plugin-toast';

/** Reads the chosen source into a preview. Nothing is installed by this call. */
export function usePluginImportPreview(): UseMutationResult<
  PluginImportPreviewResponse,
  Error,
  PluginImportForm
> {
  return useMutation({
    mutationFn: (form: PluginImportForm) => {
      if (form.mode === PluginImportSourceMode.Upload && form.file !== undefined) {
        return pluginImportsRepository.previewUpload(form.file, form.subdir);
      }
      return pluginImportsRepository.previewGithub(form.source, form.subdir);
    },
  });
}

/** Installs a reviewed draft. The checksum the user saw is what the service checks. */
export function usePluginImportConfirm(): UseMutationResult<
  ImportedPluginView,
  Error,
  PluginImportDraft
> {
  const queryClient = useQueryClient();
  const notify = usePluginToast();
  return useMutation({
    mutationFn: (draft: PluginImportDraft) =>
      pluginImportsRepository.confirm(draft.draftId, draft.checksum),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PLUGIN_IMPORTS_QUERY_KEY });
      notify('pluginImport.toast.installed');
    },
  });
}

export function useRemovePluginImport(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const notify = usePluginToast();
  return useMutation({
    mutationFn: (id: string) => pluginImportsRepository.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PLUGIN_IMPORTS_QUERY_KEY });
      notify('pluginImport.toast.removed');
    },
  });
}
