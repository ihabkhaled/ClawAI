import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmailTemplateRow } from '@/components/email-templates/email-template-row';
import type { EmailTemplate } from '@/types/email-template.types';

function makeTpl(overrides: Partial<EmailTemplate> = {}): EmailTemplate {
  return {
    id: 'tpl-1',
    userId: 'u-1',
    name: 'Welcome',
    subject: 'Hello there',
    body: 'Welcome aboard',
    isDefault: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  } as EmailTemplate;
}

const baseLabels = {
  defaultBadge: 'Default',
  subjectLabel: 'Subject',
  edit: 'Edit',
  delete: 'Delete',
  deleting: 'Deleting',
};

function renderRow(canManage: boolean): void {
  render(
    <EmailTemplateRow
      template={makeTpl()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      isDeleting={false}
      canManage={canManage}
      labels={baseLabels}
    />,
  );
}

describe('EmailTemplateRow — RBAC-driven visibility', () => {
  describe('as a regular USER (canManage=false)', () => {
    it('renders template name + subject + body (viewing always allowed)', () => {
      renderRow(false);
      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByText(/Hello there/)).toBeInTheDocument();
      expect(screen.getByText(/Welcome aboard/)).toBeInTheDocument();
    });

    it('hides Edit and Delete buttons (admin-only mutations)', () => {
      renderRow(false);
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  describe('as an ADMIN (canManage=true)', () => {
    it('renders Edit and Delete buttons', () => {
      renderRow(true);
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });
});
