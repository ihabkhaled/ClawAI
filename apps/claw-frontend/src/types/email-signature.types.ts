// v3 round 7 (2026-05-12) — Gmail signature library frontend types.
// Mirrors the backend Prisma model UserEmailSignature exactly (no field
// renames per the FE↔BE type mirroring rule).

export type EmailSignature = {
  id: string;
  userId: string;
  name: string;
  body: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmailSignatureRequest = {
  name: string;
  body: string;
  isDefault?: boolean;
};

export type UpdateEmailSignatureRequest = {
  name?: string;
  body?: string;
  isDefault?: boolean;
};
