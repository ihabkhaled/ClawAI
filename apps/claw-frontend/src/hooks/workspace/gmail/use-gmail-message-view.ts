import { useState } from 'react';

import type { UseGmailMessageViewResult } from '@/types/gmail.types';

export function useGmailMessageView(initial: { hasHtml: boolean }): UseGmailMessageViewResult {
  const [showHtml, setShowHtml] = useState(initial.hasHtml);
  const [loadImages, setLoadImages] = useState(false);
  return { showHtml, setShowHtml, loadImages, setLoadImages };
}
