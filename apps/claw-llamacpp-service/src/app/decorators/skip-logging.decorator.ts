import { SetMetadata } from '@nestjs/common';

export const SKIP_LOGGING_KEY = 'skipLogging';
export const SkipLogging = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_LOGGING_KEY, true);
