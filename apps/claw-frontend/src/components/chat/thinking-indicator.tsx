import { RuntimeProgressPanel } from '@/components/chat/runtime-progress';
import type { ThinkingIndicatorProps } from '@/types';

// Compatibility shim. The legacy ThinkingIndicator is now a thin wrapper
// around the pluggable RuntimeProgressPanel — call-sites in
// VirtualizedMessages, MessagesContent, etc. continue to import this path
// unchanged. PR2 will migrate the call-sites directly to
// RuntimeProgressPanel and delete this shim.
export function ThinkingIndicator(props: ThinkingIndicatorProps): React.ReactElement {
  return <RuntimeProgressPanel {...props} />;
}
