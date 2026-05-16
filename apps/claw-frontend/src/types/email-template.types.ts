// v3 round 9 (2026-05-14) — email template library frontend types.
// Mirrors the backend Prisma model UserEmailTemplate exactly (no field
// renames per the FE-mirror-BE rule).

export type EmailTemplate = {
  id: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmailTemplateRequest = {
  name: string;
  subject: string;
  body: string;
  isDefault?: boolean;
};

export type UpdateEmailTemplateRequest = {
  name?: string;
  subject?: string;
  body?: string;
  isDefault?: boolean;
};
