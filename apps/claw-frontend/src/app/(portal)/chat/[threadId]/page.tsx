'use client';

import { ChatThreadShell } from '@/components/chat/chat-thread-shell';
import { useThreadDetailPage } from '@/hooks/chat/use-thread-detail-page';

export default function ThreadDetailPage(): React.ReactElement {
  const { shellProps } = useThreadDetailPage();
  return <ChatThreadShell {...shellProps} />;
}
