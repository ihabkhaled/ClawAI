import type { ReactElement } from 'react';

import { RuntimeProgressPageClient } from '@/components/admin/runtime-progress/RuntimeProgressPageClient';
import { isLocalAiRuntimeEnabled } from '@/lib/runtime-progress/runtime-mode';

export const dynamic = 'force-dynamic';

export default function AdminRuntimeProgressPage(): ReactElement {
  return <RuntimeProgressPageClient localAiEnabled={isLocalAiRuntimeEnabled()} />;
}
