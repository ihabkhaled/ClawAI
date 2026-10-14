import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, type Observable, throwError } from 'rxjs';

import { translateUploadError } from '../utilities/translate-upload-error.utility';

/** Runs after the file interceptor: multer's bare 413 gets the stable `errorCode` the UI localizes. */
@Injectable()
export class UploadLimitInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(catchError((error: unknown) => throwError(() => translateUploadError(error))));
  }
}
