'use client';

import { useEffect, useState } from 'react';

export function useElapsedSince(startedAt: string, frozen: boolean): number | null {
  const start = Date.parse(startedAt);
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (frozen) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [frozen]);
  if (Number.isNaN(start)) {
    return null;
  }
  return Math.max(0, now - start);
}
