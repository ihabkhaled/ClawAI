'use client';

import { ModelPicker } from '@/components/chat/model-picker';
import { useRegenerateWithModel } from '@/hooks/chat/use-regenerate-with-model';
import type { RegenerateWithModelProps } from '@/types';

/**
 * "Try again with…" beside Regenerate: the composer's model picker, where a
 * pick answers the same question again with that model (or with AUTO). The
 * server runs the same plan check as a new message, so a model the plan does
 * not allow is refused there, never silently swapped.
 */
export function RegenerateWithModel(props: RegenerateWithModelProps): React.ReactElement {
  const pickerProps = useRegenerateWithModel(props);
  return <ModelPicker {...pickerProps} />;
}
