import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ThreadJobBudgetService } from '../../credit/services/thread-job-budget.service';
import { ThreadJobBudgetCloseStatus } from '../../credit/enums/thread-job-budget-close-status.enum';
import {
  threadJobBudgetCallSchema,
  threadJobBudgetCloseSchema,
  threadJobBudgetReleaseSchema,
  threadJobBudgetReserveSchema,
  threadJobBudgetSettleSchema,
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
  ) {
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
  reserveCall(
    @Body(new ZodValidationPipe(threadJobBudgetCallSchema))
    body: {
      budgetId: string;
      requestId: string;
      creditReservationId: string | null;
      amountMicroUsd: number;
    },
  ) {
    return this.budgets.reserveCall({ ...body, amountMicroUsd: BigInt(body.amountMicroUsd) });
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
  ) {
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
  ) {
    return this.budgets.releaseCall(body.budgetId, body.requestId);
  }

  @Post('close')
  @HttpCode(HttpStatus.OK)
  close(
    @Body(new ZodValidationPipe(threadJobBudgetCloseSchema))
    body: {
      budgetId: string;
      status: ThreadJobBudgetCloseStatus;
    },
  ) {
    return this.budgets.close(body.budgetId, body.status);
  }
}
