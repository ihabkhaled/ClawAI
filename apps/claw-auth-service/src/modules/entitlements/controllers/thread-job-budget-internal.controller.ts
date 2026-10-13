import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ThreadJobBudgetService } from '../../credit/services/thread-job-budget.service';
import { ThreadJobBudgetCloseStatus } from '../../credit/enums/thread-job-budget-close-status.enum';
import {
  type ThreadCallReserveReply,
  type ThreadJobBudgetSummary,
} from '../types/thread-job-budget.types';
import { toThreadCallReserveReply } from '../utilities/thread-call-reserve-reply.utility';
import {
  threadJobBudgetCallSchema,
  threadJobBudgetCloseSchema,
  threadJobBudgetReleaseSchema,
  threadJobBudgetReserveSchema,
  threadJobBudgetSettleSchema,
  threadJobBudgetSummarySchema,
} from '../dto/thread-job-budget.dto';

@Controller('internal/threads/budgets')
@Public()
@UseGuards(ServiceTokenGuard)
export class ThreadJobBudgetInternalController {
  constructor(private readonly budgets: ThreadJobBudgetService) {}

  @Post('reserve')
  async reserve(
    @Body(new ZodValidationPipe(threadJobBudgetReserveSchema))
    body: {
      userId: string;
      requestId: string;
      capMicroUsd: number;
    },
  ): Promise<{
    id: string;
    userId: string;
    requestId: string;
    capMicroUsd: number;
    status: string;
  }> {
    const budget = await this.budgets.reserve({ ...body, capMicroUsd: BigInt(body.capMicroUsd) });
    return {
      id: budget.id,
      userId: budget.userId,
      requestId: budget.requestId,
      capMicroUsd: Number(budget.capMicroUsd),
      status: budget.status,
    };
  }

  @Post('calls/reserve')
  @HttpCode(HttpStatus.OK)
  async reserveCall(
    @Body(new ZodValidationPipe(threadJobBudgetCallSchema))
    body: {
      budgetId: string;
      requestId: string;
      creditReservationId: string | null;
      amountMicroUsd: number;
      detailed?: boolean;
    },
  ): Promise<boolean | ThreadCallReserveReply> {
    const result = await this.budgets.reserveCall({
      budgetId: body.budgetId,
      requestId: body.requestId,
      creditReservationId: body.creditReservationId,
      amountMicroUsd: BigInt(body.amountMicroUsd),
    });
    return toThreadCallReserveReply(result, body.detailed === true);
  }

  @Post('calls/finalize')
  @HttpCode(HttpStatus.OK)
  settleCall(
    @Body(new ZodValidationPipe(threadJobBudgetSettleSchema))
    body: {
      budgetId: string;
      requestId: string;
      settledMicroUsd: number;
    },
  ): Promise<boolean> {
    return this.budgets.settleCall(body.budgetId, body.requestId, BigInt(body.settledMicroUsd));
  }

  @Post('calls/release')
  @HttpCode(HttpStatus.OK)
  releaseCall(
    @Body(new ZodValidationPipe(threadJobBudgetReleaseSchema))
    body: {
      budgetId: string;
      requestId: string;
    },
  ): Promise<boolean> {
    return this.budgets.releaseCall(body.budgetId, body.requestId);
  }

  /**
   * What the job has really spent against its cap: the charge counted so far, not the
   * holds. Read-only; 404 for an unknown budget (the service decides).
   */
  @Post('summary')
  @HttpCode(HttpStatus.OK)
  summary(
    @Body(new ZodValidationPipe(threadJobBudgetSummarySchema))
    body: {
      budgetId: string;
    },
  ): Promise<ThreadJobBudgetSummary> {
    return this.budgets.summary(body.budgetId);
  }

  @Post('close')
  @HttpCode(HttpStatus.OK)
  close(
    @Body(new ZodValidationPipe(threadJobBudgetCloseSchema))
    body: {
      budgetId: string;
      status: ThreadJobBudgetCloseStatus;
    },
  ): Promise<boolean> {
    return this.budgets.close(body.budgetId, body.status);
  }
}
