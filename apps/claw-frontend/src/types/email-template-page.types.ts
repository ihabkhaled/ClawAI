import type { EmailTemplate } from './email-template.types';

// v3 round 9 — controller hook return shape for the template library
// page. Keeps the page TSX pure-render per the FE architecture rules.

export type EmailTemplateDraft = {
  id: string | null; // null when creating a brand-new row
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
};

export type UseEmailTemplatesPageResult = {
  templates: EmailTemplate[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  draft: EmailTemplateDraft | null;
  startCreate: () => void;
  startEdit: (tpl: EmailTemplate) => void;
  closeDraft: () => void;
  updateDraftField: <K extends keyof EmailTemplateDraft>(
    field: K,
    value: EmailTemplateDraft[K],
  ) => void;
  saveDraft: () => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  isSaving: boolean;
  isDeleting: boolean;
  saveError: Error | null;
};
