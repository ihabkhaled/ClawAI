'use client';

import { useCallback, useRef, useState } from 'react';

import type { MediaRecordingKind } from '@/enums/media-recording-kind.enum';
import type {
  UseMediaRecordingConsentParams,
  UseMediaRecordingConsentReturn,
} from '@/types/media-recording.types';

/**
 * The consent gate in front of `useMediaRecorder.start`.
 *
 * Pressing the microphone or the camera opens a dialog and starts NOTHING; the
 * browser's own permission prompt appears only after the user confirms. That
 * ordering is the whole point: a permission prompt with no preceding
 * explanation asks the user to decide about a camera without telling them the
 * recording is uploaded and handed to a model.
 *
 * The dialog is shown even when the permission was already granted — this is
 * consent to send a recording of the user to a model, not a permission shim,
 * and a granted permission says nothing about that.
 */
export function useMediaRecordingConsent({
  start,
}: UseMediaRecordingConsentParams): UseMediaRecordingConsentReturn {
  const [pendingKind, setPendingKind] = useState<MediaRecordingKind | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  const request = useCallback((kind: MediaRecordingKind): void => {
    setPendingKind(kind);
  }, []);

  const cancel = useCallback((): void => {
    setPendingKind(null);
  }, []);

  const confirm = useCallback((): void => {
    if (pendingKind === null) {
      return;
    }
    setPendingKind(null);
    void start(pendingKind);
  }, [pendingKind, start]);

  const setOpen = useCallback((open: boolean): void => {
    if (!open) {
      setPendingKind(null);
    }
  }, []);

  // Radix would otherwise focus the first tabbable node, which is the dialog's
  // close button. The safe, reversible choice should not be the default one
  // the user's next Enter press lands on... but neither should the destructive
  // one be hidden: Confirm takes focus, Escape still cancels.
  const focusConfirmOnOpen = useCallback((event: Event): void => {
    event.preventDefault();
    confirmRef.current?.focus();
  }, []);

  return { pendingKind, request, confirm, cancel, setOpen, confirmRef, focusConfirmOnOpen };
}
