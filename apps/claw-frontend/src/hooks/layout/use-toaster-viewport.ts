'use client';

import { useRef } from 'react';

import { useToast } from '@/components/ui/use-toast';
import { useFloatingObstacleClearance } from '@/hooks/layout/use-floating-obstacle-clearance';
import type { UseToasterViewportReturn } from '@/types';

/**
 * Controller for the global toast viewport: the queue, plus the ref the
 * clearance measurement needs.
 *
 * The ref is what lets the measurement ask "where is the toast column
 * horizontally" instead of assuming a corner — which is the only way the rule
 * works unchanged in Arabic and Persian, where the column mirrors.
 */
export function useToasterViewport(): UseToasterViewportReturn {
  const { toasts } = useToast();
  const viewportRef = useRef<HTMLOListElement | null>(null);

  useFloatingObstacleClearance(viewportRef);

  return { toasts, viewportRef };
}
