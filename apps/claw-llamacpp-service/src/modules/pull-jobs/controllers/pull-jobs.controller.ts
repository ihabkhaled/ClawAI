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
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { Public } from '../../../app/decorators/public.decorator';
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

  @Delete('pull-jobs/:id')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string): Promise<PullJobCancelResult> {
    return this.pullJobsService.cancel(id);
  }

  @Post('pull-jobs/:id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  retry(@Param('id') id: string): Promise<PullJobCreateResult> {
    return this.pullJobsService.retry(id);
  }

  @Public()
  @SkipLogging()
  @SkipThrottle()
  @Sse('pull-jobs/:id/progress')
  progress(@Param('id') id: string): Observable<{ data: PullJobProgressEvent }> {
    return defer(() => {
      const subject = this.progressEmitter.subscribe(id);
      const last = this.progressEmitter.getLast(id);
      return subject.pipe(
        switchMap((event) => {
          if (last && event.data.jobId === id) {
            return [{ data: event.data }];
          }
          return [{ data: event.data }];
        }),
      );
    }).pipe(switchMap((value) => (value ? [value] : EMPTY)));
  }
}
