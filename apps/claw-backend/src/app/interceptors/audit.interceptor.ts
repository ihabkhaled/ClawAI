import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Request } from "express";
import { AuthenticatedRequest } from "../../common/types";
import { AuditSeverity } from "../../common/enums";
import { AuditsService } from "../../modules/audits/services/audits.service";
import { MUTATING_METHODS } from "./constants/audit.constants";
import { methodToAction } from "./utilities/method-to-action.utility";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditsService: AuditsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const authenticatedRequest = request as AuthenticatedRequest;
    const userId = authenticatedRequest.user?.id;
    const action = methodToAction(method);
    const ipAddress =
      (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      request.socket.remoteAddress ??
      null;

    return next.handle().pipe(
      tap(() => {
        void this.auditsService.log({
          userId: userId ?? null,
          action,
          entityType: context.getClass().name,
          entityId: null,
          severity: AuditSeverity.LOW,
          details: { method, url: request.url },
          ipAddress: ipAddress ?? null,
        });
      }),
    );
  }
}
