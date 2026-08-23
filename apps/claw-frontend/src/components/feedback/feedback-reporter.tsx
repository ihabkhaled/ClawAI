'use client';

import { useState } from 'react';

import { FeedbackDialog } from '@/components/feedback/feedback-dialog';
import { FeedbackLauncher } from '@/components/feedback/feedback-launcher';

// Owns the open/close state for the global feedback reporter. Mounted once in
// the portal shell so every authenticated page gets exactly one launcher.
export function FeedbackReporter(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <FeedbackLauncher onOpen={() => setIsOpen(true)} />
      <FeedbackDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
