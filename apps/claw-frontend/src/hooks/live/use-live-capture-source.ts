import { useSyncExternalStore } from 'react';

import type { LiveCaptureSource } from '@/enums/live.enum';
import {
  liveCaptureSourceServerSnapshot,
  pickLiveCaptureSource,
  subscribeLiveCaptureSource,
} from '@/utilities/live-capture-state.utility';

/**
 * The audio source this device will capture with, read only in the browser: the server render and
 * hydration see null (the tab wording), so the markup always matches before the real value applies.
 */
export function useLiveCaptureSource(): LiveCaptureSource | null {
  return useSyncExternalStore(
    subscribeLiveCaptureSource,
    pickLiveCaptureSource,
    liveCaptureSourceServerSnapshot,
  );
}
