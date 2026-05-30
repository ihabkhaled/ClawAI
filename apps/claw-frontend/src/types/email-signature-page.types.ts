import type { EmailSignature } from './email-signature.types';

// v3 round 7 — controller hook return shape for the signature library
// page. Keeps the page TSX pure-render per the FE architecture rules.

export type EmailSignatureDraft = {
  id: string | null; // null when creating a brand-new row
  name: string;
  body: string;
  isDefault: boolean;
};

export type UseEmailSignaturesPageResult = {
  signatures: EmailSignature[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  draft: EmailSignatureDraft | null;
  startCreate: () => void;
  startEdit: (sig: EmailSignature) => void;
  closeDraft: () => void;
  updateDraftField: <K extends keyof EmailSignatureDraft>(
    field: K,
    value: EmailSignatureDraft[K],
  ) => void;
  saveDraft: () => Promise<void>;
  deleteSignature: (id: string) => Promise<void>;

  isSaving: boolean;
  isDeleting: boolean;
  saveError: Error | null;
  // True iff the current viewer is allowed to mutate workspace-level configs
  // (ADMIN or anyone holding ADMIN_WORKSPACE_AUTOMATION_MANAGE). Drives the
  // visibility of Create / Edit / Delete buttons. Backend remains the
  // authoritative enforcer.
  canManage: boolean;
};
