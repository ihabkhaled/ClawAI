export type StreamChunkType = 'stdout' | 'stderr' | 'meta';

export type StreamChunk = {
  seq: number;
  type: StreamChunkType;
  data: string;
  timestamp: string;
};

export type StreamState = {
  cancelled: boolean;
  completed: boolean;
  lastSeq: number;
};
