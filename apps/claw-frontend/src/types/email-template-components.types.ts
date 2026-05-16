// v3 round 9 — component prop types for the template library page.

import type { EmailTemplateDraft } from './email-template-page.types';
import type { EmailTemplate } from './email-template.types';

export type EmailTemplateRowProps = {
  template: EmailTemplate;
  onEdit: (tpl: EmailTemplate) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  labels: {
    defaultBadge: string;
    subjectLabel: string;
    edit: string;
    delete: string;
    deleting: string;
  };
};

export type EmailTemplateDialogProps = {
  draft: EmailTemplateDraft | null;
  isSaving: boolean;
  saveError: Error | null;
  onUpdateField: <K extends keyof EmailTemplateDraft>(
    field: K,
    value: EmailTemplateDraft[K],
  ) => void;
  onClose: () => void;
  onSave: () => void;
  labels: {
    createTitle: string;
    editTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    subjectLabel: string;
    subjectPlaceholder: string;
    bodyLabel: string;
    bodyPlaceholder: string;
    defaultLabel: string;
    save: string;
    saving: string;
    cancel: string;
  };
};
