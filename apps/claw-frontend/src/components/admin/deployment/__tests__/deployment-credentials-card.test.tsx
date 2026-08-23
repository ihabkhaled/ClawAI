import { DeploymentCredentialSource } from '@claw/shared-types';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeploymentCredentialsCard } from '@/components/admin/deployment/deployment-credentials-card';
import type {
  DeploymentStatusContentProps,
  UseDeploymentCredentialsFormResult,
} from '@/types/deployment-page.types';

function statusWith(credentials: Record<string, unknown>): DeploymentStatusContentProps['status'] {
  return { credentials } as unknown as DeploymentStatusContentProps['status'];
}

function form(
  overrides: Partial<UseDeploymentCredentialsFormResult> = {},
): UseDeploymentCredentialsFormResult {
  return {
    repository: '',
    setRepository: vi.fn(),
    ref: '',
    setRef: vi.fn(),
    token: '',
    setToken: vi.fn(),
    isEditing: false,
    startEditing: vi.fn(),
    cancelEditing: vi.fn(),
    isSaving: false,
    isClearing: false,
    canSave: false,
    save: vi.fn(),
    clear: vi.fn(),
    ...overrides,
  };
}

const STORED = {
  source: DeploymentCredentialSource.DATABASE,
  repository: 'ihabkhaled/ClawAI',
  ref: 'main',
  tokenLastFour: 'abcd',
  updatedAt: '2026-08-22T14:43:55Z',
  isUsable: true,
};

describe('DeploymentCredentialsCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows only the last four characters of the token, never the token', () => {
    render(
      <DeploymentCredentialsCard
        t={(key) => key}
        locale="en"
        status={statusWith(STORED)}
        credentials={form()}
      />,
    );

    expect(screen.getByText('••••abcd')).toBeInTheDocument();
    expect(screen.getByText('ihabkhaled/ClawAI')).toBeInTheDocument();
  });

  it('offers removal only for credentials stored here, not for environment ones', () => {
    const { rerender } = render(
      <DeploymentCredentialsCard
        t={(key) => key}
        locale="en"
        status={statusWith(STORED)}
        credentials={form()}
      />,
    );
    expect(screen.getByText('adminDeployment.credentialsClear')).toBeInTheDocument();

    rerender(
      <DeploymentCredentialsCard
        t={(key) => key}
        locale="en"
        status={statusWith({ ...STORED, source: DeploymentCredentialSource.ENVIRONMENT })}
        credentials={form()}
      />,
    );
    expect(screen.queryByText('adminDeployment.credentialsClear')).not.toBeInTheDocument();
  });

  it('flags credentials that cannot be used', () => {
    render(
      <DeploymentCredentialsCard
        t={(key) => key}
        locale="en"
        status={statusWith({ ...STORED, isUsable: false })}
        credentials={form()}
      />,
    );

    expect(screen.getByText('adminDeployment.credentialsUnusable')).toBeInTheDocument();
  });

  it('masks the token field and says a blank one keeps the stored token', () => {
    render(
      <DeploymentCredentialsCard
        t={(key) => key}
        locale="en"
        status={statusWith(STORED)}
        credentials={form({ isEditing: true })}
      />,
    );

    const token = screen.getByLabelText('adminDeployment.credentialsToken');
    expect(token).toHaveAttribute('type', 'password');
    expect(token).toHaveAttribute('placeholder', 'adminDeployment.credentialsTokenKeep');
  });

  it('blocks saving until the form is valid', () => {
    const controller = form({ isEditing: true, canSave: false });
    render(
      <DeploymentCredentialsCard
        t={(key) => key}
        locale="en"
        status={statusWith(STORED)}
        credentials={controller}
      />,
    );

    expect(screen.getByText('adminDeployment.credentialsSave').closest('button')).toBeDisabled();
  });

  it('saves through the controller when valid', () => {
    const controller = form({ isEditing: true, canSave: true });
    render(
      <DeploymentCredentialsCard
        t={(key) => key}
        locale="en"
        status={statusWith(STORED)}
        credentials={controller}
      />,
    );

    fireEvent.click(screen.getByText('adminDeployment.credentialsSave'));
    expect(controller.save).toHaveBeenCalledOnce();
  });

  it('invites first-time configuration when nothing is installed', () => {
    render(
      <DeploymentCredentialsCard
        t={(key) => key}
        locale="en"
        status={statusWith({
          source: DeploymentCredentialSource.NONE,
          repository: null,
          ref: null,
          tokenLastFour: null,
          updatedAt: null,
          isUsable: false,
        })}
        credentials={form()}
      />,
    );

    expect(screen.getByText('adminDeployment.credentialsConfigure')).toBeInTheDocument();
  });
});
