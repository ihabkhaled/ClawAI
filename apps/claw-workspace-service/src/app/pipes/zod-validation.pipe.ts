import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      // Grouped by field so a client sees every rule a field broke, not just
      // the first, and so this matches ApiClientError.errors's
      // Record<string, string[]> shape. It used to be a flat array of
      // { field, message } the frontend never read, which is why a
      // validation failure anywhere on the platform showed only the generic
      // "Validation failed" with no detail (2026-09-24).
      const errors: Record<string, string[]> = {};
      for (const issue of (result.error as ZodError).issues) {
        const field = issue.path.join('.') || '<root>';
        (errors[field] ??= []).push(issue.message);
      }
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }
    return result.data;
  }
}
