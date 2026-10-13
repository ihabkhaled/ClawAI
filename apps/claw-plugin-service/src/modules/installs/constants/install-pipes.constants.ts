import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { installIdSchema, toolNameSchema } from '../dto/install.dto';

export const INSTALL_ID_PIPE = new ZodValidationPipe(installIdSchema);
export const TOOL_NAME_PIPE = new ZodValidationPipe(toolNameSchema);
