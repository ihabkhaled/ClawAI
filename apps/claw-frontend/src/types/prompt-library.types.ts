import type { PromptLibraryView } from '@/enums/prompt-library.enum';

/** One saved prompt, exactly as chat-service returns it (ADR-138). */
export type PromptTemplate = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  /** `{{name}}` placeholders found in `body`, extracted by the server. */
  variables: string[];
};

export type PromptTemplatePage = {
  items: PromptTemplate[];
  nextCursor: string | null;
};

export type PromptTemplateFilters = {
  q: string;
  tag: string | null;
  favoriteOnly: boolean;
};

export type ListPromptTemplatesParams = {
  q?: string;
  tag?: string;
  favorite?: boolean;
  cursor?: string;
  limit?: number;
};

export type CreatePromptTemplateInput = {
  title: string;
  body: string;
  tags: string[];
  isFavorite?: boolean;
};

export type UpdatePromptTemplateInput = Partial<CreatePromptTemplateInput>;

export type UpdatePromptTemplateVariables = {
  id: string;
  input: UpdatePromptTemplateInput;
};

export type PromptTemplateFormValues = {
  title: string;
  body: string;
  /** Comma-separated; parsed by `parsePromptTags`. */
  tags: string;
};

export type PromptLibraryDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  view: PromptLibraryView;
  filters: PromptTemplateFilters;
  onFiltersChange: (filters: PromptTemplateFilters) => void;
  templates: PromptTemplate[];
  availableTags: string[];
  /** Saved prompts loaded so far (unfiltered), and whether that is near the cap. */
  savedCount: number;
  isNearLimit: boolean;
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onChoose: (template: PromptTemplate) => void;
  onToggleFavorite: (template: PromptTemplate) => void;
  onStartCreate: () => void;
  onStartEdit: (template: PromptTemplate) => void;
  pendingDeleteId: string | null;
  onRequestDelete: (id: string | null) => void;
  onConfirmDelete: (id: string) => void;
  editing: PromptTemplate | null;
  isSaving: boolean;
  onSave: (values: PromptTemplateFormValues) => void;
  filling: PromptTemplate | null;
  onSubmitFill: (values: Record<string, string>) => void;
  onBack: () => void;
};

export type PromptLibraryButtonProps = {
  /** Receives the final text (filled or literal) to put into the composer. */
  onInsert: (text: string) => void;
  disabled: boolean;
};

/** The list reads the same bag the dialog receives, minus the view switching. */
export type PromptTemplateListProps = PromptLibraryDialogProps;

export type PromptTemplateFormProps = {
  editing: PromptTemplate | null;
  isSaving: boolean;
  onSave: (values: PromptTemplateFormValues) => void;
  onBack: () => void;
};

export type PromptTemplateFillFormProps = {
  template: PromptTemplate;
  onSubmit: (values: Record<string, string>) => void;
  onBack: () => void;
};
