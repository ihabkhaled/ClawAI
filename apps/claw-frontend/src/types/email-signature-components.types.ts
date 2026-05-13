// v3 round 7 — component prop types for the signature library page.
// Kept separate from the controller-hook result type so the components
// can be imported without dragging the controller's React types.

import type { EmailSignatureDraft } from './email-signature-page.types';
import type { EmailSignature } from './email-signature.types';

export type EmailSignatureRowProps = {
  signature: EmailSignature;
  onEdit: (sig: EmailSignature) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  labels: {
    defaultBadge: string;
    edit: string;
    delete: string;
    deleting: string;
  };
};

export type EmailSignatureDialogProps = {
  draft: EmailSignatureDraft | null;
  isSaving: boolean;
  saveError: Error | null;
  onUpdateField: <K extends keyof EmailSignatureDraft>(
    field: K,
    value: EmailSignatureDraft[K],
  ) => void;
  onClose: () => void;
  onSave: () => void;
  labels: {
    createTitle: string;
    editTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    bodyLabel: string;
    bodyPlaceholder: string;
    defaultLabel: string;
    save: string;
    saving: string;
    cancel: string;
  };
};
