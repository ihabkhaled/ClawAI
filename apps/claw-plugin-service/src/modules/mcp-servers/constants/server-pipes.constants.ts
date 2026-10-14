import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { serverIdSchema } from '../dto/mcp-server.dto';

export const SERVER_ID_PIPE = new ZodValidationPipe(serverIdSchema);
