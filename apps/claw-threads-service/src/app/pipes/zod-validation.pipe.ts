import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';

import { zodIssueCode } from '../../common/utilities/zod-issue-code.utility';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => {
        const code = zodIssueCode(issue);
        return {
          field: issue.path.join('.') || '<root>',
          message: issue.message,
          ...(code ? { code } : {}),
        };
      });
      const code = errors.find((error) => 'code' in error)?.code;
      throw new BadRequestException({
        message: 'Validation failed',
        ...(code ? { code } : {}),
        errors,
      });
    }
    return result.data;
  }
}
