import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmailSignatureRow } from '@/components/email-signatures/email-signature-row';
import type { EmailSignature } from '@/types/email-signature.types';

function makeSig(overrides: Partial<EmailSignature> = {}): EmailSignature {
  return {
    id: 'sig-1',
    userId: 'u-1',
    name: 'My Sig',
    body: 'Best,\nAlex',
    isDefault: true,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  } as EmailSignature;
}

const baseLabels = {
  defaultBadge: 'Default',
  edit: 'Edit',
  delete: 'Delete',
  deleting: 'Deleting',
};

function renderRow(canManage: boolean): void {
  render(
    <EmailSignatureRow
      signature={makeSig()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      isDeleting={false}
      canManage={canManage}
      labels={baseLabels}
    />,
  );
}

describe('EmailSignatureRow — RBAC-driven visibility', () => {
  describe('as a regular USER (canManage=false)', () => {
    it('renders the signature name + body (read-only viewing stays available)', () => {
      renderRow(false);
      expect(screen.getByText('My Sig')).toBeInTheDocument();
      expect(screen.getByText(/Alex/)).toBeInTheDocument();
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
