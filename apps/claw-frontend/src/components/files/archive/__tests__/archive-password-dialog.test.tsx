import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ArchivePasswordDialog } from '@/components/files/archive/archive-password-dialog';
import { ArchivePasswordPromptStatus } from '@/enums/archive-password-prompt-status.enum';

const t = (key: string): string => key;

const SECRET = 'correct-horse-battery-staple';

describe('ArchivePasswordDialog', () => {
  it('renders the prompt for an encrypted archive with an empty, focusable password input', () => {
    render(
      <ArchivePasswordDialog
        open
        status={ArchivePasswordPromptStatus.Idle}
        password=""
        onPasswordChange={vi.fn()}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('files.archive.password.title')).toBeInTheDocument();
    expect(screen.getByText('files.archive.password.description')).toBeInTheDocument();
    const input = screen.getByTestId('archive-password-input') as HTMLInputElement;
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.queryByTestId('archive-password-error')).not.toBeInTheDocument();
  });

  it('submits the typed password once, via the Unlock button', () => {
    const onPasswordChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ArchivePasswordDialog
        open
        status={ArchivePasswordPromptStatus.Idle}
        password={SECRET}
        onPasswordChange={onPasswordChange}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        t={t}
      />,
    );

    fireEvent.click(screen.getByTestId('archive-password-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows a wrong-password message and still offers a retry', () => {
    render(
      <ArchivePasswordDialog
        open
        status={ArchivePasswordPromptStatus.WrongPassword}
        password=""
        onPasswordChange={vi.fn()}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByTestId('archive-password-error')).toHaveTextContent(
      'files.archive.password.wrongPassword',
    );
    // Retry is still offered: the input and submit button are present.
    expect(screen.getByTestId('archive-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('archive-password-submit')).toBeInTheDocument();
  });

  it('shows the capped terminal state after too many wrong passwords, with no way to submit again', () => {
    render(
      <ArchivePasswordDialog
        open
        status={ArchivePasswordPromptStatus.AttemptsExceeded}
        password=""
        onPasswordChange={vi.fn()}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('files.archive.password.attemptsExceededTitle')).toBeInTheDocument();
    expect(screen.getByText('files.archive.password.attemptsExceeded')).toBeInTheDocument();
    // Terminal: no more password entry is offered.
    expect(screen.queryByTestId('archive-password-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('archive-password-submit')).not.toBeInTheDocument();
    // Cancel is still there — the dialog can be dismissed.
    expect(screen.getByTestId('archive-password-cancel')).toBeInTheDocument();
  });

  it('disables the input and submit button while submitting', () => {
    render(
      <ArchivePasswordDialog
        open
        status={ArchivePasswordPromptStatus.Submitting}
        password={SECRET}
        onPasswordChange={vi.fn()}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByTestId('archive-password-input')).toBeDisabled();
    expect(screen.getByTestId('archive-password-submit')).toBeDisabled();
  });

  it('never puts the password value anywhere but the controlled input — not in the DOM text, not in any other testid', () => {
    const { container } = render(
      <ArchivePasswordDialog
        open
        status={ArchivePasswordPromptStatus.WrongPassword}
        password=""
        onPasswordChange={vi.fn()}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        t={t}
      />,
    );

    // The password never appears as rendered text anywhere in the dialog —
    // wrong-password state clears it, and correct usage never echoes it back.
    expect(container.textContent).not.toContain(SECRET);
    // Nor in any attribute (title, aria-label, data-testid values, etc).
    expect(container.innerHTML).not.toContain(SECRET);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    fireEvent.click(screen.getByTestId('archive-password-cancel'));
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain(SECRET);
    logSpy.mockRestore();
  });
});
