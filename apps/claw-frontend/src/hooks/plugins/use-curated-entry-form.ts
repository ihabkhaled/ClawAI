import type { CuratedEntryView, CuratedLocaleText, PluginToolRiskLevel } from '@claw/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ADMIN_CURATION_QUERY_KEYS } from '@/constants/plugin-admin-curation.constants';
import { useTranslation } from '@/lib/i18n';
import { pluginAdminCurationRepository } from '@/repositories/plugins/plugin-admin-curation.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  CuratedFormState,
  CuratedFormTextField,
  CuratedFormValues,
} from '@/types/plugin-admin-curation.types';
import {
  adminCurationErrorKey,
  buildEntryRequest,
  buildPreviewRequest,
  emptyCuratedForm,
  formFromEntry,
  toolsFromPreview,
} from '@/utilities/plugin-admin-curation.utility';

import { usePluginToast } from './use-plugin-toast';

const EMPTY_TEXT: CuratedLocaleText = { name: '', summary: '', description: '' };

/**
 * The create / edit form of a curated entry. The preview calls the server for its real tools
 * (the key typed here travels once and is dropped); Save needs at least one selected tool, and
 * Publish is re-checked by the server against a fresh tools list.
 */
export function useCuratedEntryForm(
  entry: CuratedEntryView | null,
  onDone: () => void,
): CuratedFormState {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const notify = usePluginToast();
  const isEdit = entry !== null;
  const [values, setValues] = useState<CuratedFormValues>(
    entry === null ? emptyCuratedForm() : formFromEntry(entry),
  );
  const [locale, setLocale] = useState('en');
  const [previewed, setPreviewed] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);

  const previewMutation = useMutation({
    mutationFn: () => pluginAdminCurationRepository.previewTools(buildPreviewRequest(values)),
    onSuccess: (preview) => {
      setValues((current) => ({ ...current, tools: toolsFromPreview(preview, current.tools) }));
      setSkippedCount(preview.skipped.length + preview.tools.filter((x) => !x.curatable).length);
      setPreviewed(true);
    },
  });
  const saveMutation = useMutation({
    mutationFn: (publish: boolean) => {
      const body = buildEntryRequest(values, isEdit, publish);
      return entry === null
        ? pluginAdminCurationRepository.createEntry(body)
        : pluginAdminCurationRepository.updateEntry(entry.slug, body);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_CURATION_QUERY_KEYS.entries }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.adminCatalog() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.catalogRoot() }),
      ]);
      notify('pluginsAdminCatalog.toast.saved');
      onDone();
    },
  });

  const failure = previewMutation.error ?? saveMutation.error;
  return {
    isEdit,
    values,
    locale,
    setLocale,
    setField: (key, value) => {
      setValues((current) => ({ ...current, [key]: value }));
    },
    setText: (field: CuratedFormTextField, value: string) => {
      setValues((current) => ({
        ...current,
        texts: {
          ...current.texts,
          [locale]: { ...(current.texts[locale] ?? EMPTY_TEXT), [field]: value },
        },
      }));
    },
    toggleTool: (name: string, selected: boolean) => {
      setValues((current) => ({
        ...current,
        tools: current.tools.map((tool) => (tool.name === name ? { ...tool, selected } : tool)),
      }));
    },
    setToolRisk: (name: string, risk: PluginToolRiskLevel) => {
      setValues((current) => ({
        ...current,
        tools: current.tools.map((tool) =>
          tool.name === name ? { ...tool, riskLevel: risk } : tool,
        ),
      }));
    },
    preview: () => {
      previewMutation.mutate();
    },
    isPreviewing: previewMutation.isPending,
    previewed,
    skippedCount,
    save: (publish) => {
      saveMutation.mutate(publish);
    },
    isSaving: saveMutation.isPending,
    errorMessage: failure === null ? null : t(adminCurationErrorKey(failure)),
  };
}
