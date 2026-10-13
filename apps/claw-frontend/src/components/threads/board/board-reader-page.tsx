'use client';

import type { ReactElement } from 'react';

import { BoardReaderView } from '@/components/threads/board/board-reader-view';
import { useBoardReader } from '@/hooks/threads/board/use-board-reader';

export function BoardReaderPage(): ReactElement {
  const state = useBoardReader();
  return <BoardReaderView state={state} />;
}
