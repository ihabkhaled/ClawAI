import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Logger,
  PipeTransform,
} from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

import { VALIDATION_FAILED_CODE } from './zod-validation.constants';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

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
      // A schema may tag an issue with `params: { code }`; the first one wins
      // and becomes the body's stable `code`, so a client switches on it
      // instead of parsing prose.
      let code: string = VALIDATION_FAILED_CODE;
      let codeFound = false;
      for (const issue of (result.error as ZodError).issues) {
        const issueCode = 'params' in issue ? issue.params?.code : undefined;
        if (!codeFound && typeof issueCode === 'string') {
          code = issueCode;
          codeFound = true;
        }
        const field = issue.path.join('.') || '<root>';
        (errors[field] ??= []).push(issue.message);
      }
      // The response carries these, but nothing ever wrote them down. A client
      // that shows only the top-level "Validation failed" — the coding agent
      // panel does — left every 400 undiagnosable without reproducing it by
      // hand. Field and rule only; never the rejected value, which is the part
      // that could carry a secret.
      this.logger.warn(
        `Validation failed: ${Object.entries(errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ')}`,
      );
      throw new BadRequestException({
        message: 'Validation failed',
        code,
        errors,
      });
    }
    return result.data;
  }
}
