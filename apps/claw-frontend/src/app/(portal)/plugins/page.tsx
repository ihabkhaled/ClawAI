'use client';

import { Suspense } from 'react';

import { PluginsPage } from '@/components/plugins/plugins-page';

/** `useSearchParams` in the Discover hook needs a Suspense boundary above it. */
export default function PluginsRoutePage() {
  return (
    <Suspense fallback={null}>
      <PluginsPage />
    </Suspense>
  );
}
