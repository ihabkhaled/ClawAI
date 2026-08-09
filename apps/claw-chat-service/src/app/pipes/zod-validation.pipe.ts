import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Logger,
  PipeTransform,
} from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = (result.error as ZodError).issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      // The response carries these, but nothing ever wrote them down. A client
      // that shows only the top-level "Validation failed" — the coding agent
      // panel does — left every 400 undiagnosable without reproducing it by
      // hand. Field and rule only; never the rejected value, which is the part
      // that could carry a secret.
      this.logger.warn(
        `Validation failed: ${errors.map((error) => `${error.field || '<root>'}: ${error.message}`).join('; ')}`,
      );
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }
    return result.data;
  }
}
