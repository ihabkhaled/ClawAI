import { z } from 'zod';

import { CONTAINER_LOG_BATCH_MAX } from '../constants/container-log.constants';

/** One Docker json-file line as the log shipper forwards it. */
export const containerLogLineSchema = z.object({
  message: z.string(),
  container: z.string().min(1).max(200),
  stream: z.string().max(20).optional(),
  timestamp: z.string().max(64).optional(),
});

export const ingestContainerLogsSchema = z
  .array(containerLogLineSchema)
  .min(1)
  .max(CONTAINER_LOG_BATCH_MAX);

export type ContainerLogLine = z.infer<typeof containerLogLineSchema>;
export type IngestContainerLogsDto = z.infer<typeof ingestContainerLogsSchema>;
