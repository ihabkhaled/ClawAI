import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { ZodError, type ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of (result.error as ZodError).issues) {
        const field = issue.path.join('.') || '<root>';
        (errors[field] ??= []).push(issue.message);
      }
      throw new BadRequestException({ message: 'Validation failed', errors });
    }
    return result.data;
  }
}
