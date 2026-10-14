import { useState } from 'react';

import {
  PLUGIN_IMPORT_EMPTY_FORM,
  PLUGIN_IMPORT_UPLOAD_TOO_LARGE_KEY,
} from '@/constants/plugin-import.constants';
import { PluginImportPreviewKind } from '@/enums/plugin-import-preview-kind.enum';
import { PluginImportSourceMode } from '@/enums/plugin-import-source-mode.enum';
import { useTranslation } from '@/lib/i18n';
import type {
  PluginImportCandidate,
  PluginImportDraft,
  PluginImportForm,
  PluginImportPreviewResponse,
  UsePluginImportPageReturn,
} from '@/types/plugin-import.types';
import {
  importErrorText,
  isUploadTooLarge,
  pluginImportErrorKey,
  pluginImportRetryTime,
} from '@/utilities/plugin-import.utility';

import {
  usePluginImportConfirm,
  usePluginImportPreview,
  useRemovePluginImport,
} from './use-plugin-import-actions';
import { usePluginImports } from './use-plugin-imports';

/** Import a plugin: choose a source, read the preview, review it, confirm. Also lists what is imported. */
export function usePluginImportPage(): UsePluginImportPageReturn {
  const { t, locale } = useTranslation();
  const imports = usePluginImports();
  const previewCall = usePluginImportPreview();
  const confirmCall = usePluginImportConfirm();
  const removeCall = useRemovePluginImport();
  const [form, setForm] = useState<PluginImportForm>(PLUGIN_IMPORT_EMPTY_FORM);
  const [response, setResponse] = useState<PluginImportPreviewResponse | undefined>(undefined);
  const [acknowledged, setAcknowledged] = useState(false);
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);

  const draft: PluginImportDraft | undefined =
    response?.kind === PluginImportPreviewKind.Plugin ? response.draft : undefined;
  const marketplace = response?.kind === PluginImportPreviewKind.Marketplace ? response : undefined;
  const hasSource =
    form.mode === PluginImportSourceMode.Github
      ? form.source.trim() !== ''
      : form.file !== undefined;
  const failure = previewCall.error ?? confirmCall.error ?? removeCall.error;
  const errorKey = localErrorKey ?? (failure === null ? null : pluginImportErrorKey(failure));
  const retryTime = localErrorKey === null ? pluginImportRetryTime(failure, locale) : undefined;

  const run = (next: PluginImportForm): void => {
    setLocalErrorKey(null);
    setAcknowledged(false);
    previewCall.mutate(next, {
      onSuccess: (data) => {
        setResponse(data);
      },
    });
  };

  const reset = (): void => {
    setResponse(undefined);
    setAcknowledged(false);
    setLocalErrorKey(null);
    previewCall.reset();
    confirmCall.reset();
  };

  return {
    t,
    form,
    setMode: (mode) => {
      setForm({ ...form, mode });
    },
    setSource: (source) => {
      setForm({ ...form, source, subdir: '' });
    },
    setFile: (file) => {
      if (file !== undefined && isUploadTooLarge(file)) {
        setLocalErrorKey(PLUGIN_IMPORT_UPLOAD_TOO_LARGE_KEY);
        setForm({ ...form, file: undefined });
        return;
      }
      setLocalErrorKey(null);
      setForm({ ...form, file, subdir: '' });
    },
    canPreview: hasSource && !previewCall.isPending,
    preview: () => {
      run(form);
    },
    isPreviewing: previewCall.isPending,
    draft,
    candidates: marketplace?.candidates,
    marketplaceName: marketplace?.name ?? '',
    chooseCandidate: (candidate: PluginImportCandidate) => {
      const next: PluginImportForm =
        candidate.github === undefined
          ? { ...form, subdir: candidate.subdir ?? '' }
          : {
              mode: PluginImportSourceMode.Github,
              source: candidate.github,
              subdir: '',
              file: undefined,
            };
      setForm(next);
      run(next);
    },
    acknowledged,
    setAcknowledged,
    canInstall: draft !== undefined && acknowledged && !confirmCall.isPending,
    install: () => {
      if (draft !== undefined && acknowledged) {
        confirmCall.mutate(draft, { onSuccess: reset });
      }
    },
    isInstalling: confirmCall.isPending,
    discard: reset,
    errorMessage: errorKey === null ? null : importErrorText(t, errorKey, retryTime),
    imported: imports.list,
    isLoadingImported: imports.isLoading,
    removingId: removeCall.isPending ? removeCall.variables : null,
    remove: (plugin) => {
      removeCall.mutate(plugin.id);
    },
  };
}
