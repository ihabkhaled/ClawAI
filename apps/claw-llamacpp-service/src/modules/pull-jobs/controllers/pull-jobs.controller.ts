import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { defer, EMPTY, type Observable, switchMap } from 'rxjs';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { AllowServiceToken } from '../../../app/decorators/allow-service-token.decorator';
import { SkipLogging } from '../../../app/decorators/skip-logging.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type InitiatePullDto,
  InitiatePullSchema,
  type ListPullJobsQueryDto,
  ListPullJobsQuerySchema,
} from '../dto/initiate-pull.dto';
import { PullJobProgressEmitterManager } from '../managers/pull-job-progress-emitter.manager';
import { PullJobsService } from '../services/pull-jobs.service';
import {
  type PullJob,
  type PullJobCancelResult,
  type PullJobCreateResult,
  type PullJobProgressEvent,
} from '../types/pull-job.types';

@Controller()
export class PullJobsController {
  constructor(
    private readonly pullJobsService: PullJobsService,
    private readonly progressEmitter: PullJobProgressEmitterManager,
  ) {}

  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @Post('catalog/:id/pull')
  initiate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(InitiatePullSchema)) body: InitiatePullDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<PullJobCreateResult> {
    return this.pullJobsService.create({
      modelId: id,
      overrideHardwareGate: body.overrideHardwareGate,
      initiatedByUser: user?.id,
    });
  }

  @Get('pull-jobs')
  list(
    @Query(new ZodValidationPipe(ListPullJobsQuerySchema)) query: ListPullJobsQueryDto,
  ): Promise<{ rows: PullJob[]; total: number }> {
    return this.pullJobsService.list(query);
  }

  @Get('pull-jobs/:id')
  findOne(@Param('id') id: string): Promise<PullJob> {
    return this.pullJobsService.findById(id);
  }

  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @Delete('pull-jobs/:id')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string): Promise<PullJobCancelResult> {
    return this.pullJobsService.cancel(id);
  }

  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @Post('pull-jobs/:id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  retry(@Param('id') id: string): Promise<PullJobCreateResult> {
    return this.pullJobsService.retry(id);
  }

  // ADR-144: used to be public. The frontend reads it with connectSse (fetch +
  // Bearer header), so a user JWT works; the service token is allowed too.
  @AllowServiceToken()
  @SkipLogging()
  @SkipThrottle()
  @Sse('pull-jobs/:id/progress')
  progress(@Param('id') id: string): Observable<{ data: PullJobProgressEvent }> {
    return defer(() => {
      const subject = this.progressEmitter.subscribe(id);
      const last = this.progressEmitter.getLast(id);
      return subject.pipe(
        switchMap((event) => {
          return last && event.data.jobId === id ? [{ data: event.data }] : [{ data: event.data }];
        }),
      );
    }).pipe(switchMap((value) => (value ? [value] : EMPTY)));
  }
}
