'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { ARCHIVE_PASSWORD_ATTEMPTS_EXCEEDED_CODE } from '@/constants/archive.constants';
import { ArchivePasswordPromptStatus } from '@/enums/archive-password-prompt-status.enum';
import { ArchiveRejectionReason } from '@/enums/archive-rejection-reason.enum';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ApiClientError } from '@/services/shared/api-client';
import type { UseArchivePasswordPromptReturn } from '@/types/archive.types';
import { getArchiveRejection } from '@/utilities/archive-status.utility';

/**
 * The in-chat password prompt for an ARCHIVE_ENCRYPTED attachment
 * (POST /files/:id/archive-password on claw-file-service).
 *
 * Wrong-vs-exceeded is decided by the SERVER, never counted here: a 200 whose
 * fresh listing is still Encrypted is a wrong password (offer another try); a
 * 400 carrying ARCHIVE_PASSWORD_ATTEMPTS_EXCEEDED is the terminal state — no
 * more input is offered. This hook never logs the password and holds it only
 * in the one controlled input's state, cleared on every outcome.
 */
export function useArchivePasswordPrompt(fileId: string): UseArchivePasswordPromptReturn {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<ArchivePasswordPromptStatus>(
    ArchivePasswordPromptStatus.Idle,
  );

  const mutation = useMutation({
    mutationFn: (value: string) => filesRepository.submitArchivePassword(fileId, value),
    onSuccess: (listing) => {
      queryClient.setQueryData(queryKeys.files.archiveEntries(fileId), listing);
      const rejection = getArchiveRejection(listing.extractionError, listing.ingestionStatus);
      if (rejection?.reason === ArchiveRejectionReason.Encrypted) {
        setStatus(ArchivePasswordPromptStatus.WrongPassword);
        setPassword('');
        return;
      }
      setIsOpen(false);
      setStatus(ArchivePasswordPromptStatus.Idle);
      setPassword('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.files.archiveEntries(fileId) });
    },
    onError: (error: ApiClientError) => {
      setPassword('');
      setStatus(
        error.code === ARCHIVE_PASSWORD_ATTEMPTS_EXCEEDED_CODE
          ? ArchivePasswordPromptStatus.AttemptsExceeded
          : ArchivePasswordPromptStatus.Error,
      );
    },
  });

  const open = useCallback((): void => {
    setIsOpen(true);
    setStatus(ArchivePasswordPromptStatus.Idle);
  }, []);

  const onOpenChange = useCallback((next: boolean): void => {
    setIsOpen(next);
    if (!next) {
      setPassword('');
    }
  }, []);

  const submit = useCallback((): void => {
    if (password.length === 0 || status === ArchivePasswordPromptStatus.AttemptsExceeded) {
      return;
    }
    setStatus(ArchivePasswordPromptStatus.Submitting);
    mutation.mutate(password);
  }, [password, status, mutation]);

  return { isOpen, status, password, setPassword, open, onOpenChange, submit };
}
