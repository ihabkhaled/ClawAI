export type WriteMemoryUsageData = {
  memoryId: string;
  userId: string;
  threadId: string;
  messageId: string;
  score: number;
  reason?: string | null;
};
