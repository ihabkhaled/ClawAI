import { z } from 'zod';
import { StreamChunkType } from '../../../common/enums/stream-chunk-type.enum';
import {
  STREAM_MAX_CHUNK_BYTES,
  STREAM_MAX_CHUNKS_PER_REQUEST,
} from '../../../common/constants/stream.constants';

const chunkSchema = z.object({
  type: z.nativeEnum(StreamChunkType),
  data: z.string().max(STREAM_MAX_CHUNK_BYTES),
  timestamp: z.string().datetime().optional(),
});

export const pushChunksSchema = z.object({
  chunks: z.array(chunkSchema).min(1).max(STREAM_MAX_CHUNKS_PER_REQUEST),
});

export type PushChunksDto = z.infer<typeof pushChunksSchema>;
