'use client';

import dynamic from 'next/dynamic';

/**
 * The full-model-list dialog, fetched only when someone opens it.
 *
 * The dialog is built on Radix, and importing it directly from the roster card
 * put Radix into the MARKETING HOMEPAGE's initial bundle — a landing page that
 * had no modal on it before. Mobile Lighthouse fell from 88 to 79.
 *
 * Nothing about the feature changes: the "Show all N models" button is still
 * there, still opens the same dialog. The code for it simply arrives on the
 * click instead of on first paint, which is the one moment nobody is waiting.
 *
 * `ssr: false` because a dialog that is closed renders nothing anyway, so
 * server-rendering it would cost HTML for no visible output.
 */
export const ModelFamilyDialog = dynamic(
  async () => (await import('./model-family-dialog')).ModelFamilyDialog,
  { ssr: false },
);
