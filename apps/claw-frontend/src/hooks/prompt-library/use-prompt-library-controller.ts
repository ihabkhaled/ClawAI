import { useCallback, useMemo, useState } from 'react';

import { PromptLibraryView } from '@/enums/prompt-library.enum';
import { usePromptTemplateMutations } from '@/hooks/prompt-library/use-prompt-template-mutations';
import { usePromptTemplates } from '@/hooks/prompt-library/use-prompt-templates';
import type {
  PromptLibraryButtonProps,
  PromptLibraryDialogProps,
  PromptTemplate,
  PromptTemplateFilters,
  PromptTemplateFormValues,
} from '@/types';
import { fillTemplate, parsePromptTags } from '@/utilities/prompt-template.utility';

const EMPTY_FILTERS: PromptTemplateFilters = { q: '', tag: null, favoriteOnly: false };

/**
 * Everything the prompt-library dialog needs, resolved in one place so the
 * components stay pure render. Choosing a template either inserts it straight
 * away (no variables) or moves to the fill step first.
 */
export function usePromptLibraryController(
  props: PromptLibraryButtonProps,
): PromptLibraryDialogProps {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<PromptLibraryView>(PromptLibraryView.List);
  const [filters, setFilters] = useState<PromptTemplateFilters>(EMPTY_FILTERS);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [filling, setFilling] = useState<PromptTemplate | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const query = usePromptTemplates(filters, isOpen);
  const mutations = usePromptTemplateMutations();

  const templates = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.items),
    [query.data],
  );
  const availableTags = useMemo(() => {
    const tags = new Set<string>(filters.tag === null ? [] : [filters.tag]);
    for (const template of templates) {
      for (const tag of template.tags) {
        tags.add(tag);
      }
    }
    return [...tags].sort();
  }, [templates, filters.tag]);

  const backToList = useCallback((): void => {
    setView(PromptLibraryView.List);
    setEditing(null);
    setFilling(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean): void => {
      setIsOpen(open);
      if (!open) {
        backToList();
        setPendingDeleteId(null);
      }
    },
    [backToList],
  );

  const insert = (template: PromptTemplate, text: string): void => {
    props.onInsert(text);
    mutations.markUsed.mutate(template.id);
    handleOpenChange(false);
  };

  const onChoose = (template: PromptTemplate): void => {
    if (template.variables.length === 0) {
      insert(template, template.body);
      return;
    }
    setFilling(template);
    setView(PromptLibraryView.Fill);
  };

  const onSubmitFill = (values: Record<string, string>): void => {
    if (filling !== null) {
      insert(filling, fillTemplate(filling.body, values));
    }
  };

  const onSave = (values: PromptTemplateFormValues): void => {
    const input = {
      title: values.title.trim(),
      body: values.body,
      tags: parsePromptTags(values.tags),
    };
    const options = { onSuccess: backToList };
    if (editing === null) {
      mutations.create.mutate(input, options);
    } else {
      mutations.update.mutate({ id: editing.id, input }, options);
    }
  };

  return {
    isOpen,
    onOpenChange: handleOpenChange,
    view,
    filters,
    onFiltersChange: setFilters,
    templates,
    availableTags,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    onLoadMore: () => void query.fetchNextPage(),
    onChoose,
    onToggleFavorite: (template) =>
      mutations.update.mutate({ id: template.id, input: { isFavorite: !template.isFavorite } }),
    onStartCreate: () => {
      setEditing(null);
      setView(PromptLibraryView.Form);
    },
    onStartEdit: (template) => {
      setEditing(template);
      setView(PromptLibraryView.Form);
    },
    pendingDeleteId,
    onRequestDelete: setPendingDeleteId,
    onConfirmDelete: (id) =>
      mutations.remove.mutate(id, { onSettled: () => setPendingDeleteId(null) }),
    editing,
    isSaving: mutations.create.isPending || mutations.update.isPending,
    onSave,
    filling,
    onSubmitFill,
    onBack: backToList,
  };
}
