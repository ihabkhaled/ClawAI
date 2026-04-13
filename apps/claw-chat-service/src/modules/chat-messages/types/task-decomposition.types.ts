export type SubTask = {
  title: string;
  instruction: string;
  category: string;
};

export type SubTaskResult = {
  title: string;
  instruction: string;
  category: string;
  result: string;
  provider: string;
  model: string;
  latencyMs: number;
};

export type TaskDecompositionResponse = {
  messageId: string;
  threadId: string;
};
