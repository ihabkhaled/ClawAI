import { type FinalizeCreditDto, type ReserveCreditDto } from '../dto/credit-internal.dto';
import { type CreditFinalizeInput, type CreditReserveInput } from '../types/credit.types';

/**
 * Flattens the validated wire DTOs into the shapes the manager works in.
 *
 * Lives here rather than in the controller because a controller is three lines
 * — extract, call, return — and rather than in the manager because the manager
 * must not know what the HTTP body looked like. It is also the one place the
 * optional `workflow` collapses to `null`, so `undefined` never reaches a
 * column that means "not recorded".
 */
export function toCreditReserveInput(dto: ReserveCreditDto): CreditReserveInput {
  return {
    userId: dto.userId,
    requestId: dto.requestId,
    provider: dto.provider,
    model: dto.model,
    surface: dto.surface,
    workflow: dto.workflow ?? null,
    promptTokens: dto.promptTokens,
    cachedPromptTokens: dto.cachedPromptTokens,
    requestedMaxOutputTokens: dto.requestedMaxOutputTokens,
  };
}

/**
 * Note the shape change: the wire nests token counts under `usage` because that
 * is how the provider reports them, while the manager takes them flat alongside
 * the call counts. The two are kept apart on the wire on purpose — tokens come
 * from the PROVIDER and call counts from the ORCHESTRATOR, and merging them
 * invites a caller to pass the provider response for both and bill zero tools.
 */
export function toCreditFinalizeInput(dto: FinalizeCreditDto): CreditFinalizeInput {
  return {
    reservationId: dto.reservationId,
    promptTokens: dto.usage.promptTokens,
    completionTokens: dto.usage.completionTokens,
    cachedPromptTokens: dto.usage.cachedPromptTokens,
    reasoningTokens: dto.usage.reasoningTokens,
    toolCalls: dto.toolCalls,
    searchCalls: dto.searchCalls,
  };
}
