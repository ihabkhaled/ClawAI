'use client';

import { useState } from 'react';

import { FeedbackDialog } from '@/components/feedback/feedback-dialog';
import { FeedbackLauncher } from '@/components/feedback/feedback-launcher';

// Owns the open/close state for the global reporter. Mounted once in the
// portal shell so every authenticated page gets exactly one launcher.
//
// The dialog is only rendered while open: it owns a form mutation and upload
// state, and mounting that on every page would run react-query machinery for a
// dialog nobody opened.
export function FeedbackReporter(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <FeedbackLauncher onOpen={() => setIsOpen(true)} />
      {isOpen ? <FeedbackDialog open onOpenChange={setIsOpen} /> : null}
    </>
  );
}
