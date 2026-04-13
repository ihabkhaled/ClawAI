import { PARALLEL_GRID_COL_CLASSES } from '@/constants';
import type { ChatMessage, MessageRenderItem, ParallelModelResponse } from '@/types';

export function groupParallelMessages(messages: ChatMessage[]): MessageRenderItem[] {
  const items: MessageRenderItem[] = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    if (!msg) {
      i++;
      continue;
    }
    const meta = msg.metadata as Record<string, unknown> | null;
    if (meta?.['parallelExecution'] === true) {
      const groupId = meta['parallelGroupId'];
      const group: ChatMessage[] = [msg];
      let j = i + 1;
      while (j < messages.length) {
        const next = messages[j];
        if (!next) {
          break;
        }
        const nextMeta = next.metadata as Record<string, unknown> | null;
        if (nextMeta?.['parallelExecution'] !== true) {
          break;
        }
        if (groupId !== undefined && nextMeta['parallelGroupId'] !== groupId) {
          break;
        }
        group.push(next);
        j++;
      }
      items.push({ kind: 'parallel', messages: group });
      i = j;
    } else {
      items.push({ kind: 'single', message: msg });
      i++;
    }
  }
  return items;
}

export function getParallelColClass(count: number): string {
  return PARALLEL_GRID_COL_CLASSES[String(count)] ?? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';
}

export function getFastestModel(responses: ParallelModelResponse[]): string | null {
  const completed = responses.filter((r) => r.status === 'completed');
  if (completed.length === 0) {
    return null;
  }
  const fastest = completed.reduce((prev, curr) => (curr.latencyMs < prev.latencyMs ? curr : prev));
  return fastest.model;
}
